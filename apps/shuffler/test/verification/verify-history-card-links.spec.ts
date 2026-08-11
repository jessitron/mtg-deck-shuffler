
import { test, expect } from '@playwright/test';
import { seedGame } from './seedGame.js';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

test.setTimeout(90000);

async function setupGame(page: any): Promise<string> {
  return seedGame(page);
}

test.describe('Card Name Links in Action History', () => {

  test('move-card events show card names as links that open the card modal', async ({ page }) => {
    const gameId = await setupGame(page);
    console.log(`Game ID: ${gameId}`);
    await page.goto(`${BASE_URL}/game/${gameId}`);

    // Draw a card to produce a "move card" event with a card name in the history.
    const drawButton = page.locator('button.draw-button');
    await expect(drawButton).toBeVisible({ timeout: 5000 });
    await drawButton.click();

    // Open the action history modal.
    await page.goto(`${BASE_URL}/game/${gameId}?openHistory=true`);

    const historyModal = page.locator('#modal-container .modal-overlay');
    await expect(historyModal).toBeVisible({ timeout: 5000 });

    // There should be a clickable card-name link inside the history list.
    const cardNameLink = page.locator('.history-list .card-name-link').first();
    await expect(cardNameLink).toBeVisible({ timeout: 5000 });

    const cardModal = page.locator('.card-modal-overlay');
    await expect(async () => {
      if (await cardModal.isVisible()) return;
      await cardNameLink.click({ timeout: 2000 });
      await expect(cardModal).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 20000 });

    console.log('SUCCESS: Action History card names are links that open the card modal');
  });
});
