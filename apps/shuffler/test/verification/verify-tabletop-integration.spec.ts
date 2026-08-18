
import { test, expect, Page } from '@playwright/test';
import { spawn, ChildProcess } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { randomUUID } from 'node:crypto';
import { seedPrep, startGame } from './seedGame.js';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';
const TABLETOP_URL = process.env.TABLETOP_URL ?? 'http://localhost:5180';
const TABLETOP_PORT = new URL(TABLETOP_URL).port || '5180';
const TABLETOP_DIR = path.resolve(process.cwd(), '..', 'tabletop');
const TABLETOP_SERVER = path.join(TABLETOP_DIR, 'dist', 'server', 'server.js');

const SPINE_URL = process.env.SPINE_URL ?? 'http://localhost:4600';
const SPINE_PORT = new URL(SPINE_URL).port || '4600';
const SPINE_DIR = path.resolve(process.cwd(), '..', '..', 'services', 'spine');
const SPINE_DB_PATH = path.join(os.tmpdir(), `mtg-verify-spine-${randomUUID()}.db`);

test.setTimeout(120000);

const tabletopBuilt = fs.existsSync(TABLETOP_SERVER);

let tabletop: ChildProcess | undefined;
let spine: ChildProcess | undefined;

test.beforeAll(async () => {
  if (!tabletopBuilt) return;

  // The real Spine first — the Tabletop's seat.joined-triggered SSE subscription
  // (ticket 01) needs a live Spine to subscribe to, and card.played now only
  // reaches the Tabletop by traveling through it (this ticket's whole point:
  // Shuffler → Spine → SSE → Tabletop, zero direct Shuffler→Tabletop HTTP left
  // in the code — see the deleted HttpTabletopGateway/TabletopPort).
  spine = spawn('bundle', ['exec', 'puma', '-p', SPINE_PORT], {
    cwd: SPINE_DIR,
    env: { ...process.env, SPINE_DB_PATH, TABLETOP_URL, RACK_ENV: 'development' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${SPINE_URL}/up`);
      if (res.ok) break;
    } catch {
      // not up yet
    }
    if (i === 39) throw new Error(`Spine did not become healthy at ${SPINE_URL}`);
    await new Promise((r) => setTimeout(r, 500));
  }

  tabletop = spawn('node', [TABLETOP_SERVER], {
    cwd: TABLETOP_DIR,
    env: { ...process.env, PORT: TABLETOP_PORT, SPINE_URL },
    stdio: 'ignore',
  });
  // Wait for the tabletop to answer /health
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${TABLETOP_URL}/health`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Tabletop server did not become healthy at ${TABLETOP_URL}`);
});

test.afterAll(() => {
  tabletop?.kill();
  spine?.kill();
  fs.rmSync(SPINE_DB_PATH, { force: true });
});

/** A non-default mat picked on /prepare — seat.joined must carry it (ticket 16). */
const PICKED_MAT = '/images/playmats/aeoe-6-seam-rip.png';

/**
 * Starts a game at a table and returns the real Tabletop room slug — the Spine
 * mints `<name-slug>-<8-hex>` at join time (real Spine, ticket 02), which is NOT
 * the bare tableName the caller picked. A spectator must navigate to this slug,
 * not the bare name, or it watches an empty room while events land elsewhere.
 */
async function startGameAtTable(page: Page, tableName: string): Promise<string> {
  const prepId = await seedPrep(page);
  await page.request.post(`${BASE_URL}/prep-table-look/${prepId}`, { form: { 'playmat-path': PICKED_MAT } });
  const gameId = await startGame(page, prepId, { tableName, playerName: 'E2E Jess' });
  await page.goto(`${BASE_URL}/game/${gameId}`);

  const href = await page.locator('.go-to-table-button').getAttribute('href');
  const match = href?.match(/\/t\/([^/?#]+)/);
  if (!match) throw new Error(`could not find the Spine-minted table slug in "Go to Table" href: ${href}`);
  return match[1];
}

async function actOnFirstHandCard(page: Page, buttonText: string, expectedHandCount: string): Promise<void> {
  const handCount = page.locator('.hand-count');
  await expect(async () => {
    if ((await handCount.textContent()) === expectedHandCount) return;
    const button = page.locator(`.card-modal-overlay button:has-text("${buttonText}")`);
    if ((await button.count()) === 0) {
      await page.locator('#hand-cards .card-container img').first().click();
      await expect(button).toBeVisible({ timeout: 3000 });
    }
    await button.click({ timeout: 2000 });
    await expect(handCount).toHaveText(expectedHandCount, { timeout: 3000 });
  }).toPass({ timeout: 30000 });
}

/** Card shapes on the canvas — `shape:card-<instanceId>`, per cardArrival.ts. */
function cardShapes(page: Page) {
  return page.locator('.tl-shape[data-shape-id^="shape:card-"]');
}

test.describe('Three-ship flow: Shuffler plays to the Tabletop via the Spine', () => {
  test.skip(!tabletopBuilt, 'apps/tabletop is not built — run `cd apps/tabletop && npm run build` for this flow');

  test('a played card and a discarded card arrive on the table canvas — Shuffler → Spine → SSE → Tabletop, with no direct Shuffler→Tabletop HTTP call left in the code', async ({ page, context }) => {
    const tableName = `e2e-table-${Date.now()}`;
    const tableSlug = await startGameAtTable(page, tableName);

    // A spectator watches the table via the "at table" link's URL
    const spectator = await context.newPage();
    await spectator.goto(`${TABLETOP_URL}/t/${tableSlug}`);
    await expect(spectator.locator('.tl-canvas')).toBeVisible({ timeout: 15000 });

    await expect(
      spectator.locator('[style*="aeoe-6-seam-rip"], img[src*="aeoe-6-seam-rip"]').first()
    ).toBeVisible({ timeout: 15000 });

    // The real Spine's seat.joined carries this deck's commander (a card shape too,
    // `shape:card-<instanceId>` — same prefix as a played card): DEFAULT_PRECON_DECK
    // has exactly one, so wait for that baseline before counting played/discarded cards.
    await expect(cardShapes(spectator)).toHaveCount(1, { timeout: 15000 });
    const baselineShapes = 1;

    // Play the first hand card: the Shuffler mutates immediately (best-effort Spine
    // send, never blocking) and the card reaches this canvas only by traveling
    // through the real Spine's SSE stream — there is no HttpTabletopGateway left
    // to short-circuit that path, so this assertion is the whole point of ticket 02.
    await actOnFirstHandCard(page, 'Play', '6');
    await expect(page.locator('.table-cards-button')).toContainText('1 Cards on table');

    await expect(cardShapes(spectator)).toHaveCount(baselineShapes + 1, { timeout: 15000 });

    // Discard the next card: zoneHint graveyard, also lands on the canvas
    await actOnFirstHandCard(page, 'Discard', '5');
    await expect(page.locator('.table-cards-button')).toContainText('2 Cards on table');
    await expect(cardShapes(spectator)).toHaveCount(baselineShapes + 2, { timeout: 15000 });

    // And history tells the two verbs apart
    await page.locator('#menu-toggle').click();
    await page.locator('button.history-button').click();
    await expect(page.locator('.modal-overlay .history-list')).toContainText('Play:');
    await expect(page.locator('.modal-overlay .history-list')).toContainText('Discard:');
  });
});
