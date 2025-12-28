/**
 * End-to-End Verification: Optimistic Concurrency Control
 *
 * This test verifies that the MTG deck shuffler app correctly prevents
 * stale state operations using version numbers.
 *
 * SCENARIO: Two browser windows open the same game. Browser A performs
 * an action (changing the state version), then Browser B (with stale state)
 * tries to perform an action and should be rejected with a 409 status.
 *
 * EXPECTED BEHAVIOR:
 * - Browser A successfully draws a card
 * - Browser B's draw attempt is rejected with status 409
 * - Error message contains "Please Refresh"
 * - After refresh, Browser B can successfully perform actions
 *
 * RUN: npm run test:verify
 *
 * The test script automatically starts and stops the server on port 3001.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

// Increase timeout for this test since we're dealing with multiple browsers
test.setTimeout(60000);

/**
 * Helper to load a precon deck and start a game
 * Returns the game URL for sharing between browser contexts
 */
async function loadPreconDeckAndStartGame(page: Page): Promise<string> {
  // Navigate directly to deck selection page
  await page.goto(`${BASE_URL}/choose-any-deck`);
  await page.waitForLoadState('networkidle');

  // Click the first precon deck tile (the UI now uses tiles, not a dropdown)
  const preconTile = page.locator('.precon-tile').first();
  await expect(preconTile).toBeVisible();
  await preconTile.click();

  // Wait for navigation to the prep page (Game Prep feature)
  await page.waitForURL('**/prepare/*', { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  // Find and click the "Shuffle Up" button to start the game
  const shuffleUpButton = page.locator('button.start-game-button');
  await expect(shuffleUpButton).toBeVisible();
  await shuffleUpButton.click();

  // Wait for the game to start and redirect to /game/:gameId
  await page.waitForURL('**/game/*', { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  // Wait for the game container to appear (indicates active game state)
  await page.waitForSelector('#game-container', { timeout: 10000 });

  // Return the current game URL
  return page.url();
}

/**
 * Get the current expected-version from the game container
 */
async function getExpectedVersion(page: Page): Promise<number | null> {
  const gameContainer = page.locator('#game-container');
  const version = await gameContainer.getAttribute('data-expected-version');
  return version ? parseInt(version) : null;
}

/**
 * Wait for the game container to be present and HTMX to settle
 */
async function waitForGameReady(page: Page): Promise<void> {
  await page.waitForSelector('#game-container', { state: 'attached', timeout: 10000 });
  // Wait for HTMX to settle
  await page.waitForTimeout(500);
}

test.describe('Optimistic Concurrency Control', () => {

  test('should reject stale state operations with 409 status', async ({ browser }) => {
    // Create two independent browser contexts (simulating two browsers/tabs)
    const contextA: BrowserContext = await browser.newContext();
    const contextB: BrowserContext = await browser.newContext();

    const pageA: Page = await contextA.newPage();
    const pageB: Page = await contextB.newPage();

    try {
      // ========================================
      // STEP 1: Browser A loads deck and starts game
      // ========================================
      console.log('Step 1: Browser A loading deck and starting game...');
      const gameUrl = await loadPreconDeckAndStartGame(pageA);
      console.log(`Game URL: ${gameUrl}`);

      await waitForGameReady(pageA);
      const initialVersionA = await getExpectedVersion(pageA);
      console.log(`Browser A initial version: ${initialVersionA}`);
      expect(initialVersionA).not.toBeNull();

      // ========================================
      // STEP 2: Browser B opens the same game URL
      // ========================================
      console.log('Step 2: Browser B opening same game URL...');
      await pageB.goto(gameUrl);
      await waitForGameReady(pageB);

      const initialVersionB = await getExpectedVersion(pageB);
      console.log(`Browser B initial version: ${initialVersionB}`);

      // Both browsers should see the same version initially
      expect(initialVersionB).toEqual(initialVersionA);

      // ========================================
      // STEP 3: Browser A draws a card (increments version)
      // ========================================
      console.log('Step 3: Browser A drawing a card...');

      // Set up response listener for Browser A's draw
      const responsePromiseA = pageA.waitForResponse(response =>
        response.url().includes('/draw/') && response.status() === 200
      );

      const drawButtonA = pageA.locator('button.draw-button');
      await expect(drawButtonA).toBeVisible();
      await drawButtonA.click();

      // Wait for the draw to complete
      const drawResponseA = await responsePromiseA;
      console.log(`Browser A draw response status: ${drawResponseA.status()}`);
      expect(drawResponseA.status()).toBe(200);

      // Wait for HTMX to update the DOM
      await waitForGameReady(pageA);

      const newVersionA = await getExpectedVersion(pageA);
      console.log(`Browser A new version after draw: ${newVersionA}`);

      // Version should have incremented
      expect(newVersionA).toBeGreaterThan(initialVersionA!);

      // ========================================
      // STEP 4: Browser B (with stale state) attempts to draw
      // ========================================
      console.log('Step 4: Browser B (stale state) attempting to draw...');

      // Verify Browser B still has the OLD version
      const staleVersionB = await getExpectedVersion(pageB);
      console.log(`Browser B stale version: ${staleVersionB}`);
      expect(staleVersionB).toEqual(initialVersionA);  // Should still be the old version

      // Set up response listener for Browser B's draw attempt
      // We expect a 409 Conflict response
      const responsePromiseB = pageB.waitForResponse(response =>
        response.url().includes('/draw/')
      );

      const drawButtonB = pageB.locator('button.draw-button');
      await expect(drawButtonB).toBeVisible();
      await drawButtonB.click();

      // Wait for the response
      const drawResponseB = await responsePromiseB;
      console.log(`Browser B draw response status: ${drawResponseB.status()}`);

      // ========================================
      // VERIFICATION: Should be 409 Conflict
      // ========================================
      expect(drawResponseB.status()).toBe(409);

      // Check the response body contains the error message
      const responseBody = await drawResponseB.text();
      console.log('Browser B response body:', responseBody);

      expect(responseBody).toContain('modal-overlay');
      expect(responseBody).toContain('Game State Changed');
      expect(responseBody).toContain('What happened while you were away');

      // ========================================
      // STEP 5: Verify the game state was NOT modified by B's request
      // ========================================
      console.log('Step 5: Verifying game state was not modified...');

      // Refresh Browser A to get current state
      await pageA.reload();
      await waitForGameReady(pageA);

      const verifyVersionA = await getExpectedVersion(pageA);
      console.log(`Browser A version after B's rejected request: ${verifyVersionA}`);

      // Version should be unchanged (only A's draw was applied)
      expect(verifyVersionA).toEqual(newVersionA);

      // ========================================
      // STEP 6: Browser B refreshes and can now act
      // ========================================
      console.log('Step 6: Browser B refreshing and attempting action...');

      await pageB.reload();
      await waitForGameReady(pageB);

      const refreshedVersionB = await getExpectedVersion(pageB);
      console.log(`Browser B version after refresh: ${refreshedVersionB}`);

      // After refresh, B should have the same version as A
      expect(refreshedVersionB).toEqual(newVersionA);

      // Now Browser B should be able to draw successfully
      const successResponsePromiseB = pageB.waitForResponse(response =>
        response.url().includes('/draw/') && response.status() === 200
      );

      const refreshedDrawButtonB = pageB.locator('button.draw-button');
      await refreshedDrawButtonB.click();

      const successResponseB = await successResponsePromiseB;
      console.log(`Browser B draw after refresh status: ${successResponseB.status()}`);
      expect(successResponseB.status()).toBe(200);

      await waitForGameReady(pageB);
      const finalVersionB = await getExpectedVersion(pageB);
      console.log(`Browser B final version: ${finalVersionB}`);

      // Version should have incremented
      expect(finalVersionB).toBeGreaterThan(refreshedVersionB!);

      console.log('SUCCESS: Optimistic concurrency control is working correctly!');

    } finally {
      // Clean up
      await contextA.close();
      await contextB.close();
    }
  });
});
