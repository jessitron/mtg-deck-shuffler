
import { test, expect } from '@playwright/test';
import { seedGame } from './seedGame.js';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

test.setTimeout(90000);

async function setupGame(page: any): Promise<void> {
  const gameId = await seedGame(page);
  await page.goto(`${BASE_URL}/game/${gameId}`);
}

test.describe('Discard from hand', () => {
  test('discarding puts the card on the table and history says Discard', async ({ page }) => {
    await setupGame(page);
    await expect(page.locator('.hand-count')).toHaveText('7');

    const handCount = page.locator('.hand-count');
    await expect(async () => {
      if ((await handCount.textContent()) === '6') {
        return; // the discard landed
      }
      const discardButton = page.locator('.card-modal-overlay button:has-text("Discard")');
      if ((await discardButton.count()) === 0) {
        await page.locator('#hand-cards .card-container img').first().click();
        await expect(discardButton).toBeVisible({ timeout: 3000 });
      }
      await discardButton.click({ timeout: 2000 });
      await expect(handCount).toHaveText('6', { timeout: 3000 });
    }).toPass({ timeout: 30000 });
    await expect(page.locator('.table-cards-button')).toContainText('1 Cards on table');

    // History records the verb
    await page.locator('#menu-toggle').click();
    await page.locator('button.history-button').click();
    await expect(page.locator('.modal-overlay .history-list')).toContainText('Discard:');
    await expect(page.locator('.modal-overlay .history-list')).not.toContainText('Play:');
  });
});

test.describe('Mill from library', () => {
  test('milling puts the top library card on the table and history says Discard', async ({ page }) => {
    await setupGame(page);

    await page.locator('#mill-button').click();
    await expect(page.locator('.table-cards-button')).toContainText('1 Cards on table', { timeout: 3000 });

    // History records the discard verb, same as a hand discard
    await page.locator('#menu-toggle').click();
    await page.locator('button.history-button').click();
    await expect(page.locator('.modal-overlay .history-list')).toContainText('Discard:');
    await expect(page.locator('.modal-overlay .history-list')).not.toContainText('Play:');
  });
});
