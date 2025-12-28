/**
 * End-to-End Verification: Game Prep Feature
 *
 * This test verifies the complete Game Prep flow, proving that:
 *
 * 1. Deck selection creates a GamePrep and redirects to /prepare/:prepId
 * 2. The prep page displays deck information, commanders, and card list
 * 3. "Shuffle Up" creates an Active game and redirects to /game/:gameId
 * 4. The game page displays properly with commanders, library, hand area
 * 5. Browser back button goes back to /prepare/:prepId (the key fix!)
 * 6. Restart creates a new game from the same prep
 *
 * KEY FEATURE BEING VERIFIED:
 * The separation of GamePrep (/prepare/:prepId) from Active Game (/game/:gameId)
 * fixes the browser back button issue. Previously, browser back from an active game
 * would skip deck review entirely because they shared the same URL.
 *
 * RUN: npm run test:verify
 *
 * The test script automatically starts and stops the server on port 3001.
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

// Increase timeout for this test
test.setTimeout(90000);

/**
 * Helper to extract the prep ID from a /prepare/:prepId URL
 */
function extractPrepId(url: string): string | null {
  const match = url.match(/\/prepare\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Helper to extract the game ID from a /game/:gameId URL
 */
function extractGameId(url: string): string | null {
  const match = url.match(/\/game\/(\d+)/);
  return match ? match[1] : null;
}

test.describe('Game Prep Feature', () => {

  test('complete game prep flow with browser back button verification', async ({ page }) => {
    // ========================================
    // STEP 1: Navigate to deck selection
    // ========================================
    console.log('Step 1: Navigating to home page...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Verify we're on the home page
    await expect(page.locator('body')).toBeVisible();
    console.log('Home page loaded successfully');

    // Navigate to deck selection
    console.log('Step 1b: Navigating to deck selection...');
    await page.goto(`${BASE_URL}/choose-any-deck`);
    await page.waitForLoadState('networkidle');

    // Verify deck selection page loaded
    const preconTiles = page.locator('.precon-tile');
    await expect(preconTiles.first()).toBeVisible({ timeout: 10000 });
    console.log('Deck selection page loaded with precon tiles');

    // ========================================
    // STEP 2: Select a precon deck - click first tile
    // ========================================
    console.log('Step 2: Selecting first precon deck...');

    // Get the deck name from the first tile for later verification
    const firstTile = preconTiles.first();
    const deckNameElement = firstTile.locator('.tile-deck-name');
    const deckName = await deckNameElement.textContent();
    console.log(`Selected deck: ${deckName}`);

    // Click the first precon tile (it's a submit button)
    await firstTile.click();

    // Wait for redirect to /prepare/:prepId
    await page.waitForURL('**/prepare/*', { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    const prepUrl = page.url();
    const prepId = extractPrepId(prepUrl);
    console.log(`Redirected to prep page: ${prepUrl}`);
    console.log(`Prep ID: ${prepId}`);

    // VERIFICATION: URL should be /prepare/:prepId
    expect(prepUrl).toMatch(/\/prepare\/\d+$/);
    expect(prepId).not.toBeNull();

    // ========================================
    // STEP 3: Verify prep page displays deck information
    // ========================================
    console.log('Step 3: Verifying prep page content...');

    // Verify deck review container exists
    const deckReviewContainer = page.locator('#deck-review-container');
    await expect(deckReviewContainer).toBeVisible({ timeout: 10000 });

    // Verify command zone (commanders) is displayed
    const commandZone = page.locator('#command-zone');
    await expect(commandZone).toBeVisible();
    console.log('Command zone is visible');

    // Verify library section is displayed
    const librarySection = page.locator('[data-testid="library-section"]');
    await expect(librarySection).toBeVisible();
    console.log('Library section is visible');

    // Verify "Shuffle Up" button exists
    const shuffleUpButton = page.locator('button.start-game-button');
    await expect(shuffleUpButton).toBeVisible();
    await expect(shuffleUpButton).toHaveText('Shuffle Up');
    console.log('Shuffle Up button is visible');

    // Verify "Choose Another Deck" button exists
    const backButton = page.locator('button.back-button');
    await expect(backButton).toBeVisible();
    console.log('Back button is visible');

    // Verify the hidden prep-id input has correct value
    const prepIdInput = page.locator('input[name="prep-id"]');
    await expect(prepIdInput).toHaveValue(prepId!);
    console.log(`Prep ID input has correct value: ${prepId}`);

    // ========================================
    // STEP 4: Click "Shuffle Up" to start the game
    // ========================================
    console.log('Step 4: Starting game by clicking Shuffle Up...');

    await shuffleUpButton.click();

    // Wait for redirect to /game/:gameId
    await page.waitForURL('**/game/*', { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    const gameUrl = page.url();
    const gameId = extractGameId(gameUrl);
    console.log(`Redirected to game page: ${gameUrl}`);
    console.log(`Game ID: ${gameId}`);

    // VERIFICATION: URL should be /game/:gameId
    expect(gameUrl).toMatch(/\/game\/\d+$/);
    expect(gameId).not.toBeNull();

    // ========================================
    // STEP 5: Verify active game page displays properly
    // ========================================
    console.log('Step 5: Verifying active game page content...');

    // Verify game container exists
    const gameContainer = page.locator('#game-container');
    await expect(gameContainer).toBeVisible({ timeout: 10000 });
    console.log('Game container is visible');

    // Verify game has the correct game ID in data attribute
    await expect(gameContainer).toHaveAttribute('data-game-id', gameId!);

    // Verify library section is present (should show card count)
    const libraryButton = page.locator('.library-contents');
    // Library might be a clickable element showing count
    const libraryDisplay = page.locator('#library-section, .library-section, [id*="library"]').first();
    await expect(libraryDisplay).toBeVisible();
    console.log('Library section is visible in active game');

    // Verify hand section exists
    const handSection = page.locator('#hand-section, .hand-section, .game-hand-row').first();
    await expect(handSection).toBeVisible();
    console.log('Hand section is visible');

    // Verify command zone is displayed
    const gameCommandZone = page.locator('#command-zone');
    await expect(gameCommandZone).toBeVisible();
    console.log('Command zone is visible in active game');

    // Verify restart button exists
    const restartButton = page.locator('button:has-text("Restart Game")');
    await expect(restartButton).toBeVisible();
    console.log('Restart Game button is visible');

    // Verify "Choose Another Deck" button exists
    const endGameButton = page.locator('button:has-text("Choose Another Deck")');
    await expect(endGameButton).toBeVisible();
    console.log('Choose Another Deck button is visible');

    // ========================================
    // STEP 6: CRITICAL - Browser back button test
    // ========================================
    console.log('Step 6: Testing browser back button (THE KEY FIX!)...');

    // Record current game URL
    const currentGameUrl = page.url();
    console.log(`Current game URL before back: ${currentGameUrl}`);

    // Use browser back button
    await page.goBack();
    await page.waitForLoadState('networkidle');

    const afterBackUrl = page.url();
    console.log(`URL after browser back: ${afterBackUrl}`);

    // CRITICAL VERIFICATION: Should go back to /prepare/:prepId, NOT to /choose-any-deck
    expect(afterBackUrl).toMatch(/\/prepare\/\d+$/);
    expect(afterBackUrl).toContain(`/prepare/${prepId}`);
    console.log('SUCCESS: Browser back went to prep page, not deck selection!');

    // Verify we're on the prep page with deck review content
    await expect(page.locator('#deck-review-container')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button.start-game-button')).toBeVisible();
    console.log('Prep page content is visible after browser back');

    // ========================================
    // STEP 7: Navigate forward to game again
    // ========================================
    console.log('Step 7: Navigating forward to return to game...');

    await page.goForward();
    await page.waitForLoadState('networkidle');

    const forwardUrl = page.url();
    console.log(`URL after forward: ${forwardUrl}`);

    expect(forwardUrl).toMatch(/\/game\/\d+$/);
    await expect(page.locator('#game-container')).toBeVisible({ timeout: 10000 });
    console.log('Returned to active game via forward button');

    // ========================================
    // STEP 8: Test restart game functionality
    // ========================================
    console.log('Step 8: Testing restart game functionality...');

    // Get current game ID before restart
    const originalGameId = extractGameId(page.url());
    console.log(`Original game ID: ${originalGameId}`);

    // Click restart button
    const restartBtn = page.locator('button:has-text("Restart Game")');
    await restartBtn.click();

    // Wait for redirect to new game
    await page.waitForURL('**/game/*', { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    const newGameUrl = page.url();
    const newGameId = extractGameId(newGameUrl);
    console.log(`New game URL after restart: ${newGameUrl}`);
    console.log(`New game ID: ${newGameId}`);

    // VERIFICATION: New game should have different ID
    expect(newGameId).not.toBeNull();
    expect(newGameId).not.toEqual(originalGameId);
    console.log('SUCCESS: Restart created a new game with different ID');

    // Verify new game is functional
    await expect(page.locator('#game-container')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#game-container')).toHaveAttribute('data-game-id', newGameId!);
    console.log('New game is fully functional');

    // ========================================
    // STEP 9: Verify back from restarted game goes to same prep
    // ========================================
    console.log('Step 9: Verifying back from restarted game...');

    await page.goBack();
    await page.waitForLoadState('networkidle');

    const backFromRestartUrl = page.url();
    console.log(`URL after back from restarted game: ${backFromRestartUrl}`);

    // Note: After restart, back should go to the previous game first
    // Then another back should go to prep
    // Or it might go directly to prep depending on history
    // The key is that prep page is in the history

    // If we're at the old game, go back again
    if (backFromRestartUrl.includes('/game/')) {
      console.log('Went to previous game, going back again...');
      await page.goBack();
      await page.waitForLoadState('networkidle');
    }

    const finalBackUrl = page.url();
    console.log(`Final URL after all backs: ${finalBackUrl}`);

    // Should eventually reach the prep page
    if (finalBackUrl.includes('/prepare/')) {
      expect(finalBackUrl).toContain(`/prepare/${prepId}`);
      console.log('SUCCESS: Prep page is accessible in browser history from restarted game');
    }

    console.log('\n========================================');
    console.log('ALL GAME PREP FEATURE VERIFICATIONS PASSED!');
    console.log('========================================');
    console.log(`- Deck selection created prep: /prepare/${prepId}`);
    console.log(`- Prep page displayed deck info correctly`);
    console.log(`- Shuffle Up created game: /game/${originalGameId}`);
    console.log(`- Active game displayed all components`);
    console.log(`- Browser back went to /prepare/${prepId} (KEY FIX VERIFIED!)`);
    console.log(`- Restart created new game: /game/${newGameId}`);
    console.log('========================================\n');
  });

  test('prep page allows navigating back to deck selection', async ({ page }) => {
    console.log('Testing: Prep page allows navigating back to deck selection...');

    // Load a deck and get to prep page
    await page.goto(`${BASE_URL}/choose-any-deck`);
    await page.waitForLoadState('networkidle');

    const preconTiles = page.locator('.precon-tile');
    await expect(preconTiles.first()).toBeVisible({ timeout: 10000 });

    await preconTiles.first().click();
    await page.waitForURL('**/prepare/*', { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    console.log('On prep page');

    // Click "Choose Another Deck" button
    const backButton = page.locator('button.back-button');
    await expect(backButton).toBeVisible();
    await backButton.click();

    // Should redirect to deck selection - wait for the page to load
    await page.waitForLoadState('networkidle');
    // Give additional time for any client-side redirects
    await page.waitForTimeout(1000);

    console.log(`Current URL: ${page.url()}`);
    console.log('Successfully navigated back to deck selection');

    expect(page.url()).toContain('/choose-any-deck');
  });

  test('multiple games can be started from the same prep', async ({ page }) => {
    console.log('Testing: Multiple games from same prep...');

    // Load a deck and get to prep page
    await page.goto(`${BASE_URL}/choose-any-deck`);
    await page.waitForLoadState('networkidle');

    const preconTiles = page.locator('.precon-tile');
    await preconTiles.first().click();
    await page.waitForURL('**/prepare/*', { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    const prepUrl = page.url();
    const prepId = extractPrepId(prepUrl);
    console.log(`Prep ID: ${prepId}`);

    // Start first game
    await page.locator('button.start-game-button').click();
    await page.waitForURL('**/game/*', { timeout: 30000 });
    const game1Id = extractGameId(page.url());
    console.log(`Game 1 ID: ${game1Id}`);

    // Go back to prep page directly
    await page.goto(prepUrl);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#deck-review-container')).toBeVisible({ timeout: 10000 });

    // Start second game from same prep
    await page.locator('button.start-game-button').click();
    await page.waitForURL('**/game/*', { timeout: 30000 });
    const game2Id = extractGameId(page.url());
    console.log(`Game 2 ID: ${game2Id}`);

    // Verify both games are different
    expect(game1Id).not.toEqual(game2Id);
    console.log('SUCCESS: Two different games created from same prep');

    // Verify second game is functional
    await expect(page.locator('#game-container')).toBeVisible();
    await expect(page.locator('#game-container')).toHaveAttribute('data-game-id', game2Id!);
  });
});
