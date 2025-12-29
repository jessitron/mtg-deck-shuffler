/**
 * Focused Verification: Precon Deck Load to Prep Page
 *
 * This minimal test verifies that selecting a precon deck successfully
 * loads and reaches the /prepare/:prepId page.
 *
 * Purpose: Identify any errors that occur when loading a precon deck
 * and navigating to the preparation step.
 *
 * RUN: npm run test:verify
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

test.setTimeout(60000);

test.describe('Precon Deck Load to Prep', () => {

  test('selecting first precon deck reaches prep page', async ({ page }) => {
    // Enable console logging from the page
    page.on('console', msg => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
    });

    // Capture page errors
    page.on('pageerror', error => {
      console.log(`[Page Error] ${error.message}`);
    });

    // Step 1: Navigate to deck selection page
    console.log('Step 1: Navigating to /choose-any-deck...');
    await page.goto(`${BASE_URL}/choose-any-deck`);
    await page.waitForLoadState('networkidle');

    // Verify deck selection page loaded
    console.log('Waiting for precon tiles to load...');
    const preconTiles = page.locator('.precon-tile');
    await expect(preconTiles.first()).toBeVisible({ timeout: 15000 });

    const tileCount = await preconTiles.count();
    console.log(`Found ${tileCount} precon tiles`);

    // Step 2: Get info about the first precon deck
    const firstTile = preconTiles.first();
    const deckNameElement = firstTile.locator('.tile-deck-name');
    const deckName = await deckNameElement.textContent();
    console.log(`Selected deck: ${deckName}`);

    // Get the precon-deck value (filename) that will be submitted
    const preconDeckValue = await firstTile.getAttribute('value');
    console.log(`Precon deck file: ${preconDeckValue}`);

    // Step 3: Click the precon tile to submit the form
    console.log('Step 2: Clicking precon tile to load deck...');
    await firstTile.click();

    // Step 4: Wait for navigation to /prepare/:prepId
    console.log('Step 3: Waiting for redirect to /prepare/:prepId...');
    try {
      await page.waitForURL('**/prepare/*', { timeout: 30000 });
      await page.waitForLoadState('networkidle');

      const prepUrl = page.url();
      console.log(`Successfully reached prep page: ${prepUrl}`);

      // Verify URL format
      expect(prepUrl).toMatch(/\/prepare\/\d+$/);

      // Step 5: Verify prep page content loaded
      console.log('Step 4: Verifying prep page content...');
      const deckReviewContainer = page.locator('#deck-review-container');
      await expect(deckReviewContainer).toBeVisible({ timeout: 10000 });
      console.log('Deck review container is visible');

      // Verify command zone (commanders) is displayed
      const commandZone = page.locator('#command-zone');
      await expect(commandZone).toBeVisible();
      console.log('Command zone is visible');

      // Verify "Shuffle Up" button exists
      const shuffleUpButton = page.locator('button.start-game-button');
      await expect(shuffleUpButton).toBeVisible();
      console.log('Shuffle Up button is visible');

      console.log('\n========================================');
      console.log('SUCCESS: Precon deck loaded to prep page!');
      console.log(`Deck: ${deckName}`);
      console.log(`Prep URL: ${prepUrl}`);
      console.log('========================================\n');

    } catch (error) {
      // If we didn't reach prep page, capture what page we're on
      const currentUrl = page.url();
      console.log(`ERROR: Did not reach prep page. Current URL: ${currentUrl}`);

      // Check if we got an error page
      const pageContent = await page.content();
      if (pageContent.includes('error') || pageContent.includes('Error')) {
        console.log('Page appears to contain an error.');
        // Try to get error message from page
        const errorElement = page.locator('.error-message, [class*="error"], h1, h2, h3').first();
        if (await errorElement.isVisible()) {
          const errorText = await errorElement.textContent();
          console.log(`Error message found: ${errorText}`);
        }
      }

      // Take a screenshot for debugging
      await page.screenshot({ path: 'test/verification/precon-load-error.png', fullPage: true });
      console.log('Screenshot saved to test/verification/precon-load-error.png');

      throw error;
    }
  });
});
