/**
 * End-to-End Verification: Game History Feature
 *
 * This test verifies the Game History admin screen, proving that:
 *
 * 1. Games with actions are displayed in the history
 * 2. Games with zero actions are skipped
 * 3. Commander names are displayed for each game
 * 4. Action counts are displayed correctly
 * 5. Date and time are displayed for each game
 *
 * RUN: npm run test:verify
 *
 * The test script automatically starts and stops the server on port 3001.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

// Increase timeout for this test
test.setTimeout(90000);

/**
 * Helper to extract the game ID from a /game/:gameId URL
 */
function extractGameId(url: string): string | null {
  const match = url.match(/\/game\/(\d+)/);
  return match ? match[1] : null;
}

test.describe('Game History Feature', () => {

  test('displays game history with commanders and action counts', async ({ page }) => {
    // ========================================
    // STEP 1: Create a game with some actions
    // ========================================
    console.log('Step 1: Creating a game with actions...');

    await page.goto(`${BASE_URL}/choose-any-deck`);
    await page.waitForLoadState('networkidle');

    const preconTiles = page.locator('.precon-tile');
    await expect(preconTiles.first()).toBeVisible({ timeout: 10000 });

    await preconTiles.first().click();
    await page.waitForURL('**/prepare/*', { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // Start the game
    const shuffleUpButton = page.locator('button.start-game-button');
    await shuffleUpButton.click();
    await page.waitForURL('**/game/*', { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    const gameId1 = extractGameId(page.url());
    console.log(`Game 1 ID: ${gameId1}`);

    // Perform some actions - draw 3 cards
    console.log('Drawing 3 cards to create action history...');

    for (let i = 0; i < 3; i++) {
      const libraryButton = page.locator('.library-contents').first();
      await libraryButton.click();
      await page.waitForLoadState('networkidle');

      // Click "Draw 1" button in the modal
      const drawButton = page.locator('button:has-text("Draw 1")');
      await drawButton.click();
      await page.waitForLoadState('networkidle');

      // Wait a bit between draws
      await page.waitForTimeout(500);
    }

    console.log('Drew 3 cards successfully');

    // ========================================
    // STEP 2: Create another game with zero actions
    // ========================================
    console.log('Step 2: Creating a game with zero actions...');

    // Go back to deck selection
    await page.goto(`${BASE_URL}/choose-any-deck`);
    await page.waitForLoadState('networkidle');

    await preconTiles.first().click();
    await page.waitForURL('**/prepare/*', { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // Start the game but don't do anything
    await page.locator('button.start-game-button').click();
    await page.waitForURL('**/game/*', { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    const gameId2 = extractGameId(page.url());
    console.log(`Game 2 ID (no actions): ${gameId2}`);

    // ========================================
    // STEP 3: Navigate to history page
    // ========================================
    console.log('Step 3: Navigating to history page...');

    await page.goto(`${BASE_URL}/history`);
    await page.waitForLoadState('networkidle');

    // ========================================
    // STEP 4: Verify history page content
    // ========================================
    console.log('Step 4: Verifying history page content...');

    // Verify the page has docs-style layout
    const historyContent = page.locator('.docs-content, .history-content').first();
    await expect(historyContent).toBeVisible({ timeout: 10000 });
    console.log('History page content is visible');

    // Verify heading exists
    const heading = page.locator('h2:has-text("Game History")');
    await expect(heading).toBeVisible();
    console.log('Game History heading found');

    // Verify game 1 (with actions) is displayed
    const game1Row = page.locator(`[data-game-id="${gameId1}"]`);
    await expect(game1Row).toBeVisible();
    console.log('Game 1 (with actions) is displayed');

    // Verify game 1 shows commander name
    const game1Commander = game1Row.locator('.commander-name, [data-testid="commander-name"]').first();
    await expect(game1Commander).toBeVisible();
    const commanderText = await game1Commander.textContent();
    expect(commanderText).toBeTruthy();
    console.log(`Game 1 commander: ${commanderText}`);

    // Verify game 1 shows action count (should be at least 3)
    const game1Actions = game1Row.locator('.action-count, [data-testid="action-count"]');
    await expect(game1Actions).toBeVisible();
    const actionText = await game1Actions.textContent();
    expect(actionText).toContain('3'); // We drew 3 cards
    console.log(`Game 1 actions: ${actionText}`);

    // Verify game 1 shows date/time
    const game1Date = game1Row.locator('.game-date, [data-testid="game-date"]');
    await expect(game1Date).toBeVisible();
    console.log('Game 1 date is displayed');

    // Verify game 2 (with zero actions) is NOT displayed
    const game2Row = page.locator(`[data-game-id="${gameId2}"]`);
    await expect(game2Row).not.toBeVisible();
    console.log('Game 2 (with zero actions) is correctly hidden');

    console.log('\n========================================');
    console.log('ALL GAME HISTORY FEATURE VERIFICATIONS PASSED!');
    console.log('========================================');
    console.log(`- Game ${gameId1} with 3+ actions is displayed`);
    console.log(`- Game ${gameId2} with 0 actions is hidden`);
    console.log('- Commander name is visible');
    console.log('- Action count is visible');
    console.log('- Date/time is visible');
    console.log('========================================\n');
  });

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
