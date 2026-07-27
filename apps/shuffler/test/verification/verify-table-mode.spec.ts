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

const BASE_URL = 'http://localhost:3001';

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
    await expect(page.locator('.at-table-link')).toHaveCount(0);
  });

  test('joining a table shows "at table" spectator link on the game page, surviving restart', async ({ page }) => {
    await goToPrepare(page);

    await page.locator('input[name="table-name"]').fill('verify-table');
    await page.locator('input[name="player-name"]').fill('Playwright Jess');
    await page.locator('button.begin-button').click();
    await page.waitForURL('**/game/*', { timeout: 30000 });

    const link = page.locator('.at-table-link');
    await expect(link).toBeVisible();
    await expect(link).toContainText('verify-table');
    await expect(link).toHaveAttribute('target', '_blank');
    const href = await link.getAttribute('href');
    expect(href).toContain('/t/verify-table');

    // Restart carries the table info forward
    await page.locator('#menu-toggle').click();
    await page.locator('button:has-text("Restart Game")').click();
    await page.waitForURL('**/game/*', { timeout: 30000 });
    await expect(page.locator('.at-table-link')).toContainText('verify-table');
  });
});
