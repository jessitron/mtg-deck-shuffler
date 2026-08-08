/**
 * End-to-End Verification: Library and Command Zone positions are swapped.
 *
 * Jess wanted the library on the right and the command zone on the left, on
 * both the prepare screen (/prepare) and the game screen (/game). Regression
 * guard: assert the actual rendered left edges, not the DOM/markup order,
 * since /game is a flex row (order = DOM order) and /prepare is a CSS grid
 * (order = grid-column), and either could silently regress independently.
 *
 * RUN: npm run test:verify
 */

import { test, expect, Page } from '@playwright/test';
import { seedPrep, startGame } from './seedGame.js';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

test.setTimeout(90000);

async function setupGame(page: Page): Promise<{ prepUrl: string; gameUrl: string }> {
  const prepId = await seedPrep(page);
  const gameId = await startGame(page, prepId);
  return { prepUrl: `${BASE_URL}/prepare/${prepId}`, gameUrl: `${BASE_URL}/game/${gameId}` };
}

async function expectLibraryRightOfCommandZone(page: Page) {
  const library = page.locator('#library-section');
  const commandZone = page.locator('#command-zone, .cool-command-zone-surround, .commander-placeholder').first();

  await expect(library).toBeVisible({ timeout: 10000 });
  await expect(commandZone).toBeVisible({ timeout: 10000 });

  const libraryBox = await library.boundingBox();
  const commandZoneBox = await commandZone.boundingBox();

  expect(libraryBox).not.toBeNull();
  expect(commandZoneBox).not.toBeNull();

  // Library's left edge must be to the right of the command zone's left edge.
  expect(libraryBox!.x).toBeGreaterThan(commandZoneBox!.x);
}

test.describe('Library and command zone positions are swapped', () => {
  test('on /prepare, library is right of command zone', async ({ page }) => {
    const { prepUrl } = await setupGame(page);
    await page.goto(prepUrl);
    await expectLibraryRightOfCommandZone(page);
  });

  test('on /game, library is right of command zone', async ({ page }) => {
    const { gameUrl } = await setupGame(page);
    await page.goto(gameUrl);
    await expectLibraryRightOfCommandZone(page);
  });
});
