/**
 * End-to-End Verification: Library Modal Card Type Grouping
 *
 * This test verifies the "Group by Type" toggle in the library search modal:
 * - ?openLibrary=true shows ungrouped library
 * - ?openLibrary=true&groupBy=type shows cards grouped by type with headers
 * - Toggle button switches between grouped and ungrouped views
 *
 * RUN: npm run test:verify
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

test.setTimeout(90000);

function extractPrepId(url: string): string | null {
  const match = url.match(/\/prepare\/(\d+)/);
  return match ? match[1] : null;
}

async function setupPrep(page: any): Promise<string> {
  await page.goto(`${BASE_URL}/choose-any-deck`);
  await page.waitForLoadState('networkidle');

  const preconTiles = page.locator('.precon-tile');
  await expect(preconTiles.first()).toBeVisible({ timeout: 10000 });
  await preconTiles.first().click();

  await page.waitForURL('**/prepare/*', { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  const prepId = extractPrepId(page.url());
  if (!prepId) throw new Error('Failed to create prep');

  return prepId;
}

test.describe('Library Modal - Card Type Grouping', () => {

  test('library modal shows Group by Type toggle button', async ({ page }) => {
    const prepId = await setupPrep(page);

    await page.goto(`${BASE_URL}/prepare/${prepId}?openLibrary=true`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const libraryModal = page.locator('.modal-overlay');
    await expect(libraryModal).toBeVisible({ timeout: 5000 });

    // Toggle button should be present
    const toggleButton = page.locator('.group-by-type-toggle');
    await expect(toggleButton).toBeVisible({ timeout: 5000 });
  });

  test('groupBy=type query parameter shows cards grouped with type headers', async ({ page }) => {
    const prepId = await setupPrep(page);

    await page.goto(`${BASE_URL}/prepare/${prepId}?openLibrary=true&groupBy=type`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const libraryModal = page.locator('.modal-overlay');
    await expect(libraryModal).toBeVisible({ timeout: 5000 });

    // Should have type group headers
    const typeHeaders = page.locator('.card-type-header');
    const headerCount = await typeHeaders.count();
    expect(headerCount).toBeGreaterThan(1);

    // Toggle button should be active
    const toggleButton = page.locator('.group-by-type-toggle.active');
    await expect(toggleButton).toBeVisible({ timeout: 5000 });
  });

  test('grouped view: card modal prev/next stays within the type group', async ({ page }) => {
    const prepId = await setupPrep(page);

    // Open grouped library modal
    await page.goto(`${BASE_URL}/prepare/${prepId}?openLibrary=true&groupBy=type`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const libraryModal = page.locator('.modal-overlay');
    await expect(libraryModal).toBeVisible({ timeout: 5000 });

    // Find the first type group and count its cards
    const firstGroup = page.locator('.card-type-group').first();
    const firstGroupHeader = firstGroup.locator('.card-type-header');
    const headerText = await firstGroupHeader.textContent();
    // Header format: "Creature (27)" — extract the count
    const groupCountMatch = headerText?.match(/\((\d+)\)/);
    const groupCount = groupCountMatch ? parseInt(groupCountMatch[1]) : 0;
    expect(groupCount).toBeGreaterThan(1);

    // Click the first card name in the first group
    const firstCardInGroup = firstGroup.locator('.clickable-card-name').first();
    await firstCardInGroup.click();
    await page.waitForTimeout(500);

    // Card modal should be open
    const cardModal = page.locator('.card-modal-overlay');
    await expect(cardModal).toBeVisible({ timeout: 5000 });

    // Position indicator should show "Card 1 of <groupCount>" (not the full library count)
    const positionIndicator = page.locator('.card-modal-position-indicator');
    await expect(positionIndicator).toHaveText(`Card 1 of ${groupCount}`);

    // Should have no prev button (we're at position 1)
    const prevButton = page.locator('.card-modal-nav-prev');
    await expect(prevButton).not.toBeVisible();

    // Should have a next button
    const nextButton = page.locator('.card-modal-nav-next');
    await expect(nextButton).toBeVisible();

    // Click next
    await nextButton.click({ force: true });
    await page.waitForTimeout(500);

    // Position should now be "Card 2 of <groupCount>"
    await expect(positionIndicator).toHaveText(`Card 2 of ${groupCount}`);

    // Now prev button should appear
    await expect(page.locator('.card-modal-nav-prev')).toBeVisible();
  });
});
