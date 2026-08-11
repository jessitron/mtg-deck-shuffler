
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

test.setTimeout(90000);

test.describe('Load a Precon Deck', () => {

  test('selecting a precon deck navigates to /prepare with deck content', async ({ page }) => {
    // Go to deck selection
    await page.goto(`${BASE_URL}/choose-any-deck`);

    // Wait for precon tiles to load via HTMX
    const preconTiles = page.locator('.precon-tile');
    await expect(preconTiles.first()).toBeVisible({ timeout: 15000 });

    // Remember which deck we clicked
    const deckName = await preconTiles.first().locator('.tile-deck-name').textContent();
    console.log(`Selecting precon deck: ${deckName}`);

    // Click the first precon tile
    await preconTiles.first().click();

    // Should redirect to /prepare/:prepId
    await page.waitForURL('**/prepare/*', { timeout: 30000 });

    const url = page.url();
    const match = url.match(/\/prepare\/(\d+)/);
    expect(match).toBeTruthy();
    console.log(`Arrived at prep: ${url}`);

    // Verify the prepare page has deck content
    const librarySection = page.locator('[data-testid="library-section"]');
    await expect(librarySection).toBeVisible({ timeout: 10000 });

    // Verify the Shuffle Up button is present (confirms full page render)
    const shuffleUpButton = page.locator('button.begin-button');
    await expect(shuffleUpButton).toBeVisible();

    console.log('SUCCESS: Precon deck loaded and prepare page rendered');
  });
});
