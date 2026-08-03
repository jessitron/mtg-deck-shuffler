/**
 * End-to-End Verification: Table mode (JES-127, Part B1)
 *
 * The prepare screen offers optional "table name" and "player name" inputs.
 * Leaving them blank keeps today's solo behavior. Filling them in joins the
 * game to a table on the Tabletop: the game page shows "at table <name>"
 * linking to the table page in a new tab (that link is also the
 * spectator-share mechanism).
 *
 * RUN: npm run test:verify
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

test.setTimeout(90000);

async function goToPrepare(page: any): Promise<void> {
  await page.goto(`${BASE_URL}/choose-any-deck`);
  await page.waitForLoadState('networkidle');
  const preconTiles = page.locator('.precon-tile');
  await expect(preconTiles.first()).toBeVisible({ timeout: 10000 });
  await preconTiles.first().click();
  await page.waitForURL('**/prepare/*', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Table mode', () => {
  test('prep screen has optional table and player name inputs; solo (blank) games show no table link', async ({ page }) => {
    await goToPrepare(page);

    await expect(page.locator('input[name="table-name"]')).toBeVisible();
    await expect(page.locator('input[name="player-name"]')).toBeVisible();

    // Leave both blank: solo mode, unchanged
    await page.locator('button.begin-button').click();
    await page.waitForURL('**/game/*', { timeout: 30000 });
    await expect(page.locator('.go-to-table-button')).toHaveCount(0);
  });

  test('joining a table shows a "Go to Table" spectator link on the game page, surviving restart', async ({ page }) => {
    await goToPrepare(page);

    await page.locator('input[name="table-name"]').fill('verify-table');
    await page.locator('input[name="player-name"]').fill('Playwright Jess');
    await page.locator('button.begin-button').click();
    await page.waitForURL('**/game/*', { timeout: 30000 });

    const link = page.locator('.go-to-table-button');
    await expect(link).toBeVisible();
    await expect(link).toContainText('verify-table');
    await expect(link).toHaveAttribute('target', '_blank');
    const href = await link.getAttribute('href');
    expect(href).toContain('/t/verify-table');

    // Restart carries the table info forward
    await page.locator('#menu-toggle').click();
    await page.locator('button:has-text("Restart Game")').click();
    await page.waitForURL('**/game/*', { timeout: 30000 });
    await expect(page.locator('.go-to-table-button')).toContainText('verify-table');
  });

  test('send-then-commit: when the tabletop is unreachable, the play is blocked and the card stays in hand', async ({ page }) => {
    // This test relies on no tabletop running at TABLETOP_URL (verify.sh does
    // not start one for this suite; the two-app spec manages its own).
    await goToPrepare(page);
    await page.locator('input[name="table-name"]').fill('unreachable-table');
    await page.locator('input[name="player-name"]').fill('Blocked Jess');
    await page.locator('button.begin-button').click();
    await page.waitForURL('**/game/*', { timeout: 30000 });

    await expect(page.locator('.hand-count')).toHaveText('7');

    // Open the first hand card's modal and try to play it
    await page.locator('#hand-cards .card-container img').first().click();
    const playButton = page.locator('.card-modal-overlay button:has-text("Play")');
    await expect(playButton).toBeVisible({ timeout: 5000 });
    await expect(playButton).toHaveClass(/table-play-button/);
    await playButton.click();

    // The play is blocked: an explanatory modal appears, the hand is unchanged
    await expect(page.locator('.modal-overlay')).toContainText("didn't get the card", { timeout: 10000 });
    await expect(page.locator('.modal-overlay')).toContainText('unreachable-table');
    await page.locator('.modal-overlay .modal-close').click();
    await expect(page.locator('.hand-count')).toHaveText('7');
    await expect(page.locator('.table-cards-button')).toContainText('0 Cards on table');
  });
});
