/**
 * End-to-End Verification: Game History Feature
 *
 * RUN: npm run test:verify
 *
 * The test script automatically starts and stops the server on port 3001.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

test.describe('Game History Feature', () => {

  test('history page is accessible directly via URL', async ({ page }) => {
    console.log('Testing: History page accessible via direct URL...');

    await page.goto(`${BASE_URL}/history`);
    await page.waitForLoadState('networkidle');

    // Verify page loads
    const historyContent = page.locator('.docs-content, .history-content').first();
    await expect(historyContent).toBeVisible({ timeout: 10000 });

    const heading = page.locator('h2:has-text("Game History")');
    await expect(heading).toBeVisible();

    console.log('SUCCESS: History page loads directly');
  });
});
