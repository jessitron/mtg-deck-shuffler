
import { test, expect, Page } from '@playwright/test';
import { seedPrep } from './seedGame.js';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

test.setTimeout(90000);

async function setupPrep(page: Page): Promise<string> {
  return seedPrep(page);
}

test.describe('Prepare screen - clicking the library opens search modal', () => {
  test('clicking the library stack opens the library search modal', async ({ page }) => {
    const prepId = await setupPrep(page);

    await page.goto(`${BASE_URL}/prepare/${prepId}`);

    // Modal not open yet
    await expect(page.locator('.modal-overlay')).toHaveCount(0);

    // Click the library stack itself (not the Search button)
    const libraryStack = page.locator('[data-testid="library-stack"]');
    await expect(libraryStack).toBeVisible({ timeout: 5000 });
    await libraryStack.click();

    // The library search modal should open
    const libraryModal = page.locator('.modal-overlay');
    await expect(libraryModal).toBeVisible({ timeout: 5000 });

    // And it should contain the Group by Type toggle, confirming it's the library modal
    await expect(page.locator('.group-by-type-toggle')).toBeVisible({ timeout: 5000 });
  });
});
