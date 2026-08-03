/**
 * End-to-End Verification: Opening hand & Mulligan
 *
 * When a game starts, the player is automatically dealt an opening hand of
 * seven cards and offered a "Mulligan" button above the hand. Mulligan puts
 * the hand back into the library, shuffles, and redraws seven; the button
 * label increments ("Mulligan #2", "#3", ...).
 *
 * The mulligan offer is part of game state — it represents the "hand
 * acceptance" stage before play begins. It disappears after any action other
 * than rearranging the hand (draw, play, reveal, ...).
 *
 * RUN: npm run test:verify
 *
 * The test script automatically starts and stops the server on port 3001.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

test.setTimeout(90000);

async function setupGame(page: any): Promise<void> {
  await page.goto(`${BASE_URL}/choose-any-deck`);
  await page.waitForLoadState('networkidle');

  const preconTiles = page.locator('.precon-tile');
  await expect(preconTiles.first()).toBeVisible({ timeout: 10000 });
  await preconTiles.first().click();

  await page.waitForURL('**/prepare/*', { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  const shuffleUpButton = page.locator('button.begin-button, button.start-game-button, button:has-text("Shuffle Up")');
  await expect(shuffleUpButton).toBeVisible();
  await shuffleUpButton.click();

  await page.waitForURL('**/game/*', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Opening hand & Mulligan', () => {

  test('starting a game deals an opening hand of seven cards', async ({ page }) => {
    await setupGame(page);

    await expect(page.locator('.hand-count')).toHaveText('7', { timeout: 5000 });

    console.log('SUCCESS: seven cards were dealt automatically');
  });

  test('a Mulligan button sits above the hand at game start', async ({ page }) => {
    await setupGame(page);

    const mulligan = page.locator('button.mulligan-button');
    await expect(mulligan).toBeVisible({ timeout: 5000 });
    await expect(mulligan).toHaveText(/^Mulligan$/);

    console.log('SUCCESS: Mulligan button is offered at game start');
  });

  test('mulligan reshuffles, redraws seven, and increments the label', async ({ page }) => {
    await setupGame(page);

    const handCount = page.locator('.hand-count');
    await expect(handCount).toHaveText('7');

    const mulligan = page.locator('button.mulligan-button');
    await mulligan.click();
    await page.waitForTimeout(1800); // let the shuffle animation settle

    // Still seven cards in hand after the mulligan.
    await expect(handCount).toHaveText('7');
    // The button now offers the next mulligan.
    await expect(mulligan).toHaveText('Mulligan #2');

    console.log('SUCCESS: mulligan redrew seven and the label advanced to #2');
  });

  test('the Mulligan button disappears after a non-rearrange action (draw)', async ({ page }) => {
    await setupGame(page);

    const mulligan = page.locator('button.mulligan-button');
    await expect(mulligan).toBeVisible();

    await page.locator('button.draw-button').click();
    await page.waitForTimeout(800);

    await expect(page.locator('.hand-count')).toHaveText('8');
    await expect(mulligan).toHaveCount(0);

    console.log('SUCCESS: drawing ends the hand-acceptance stage and removes the Mulligan button');
  });

  test('undoing the draw brings the Mulligan button back (derived from history)', async ({ page }) => {
    await setupGame(page);

    const mulligan = page.locator('button.mulligan-button');
    await expect(mulligan).toBeVisible();

    // Draw — stage ends, button disappears.
    await page.locator('button.draw-button').click();
    await page.waitForTimeout(800);
    await expect(mulligan).toHaveCount(0);
    await expect(page.locator('.hand-count')).toHaveText('8');

    // Undo via the standard hotkey — the stage is derived from the event log,
    // so undoing the draw restores it and the button reappears.
    await page.keyboard.press('ControlOrMeta+z');
    await page.waitForTimeout(800);

    await expect(page.locator('.hand-count')).toHaveText('7');
    await expect(mulligan).toBeVisible();
    await expect(mulligan).toHaveText(/^Mulligan$/);

    console.log('SUCCESS: undo restores the hand-acceptance stage from history');
  });

  test('a mulligan itself can be undone', async ({ page }) => {
    await setupGame(page);

    const mulligan = page.locator('button.mulligan-button');
    await mulligan.click();
    await page.waitForTimeout(1800); // shuffle animation
    await expect(mulligan).toHaveText('Mulligan #2');

    // Undo the mulligan via the standard hotkey — it's one atomic event.
    await page.keyboard.press('ControlOrMeta+z');
    await page.waitForTimeout(1000);

    // Back to the first mulligan offer, still seven cards, still deciding.
    await expect(page.locator('.hand-count')).toHaveText('7');
    await expect(mulligan).toBeVisible();
    await expect(mulligan).toHaveText(/^Mulligan$/);

    console.log('SUCCESS: a mulligan can be undone, returning to the first mulligan offer');
  });
});
