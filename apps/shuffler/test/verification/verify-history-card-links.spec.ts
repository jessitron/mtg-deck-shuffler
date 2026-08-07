/**
 * End-to-End Verification: Card Name Links in Action History
 *
 * Card names in the Action History modal should be clickable links that
 * open the card modal for that card.
 *
 * RUN: npm run test:verify
 *
 * The test script automatically starts and stops the server on port 3001.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

test.setTimeout(90000);

function extractGameId(url: string): string | null {
  const match = url.match(/\/game\/(\d+)/);
  return match ? match[1] : null;
}

async function setupGame(page: any): Promise<string> {
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

  const gameId = extractGameId(page.url());
  if (!gameId) throw new Error('Failed to create game');

  return gameId;
}

test.describe('Card Name Links in Action History', () => {

  test('move-card events show card names as links that open the card modal', async ({ page }) => {
    const gameId = await setupGame(page);
    console.log(`Game ID: ${gameId}`);

    // Draw a card to produce a "move card" event with a card name in the history.
    const drawButton = page.locator('button.draw-button');
    await expect(drawButton).toBeVisible({ timeout: 5000 });
    await drawButton.click();
    await page.waitForTimeout(500);

    // Open the action history modal.
    await page.goto(`${BASE_URL}/game/${gameId}?openHistory=true`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const historyModal = page.locator('#modal-container .modal-overlay');
    await expect(historyModal).toBeVisible({ timeout: 5000 });

    // There should be a clickable card-name link inside the history list.
    const cardNameLink = page.locator('.history-list .card-name-link').first();
    await expect(cardNameLink).toBeVisible({ timeout: 5000 });

    // Clicking it opens the card modal. Retry the click: at Playwright speed it
    // can straddle htmx's modal swap/settle and be swallowed, which made this
    // spec flaky in a full-suite run (same retry pattern as verify-discard).
    const cardModal = page.locator('.card-modal-overlay');
    await expect(async () => {
      if (await cardModal.isVisible()) return;
      await cardNameLink.click({ timeout: 2000 });
      await expect(cardModal).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 20000 });

    console.log('SUCCESS: Action History card names are links that open the card modal');
  });
});
