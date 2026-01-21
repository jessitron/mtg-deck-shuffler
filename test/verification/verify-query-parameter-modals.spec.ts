/**
 * End-to-End Verification: Query Parameter Modal Auto-Opening
 *
 * This test verifies that modals can be auto-opened via query parameters:
 *
 * Game Page Query Parameters:
 * - ?openCard=N - Opens card modal for card index N
 * - ?openLibrary=true - Opens library search modal
 * - ?openLibrary=true&openCard=N - Opens library modal with card N overlaid
 * - ?openTable=true - Opens table contents modal
 * - ?openTable=true&openCard=N - Opens table modal with card N overlaid
 * - ?openHistory=true - Opens action history modal
 * - ?openDebug=true - Opens debug state JSON modal
 *
 * Prep Page Query Parameters:
 * - ?openCard=N - Opens card modal for card index N
 * - ?openLibrary=true - Opens library contents modal
 * - ?openLibrary=true&openCard=N - Opens library modal with card N overlaid
 *
 * RUN: npm run test:verify
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

// Increase timeout for these tests
test.setTimeout(90000);

/**
 * Helper to extract the game ID from a /game/:gameId URL
 */
function extractGameId(url: string): string | null {
  const match = url.match(/\/game\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Helper to extract the prep ID from a /prepare/:prepId URL
 */
function extractPrepId(url: string): string | null {
  const match = url.match(/\/prepare\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Setup helper: Creates a game and returns the gameId
 */
async function setupGame(page: any): Promise<string> {
  await page.goto(`${BASE_URL}/choose-any-deck`);
  await page.waitForLoadState('networkidle');

  const preconTiles = page.locator('.precon-tile');
  await expect(preconTiles.first()).toBeVisible({ timeout: 10000 });
  await preconTiles.first().click();

  await page.waitForURL('**/prepare/*', { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  const shuffleUpButton = page.locator('button.begin-button, button.start-game-button, button:has-text("Shuffle Up")');
  await expect(shuffleUpButton).toBeVisible();
  await shuffleUpButton.click();

  await page.waitForURL('**/game/*', { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  const gameId = extractGameId(page.url());
  if (!gameId) throw new Error('Failed to create game');

  return gameId;
}

/**
 * Setup helper: Creates a prep and returns the prepId
 */
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

test.describe('Query Parameter Modal Auto-Opening - Game Page', () => {

  test('opens card modal with ?openCard=N on game page', async ({ page }) => {
    console.log('Testing: Game page ?openCard=N parameter...');

    const gameId = await setupGame(page);
    console.log(`Game ID: ${gameId}`);

    // Navigate to game with ?openCard=0 query parameter
    await page.goto(`${BASE_URL}/game/${gameId}?openCard=0`);
    await page.waitForLoadState('networkidle');

    // Wait a bit for the auto-open to trigger
    await page.waitForTimeout(1000);

    // Verify card modal container is populated
    const cardModalContainer = page.locator('#card-modal-container');
    await expect(cardModalContainer).not.toBeEmpty({ timeout: 5000 });

    // Verify the modal content is visible
    const cardModal = page.locator('.card-modal-overlay');
    await expect(cardModal).toBeVisible({ timeout: 5000 });

    console.log('SUCCESS: Card modal auto-opened with ?openCard=0');
  });

  test('opens library modal with ?openLibrary=true on game page', async ({ page }) => {
    console.log('Testing: Game page ?openLibrary=true parameter...');

    const gameId = await setupGame(page);

    // Navigate to game with ?openLibrary=true query parameter
    await page.goto(`${BASE_URL}/game/${gameId}?openLibrary=true`);
    await page.waitForLoadState('networkidle');

    // Wait for the auto-open to trigger
    await page.waitForTimeout(1000);

    // Verify modal container is populated
    const modalContainer = page.locator('#modal-container');
    await expect(modalContainer).not.toBeEmpty({ timeout: 5000 });

    // Verify library modal content is visible
    const libraryModal = page.locator('.modal-overlay');
    await expect(libraryModal).toBeVisible({ timeout: 5000 });

    console.log('SUCCESS: Library modal auto-opened with ?openLibrary=true');
  });

  test('opens library modal with card overlay using ?openLibrary=true&openCard=N', async ({ page }) => {
    console.log('Testing: Game page ?openLibrary=true&openCard=N parameters...');

    const gameId = await setupGame(page);

    // Navigate to game with both parameters
    await page.goto(`${BASE_URL}/game/${gameId}?openLibrary=true&openCard=5`);
    await page.waitForLoadState('networkidle');

    // Wait for the auto-open to trigger
    await page.waitForTimeout(1500);

    // Verify library modal is open
    const modalContainer = page.locator('#modal-container');
    await expect(modalContainer).not.toBeEmpty({ timeout: 5000 });

    // Verify card modal is also open (overlaid)
    const cardModalContainer = page.locator('#card-modal-container');
    await expect(cardModalContainer).not.toBeEmpty({ timeout: 5000 });

    console.log('SUCCESS: Library modal with card overlay auto-opened');
  });

  test('opens table modal with ?openTable=true on game page', async ({ page }) => {
    console.log('Testing: Game page ?openTable=true parameter...');

    const gameId = await setupGame(page);

    // Navigate to game with ?openTable=true query parameter
    await page.goto(`${BASE_URL}/game/${gameId}?openTable=true`);
    await page.waitForLoadState('networkidle');

    // Wait for the auto-open to trigger
    await page.waitForTimeout(1000);

    // Verify modal container is populated
    const modalContainer = page.locator('#modal-container');
    await expect(modalContainer).not.toBeEmpty({ timeout: 5000 });

    console.log('SUCCESS: Table modal auto-opened with ?openTable=true');
  });

  test('opens table modal with card overlay using ?openTable=true&openCard=N', async ({ page }) => {
    console.log('Testing: Game page ?openTable=true&openCard=N parameters...');

    const gameId = await setupGame(page);

    // First, we need to play a card to the table so there's something to show
    // Let's just test that the query params trigger the modal requests
    await page.goto(`${BASE_URL}/game/${gameId}?openTable=true&openCard=0`);
    await page.waitForLoadState('networkidle');

    // Wait for the auto-open to trigger
    await page.waitForTimeout(1500);

    // Verify table modal is open
    const modalContainer = page.locator('#modal-container');
    await expect(modalContainer).not.toBeEmpty({ timeout: 5000 });

    // Verify card modal is also open (overlaid)
    const cardModalContainer = page.locator('#card-modal-container');
    await expect(cardModalContainer).not.toBeEmpty({ timeout: 5000 });

    console.log('SUCCESS: Table modal with card overlay auto-opened');
  });

  test('opens history modal with ?openHistory=true on game page', async ({ page }) => {
    console.log('Testing: Game page ?openHistory=true parameter...');

    const gameId = await setupGame(page);

    // Navigate to game with ?openHistory=true query parameter
    await page.goto(`${BASE_URL}/game/${gameId}?openHistory=true`);
    await page.waitForLoadState('networkidle');

    // Wait for the auto-open to trigger
    await page.waitForTimeout(1000);

    // Verify modal container is populated
    const modalContainer = page.locator('#modal-container');
    await expect(modalContainer).not.toBeEmpty({ timeout: 5000 });

    console.log('SUCCESS: History modal auto-opened with ?openHistory=true');
  });

  test('opens debug modal with ?openDebug=true on game page', async ({ page }) => {
    console.log('Testing: Game page ?openDebug=true parameter...');

    const gameId = await setupGame(page);

    // Navigate to game with ?openDebug=true query parameter
    await page.goto(`${BASE_URL}/game/${gameId}?openDebug=true`);
    await page.waitForLoadState('networkidle');

    // Wait for the auto-open to trigger
    await page.waitForTimeout(1000);

    // Verify modal container is populated
    const modalContainer = page.locator('#modal-container');
    await expect(modalContainer).not.toBeEmpty({ timeout: 5000 });

    console.log('SUCCESS: Debug modal auto-opened with ?openDebug=true');
  });

  test('no modals open without query parameters on game page', async ({ page }) => {
    console.log('Testing: Game page with no query parameters (baseline)...');

    const gameId = await setupGame(page);

    // Navigate to game without query parameters
    await page.goto(`${BASE_URL}/game/${gameId}`);
    await page.waitForLoadState('networkidle');

    // Wait to ensure no auto-open happens
    await page.waitForTimeout(1000);

    // Verify modal containers are empty
    const modalContainer = page.locator('#modal-container');
    const cardModalContainer = page.locator('#card-modal-container');

    await expect(modalContainer).toBeEmpty();
    await expect(cardModalContainer).toBeEmpty();

    console.log('SUCCESS: No modals auto-opened without query parameters');
  });
});

test.describe('Query Parameter Modal Auto-Opening - Prep Page', () => {

  test('opens card modal with ?openCard=N on prep page', async ({ page }) => {
    console.log('Testing: Prep page ?openCard=N parameter...');

    const prepId = await setupPrep(page);
    console.log(`Prep ID: ${prepId}`);

    // Navigate to prep with ?openCard=0 query parameter
    await page.goto(`${BASE_URL}/prepare/${prepId}?openCard=0`);
    await page.waitForLoadState('networkidle');

    // Wait for the auto-open to trigger
    await page.waitForTimeout(1000);

    // Verify card modal container is populated
    const cardModalContainer = page.locator('#card-modal-container');
    await expect(cardModalContainer).not.toBeEmpty({ timeout: 5000 });

    // Verify the modal content is visible
    const cardModal = page.locator('.card-modal-overlay');
    await expect(cardModal).toBeVisible({ timeout: 5000 });

    console.log('SUCCESS: Card modal auto-opened on prep page with ?openCard=0');
  });

  test('opens library modal with ?openLibrary=true on prep page', async ({ page }) => {
    console.log('Testing: Prep page ?openLibrary=true parameter...');

    const prepId = await setupPrep(page);

    // Navigate to prep with ?openLibrary=true query parameter
    await page.goto(`${BASE_URL}/prepare/${prepId}?openLibrary=true`);
    await page.waitForLoadState('networkidle');

    // Wait for the auto-open to trigger
    await page.waitForTimeout(1000);

    // Verify modal container is populated
    const modalContainer = page.locator('#modal-container');
    await expect(modalContainer).not.toBeEmpty({ timeout: 5000 });

    // Verify library modal content is visible
    const libraryModal = page.locator('.modal-overlay');
    await expect(libraryModal).toBeVisible({ timeout: 5000 });

    console.log('SUCCESS: Library modal auto-opened on prep page with ?openLibrary=true');
  });

  test('opens library modal with card overlay using ?openLibrary=true&openCard=N on prep page', async ({ page }) => {
    console.log('Testing: Prep page ?openLibrary=true&openCard=N parameters...');

    const prepId = await setupPrep(page);

    // Navigate to prep with both parameters
    await page.goto(`${BASE_URL}/prepare/${prepId}?openLibrary=true&openCard=10`);
    await page.waitForLoadState('networkidle');

    // Wait for the auto-open to trigger
    await page.waitForTimeout(1500);

    // Verify library modal is open
    const modalContainer = page.locator('#modal-container');
    await expect(modalContainer).not.toBeEmpty({ timeout: 5000 });

    // Verify card modal is also open (overlaid)
    const cardModalContainer = page.locator('#card-modal-container');
    await expect(cardModalContainer).not.toBeEmpty({ timeout: 5000 });

    console.log('SUCCESS: Library modal with card overlay auto-opened on prep page');
  });

  test('no modals open without query parameters on prep page', async ({ page }) => {
    console.log('Testing: Prep page with no query parameters (baseline)...');

    const prepId = await setupPrep(page);

    // Navigate to prep without query parameters
    await page.goto(`${BASE_URL}/prepare/${prepId}`);
    await page.waitForLoadState('networkidle');

    // Wait to ensure no auto-open happens
    await page.waitForTimeout(1000);

    // Verify modal containers are empty
    const modalContainer = page.locator('#modal-container');
    const cardModalContainer = page.locator('#card-modal-container');

    await expect(modalContainer).toBeEmpty();
    await expect(cardModalContainer).toBeEmpty();

    console.log('SUCCESS: No modals auto-opened on prep page without query parameters');
  });
});
