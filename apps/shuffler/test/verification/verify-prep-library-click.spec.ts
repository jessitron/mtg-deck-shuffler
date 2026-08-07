/**
 * End-to-End Verification: Clicking the library stack on the prepare screen
 * opens the library search modal.
 *
 * RUN: npm run test:verify
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

test.setTimeout(90000);

function extractPrepId(url: string): string | null {
  const match = url.match(/\/prepare\/(\d+)/);
  return match ? match[1] : null;
}

async function setupPrep(page: Page): Promise<string> {
  await page.goto(`${BASE_URL}/choose-any-deck`);

  const firstTile = page.locator('.precon-tile').first();
  await expect(firstTile).toBeVisible({ timeout: 15000 });
  const deckFile = await firstTile.getAttribute('value');

  await page.evaluate((file: string) => {
    const form = document.querySelector('form.precon-input-section') as HTMLFormElement;
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'precon-deck';
    input.value = file;
    form.appendChild(input);
    form.submit();
  }, deckFile!);

  await page.waitForURL('**/prepare/*', { timeout: 60000 });

  const prepId = extractPrepId(page.url());
  if (!prepId) throw new Error('Failed to create prep');
  return prepId;
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
