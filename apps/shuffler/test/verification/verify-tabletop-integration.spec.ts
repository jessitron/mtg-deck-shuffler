/**
 * End-to-End Verification: the two-app flow (JES-127, B3/B4)
 *
 * Shuffler + Tabletop, both real. A game joins a table on the prep screen;
 * Play sends the card to the tabletop FIRST (send-then-commit) and the card
 * appears on the table's canvas; Discard does the same with zoneHint
 * "graveyard".
 *
 * This spec starts its own tabletop server on port 5180 (the Shuffler's
 * default TABLETOP_URL) from apps/tabletop/dist. If the tabletop isn't built
 * yet, the spec is skipped with a note — build it with
 * `cd apps/tabletop && npm run build`.
 *
 * RUN: npm run test:verify
 */

import { test, expect, Page } from '@playwright/test';
import { spawn, ChildProcess } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';
const TABLETOP_URL = 'http://localhost:5180';
const TABLETOP_DIR = path.resolve(process.cwd(), '..', 'tabletop');
const TABLETOP_SERVER = path.join(TABLETOP_DIR, 'dist', 'server', 'server.js');

test.setTimeout(120000);

const tabletopBuilt = fs.existsSync(TABLETOP_SERVER);

let tabletop: ChildProcess | undefined;

test.beforeAll(async () => {
  if (!tabletopBuilt) return;
  tabletop = spawn('node', [TABLETOP_SERVER], {
    cwd: TABLETOP_DIR,
    env: { ...process.env, PORT: '5180' },
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
  throw new Error('Tabletop server did not become healthy on port 5180');
});

test.afterAll(() => {
  tabletop?.kill();
});

async function startGameAtTable(page: Page, tableName: string): Promise<void> {
  await page.goto(`${BASE_URL}/choose-any-deck`);
  await page.waitForLoadState('networkidle');
  const preconTiles = page.locator('.precon-tile');
  await expect(preconTiles.first()).toBeVisible({ timeout: 10000 });
  await preconTiles.first().click();
  await page.waitForURL('**/prepare/*', { timeout: 30000 });

  await page.locator('input[name="table-name"]').fill(tableName);
  await page.locator('input[name="player-name"]').fill('E2E Jess');
  await page.locator('button.begin-button').click();
  await page.waitForURL('**/game/*', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
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

test.describe('Two-app flow: Shuffler plays to the Tabletop', () => {
  test.skip(!tabletopBuilt, 'apps/tabletop is not built — run `cd apps/tabletop && npm run build` for the two-app flow');

  test('a played card and a discarded card arrive on the table canvas', async ({ page, context }) => {
    const tableName = `e2e-table-${Date.now()}`;
    await startGameAtTable(page, tableName);

    // A spectator watches the table via the "at table" link's URL
    const spectator = await context.newPage();
    await spectator.goto(`${TABLETOP_URL}/t/${tableName}`);
    await expect(spectator.locator('.tl-canvas')).toBeVisible({ timeout: 15000 });

    // Play the first hand card: send-then-commit succeeds against the real tabletop
    await actOnFirstHandCard(page, 'Play', '6');
    await expect(page.locator('.table-cards-button')).toContainText('1 Cards on table');

    // The card arrives on the canvas over the websocket sync
    await expect(spectator.locator('.tl-shape[data-shape-type="image"]')).toHaveCount(1, { timeout: 15000 });

    // Discard the next card: zoneHint graveyard, also lands on the canvas
    await actOnFirstHandCard(page, 'Discard', '5');
    await expect(page.locator('.table-cards-button')).toContainText('2 Cards on table');
    await expect(spectator.locator('.tl-shape[data-shape-type="image"]')).toHaveCount(2, { timeout: 15000 });

    // And history tells the two verbs apart
    await page.locator('#menu-toggle').click();
    await page.locator('button.history-button').click();
    await expect(page.locator('.modal-overlay .history-list')).toContainText('Play:');
    await expect(page.locator('.modal-overlay .history-list')).toContainText('Discard:');
  });
});
