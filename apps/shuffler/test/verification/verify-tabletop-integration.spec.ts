/**
 * End-to-End Verification: the two-app flow (JES-127, B3/B4)
 *
 * Shuffler + Tabletop, both real. A game joins a table on the prep screen;
 * Play sends the card to the tabletop FIRST (send-then-commit) and the card
 * appears on the table's canvas; Discard does the same with zoneHint
 * "graveyard".
 *
 * This spec starts its own tabletop server at TABLETOP_URL (verify.sh gives
 * each run its own random port; 5180 otherwise) from apps/tabletop/dist. If the
 * tabletop isn't built yet, the spec is skipped with a note — build it with
 * `cd apps/tabletop && npm run build`.
 *
 * RUN: npm run test:verify
 */

import { test, expect, Page } from '@playwright/test';
import { spawn, ChildProcess } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { seedPrep, startGame } from './seedGame.js';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';
// verify.sh gives each run its own tabletop port and exports TABLETOP_URL to
// both the Shuffler server and this process, so we spawn the tabletop exactly
// where the Shuffler will look for it.
const TABLETOP_URL = process.env.TABLETOP_URL ?? 'http://localhost:5180';
const TABLETOP_PORT = new URL(TABLETOP_URL).port || '5180';
const TABLETOP_DIR = path.resolve(process.cwd(), '..', 'tabletop');
const TABLETOP_SERVER = path.join(TABLETOP_DIR, 'dist', 'server', 'server.js');

test.setTimeout(120000);

const tabletopBuilt = fs.existsSync(TABLETOP_SERVER);

let tabletop: ChildProcess | undefined;

test.beforeAll(async () => {
  if (!tabletopBuilt) return;
  tabletop = spawn('node', [TABLETOP_SERVER], {
    cwd: TABLETOP_DIR,
    env: { ...process.env, PORT: TABLETOP_PORT },
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
});

/** A non-default mat picked on /prepare — seat.joined must carry it (ticket 16). */
const PICKED_MAT = '/images/playmats/aeoe-6-seam-rip.png';

async function startGameAtTable(page: Page, tableName: string): Promise<void> {
  const prepId = await seedPrep(page);
  await page.request.post(`${BASE_URL}/prep-table-look/${prepId}`, { form: { 'playmat-path': PICKED_MAT } });
  const gameId = await startGame(page, prepId, { tableName, playerName: 'E2E Jess' });
  await page.goto(`${BASE_URL}/game/${gameId}`);
}

/**
 * Click an action button in the first hand card's modal until the hand count
 * drops to `expectedHandCount`. (Retry pattern: a Playwright-speed click can
 * straddle htmx's modal swap/settle and be swallowed — see verify-discard.)
 */
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

test.describe('Two-app flow: Shuffler plays to the Tabletop', () => {
  test.skip(!tabletopBuilt, 'apps/tabletop is not built — run `cd apps/tabletop && npm run build` for the two-app flow');

  test('a played card and a discarded card arrive on the table canvas', async ({ page, context }) => {
    const tableName = `e2e-table-${Date.now()}`;
    await startGameAtTable(page, tableName);

    // A spectator watches the table via the "at table" link's URL
    const spectator = await context.newPage();
    await spectator.goto(`${TABLETOP_URL}/t/${tableName}`);
    await expect(spectator.locator('.tl-canvas')).toBeVisible({ timeout: 15000 });

    // The playmat picked on /prepare (ticket 16) dresses this seat's player
    // area — the mat image asset carries the picked URL, not the default.
    await expect(
      spectator.locator('[style*="aeoe-6-seam-rip"], img[src*="aeoe-6-seam-rip"]').first()
    ).toBeVisible({ timeout: 15000 });

    // Play the first hand card: send-then-commit succeeds against the real tabletop
    await actOnFirstHandCard(page, 'Play', '6');
    await expect(page.locator('.table-cards-button')).toContainText('1 Cards on table');

    // The card arrives on the canvas over the websocket sync. Match on the shape
    // id, not just the type: the seat's furniture (playmat, library) are image
    // shapes too, and only cards get the `shape:card-<instanceId>` id.
    await expect(cardShapes(spectator)).toHaveCount(1, { timeout: 15000 });

    // Discard the next card: zoneHint graveyard, also lands on the canvas
    await actOnFirstHandCard(page, 'Discard', '5');
    await expect(page.locator('.table-cards-button')).toContainText('2 Cards on table');
    await expect(cardShapes(spectator)).toHaveCount(2, { timeout: 15000 });

    // And history tells the two verbs apart
    await page.locator('#menu-toggle').click();
    await page.locator('button.history-button').click();
    await expect(page.locator('.modal-overlay .history-list')).toContainText('Play:');
    await expect(page.locator('.modal-overlay .history-list')).toContainText('Discard:');
  });
});
