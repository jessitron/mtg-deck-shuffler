/**
 * End-to-End Verification: Discard (JES-127, B4)
 *
 * The hand card modal offers Discard — identical to Play except the verb: the
 * card leaves the hand for the table (graveyard is table geography, not
 * Shuffler state), and Action History says "Discard" rather than "Play".
 *
 * RUN: npm run test:verify
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
  await page.locator('button.begin-button').click();
  await page.waitForURL('**/game/*', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Discard from hand', () => {
  test('discarding puts the card on the table and history says Discard', async ({ page }) => {
    await setupGame(page);
    await expect(page.locator('.hand-count')).toHaveText('7');

    // Open the first hand card's modal and discard it. Clicking at Playwright
    // speed can straddle htmx's swap/settle of the freshly-opened modal (the
    // mousedown lands on a node that is replaced before mouseup, so no click
    // event fires — impossible at human speed). Retry until the discard lands.
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
