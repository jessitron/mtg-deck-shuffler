
import { test, expect } from '@playwright/test';
import { seedGame } from './seedGame.js';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

test.setTimeout(90000);

async function setupGame(page: any): Promise<void> {
  const gameId = await seedGame(page);
  await page.goto(`${BASE_URL}/game/${gameId}`);
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
    await expect(mulligan).toHaveCount(0);
    await expect(page.locator('.hand-count')).toHaveText('8');

    await expect(async () => {
      if ((await page.locator('.hand-count').textContent()) === '7') return;
      await page.keyboard.press('ControlOrMeta+z');
      await expect(page.locator('.hand-count')).toHaveText('7', { timeout: 3000 });
    }).toPass({ timeout: 20000 });

    await expect(mulligan).toBeVisible();
    await expect(mulligan).toHaveText(/^Mulligan$/);

    console.log('SUCCESS: undo restores the hand-acceptance stage from history');
  });

  test('a mulligan itself can be undone', async ({ page }) => {
    await setupGame(page);

    const mulligan = page.locator('button.mulligan-button');
    await mulligan.click();
    await expect(mulligan).toHaveText('Mulligan #2');

    await expect(async () => {
      if (/^Mulligan$/.test((await mulligan.textContent()) ?? '')) return;
      await page.keyboard.press('ControlOrMeta+z');
      await expect(mulligan).toHaveText(/^Mulligan$/, { timeout: 3000 });
    }).toPass({ timeout: 20000 });

    // Back to the first mulligan offer, still seven cards, still deciding.
    await expect(page.locator('.hand-count')).toHaveText('7');
    await expect(mulligan).toBeVisible();

    console.log('SUCCESS: a mulligan can be undone, returning to the first mulligan offer');
  });
});
