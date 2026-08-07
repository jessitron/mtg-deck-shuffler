/**
 * End-to-End Verification: Query Parameter Modal Auto-Opening
 *
 * This spec proves the *mechanism* end-to-end on both pages: a query param
 * reaches modal-query-params.js and results in a real htmx request that
 * actually opens a modal in the browser. It does not enumerate every
 * parameter and combination — that table (?openLibrary, ?openTable,
 * ?openHistory, ?openDebug, and the combinations) is covered fast and
 * without a browser by test/modal-query-params.test.ts, which exercises the
 * same source file's decision logic directly. See
 * .scratch/verify-suite-speed/issues/04-which-tests-are-superfluous.md.
 *
 * RUN: npm run test:verify
 */

import { test, expect } from '@playwright/test';
import { seedGame, seedPrep } from './seedGame.js';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

// Increase timeout for these tests
test.setTimeout(90000);

/**
 * Setup helper: Creates a game and returns the gameId
 */
async function setupGame(page: any): Promise<string> {
  return seedGame(page);
}

/**
 * Setup helper: Creates a prep and returns the prepId
 */
async function setupPrep(page: any): Promise<string> {
  return seedPrep(page);
}

test.describe('Query Parameter Modal Auto-Opening - Game Page', () => {

  test('opens card modal with ?openCard=N on game page', async ({ page }) => {
    console.log('Testing: Game page ?openCard=N parameter...');

    const gameId = await setupGame(page);
    console.log(`Game ID: ${gameId}`);

    // Navigate to game with ?openCard=0 query parameter
    await page.goto(`${BASE_URL}/game/${gameId}?openCard=0`);

    // Verify card modal container is populated
    const cardModalContainer = page.locator('#card-modal-container');
    await expect(cardModalContainer).not.toBeEmpty({ timeout: 5000 });

    // Verify the modal content is visible
    const cardModal = page.locator('.card-modal-overlay');
    await expect(cardModal).toBeVisible({ timeout: 5000 });

    console.log('SUCCESS: Card modal auto-opened with ?openCard=0');
  });

  test('no modals open without query parameters on game page', async ({ page }) => {
    console.log('Testing: Game page with no query parameters (baseline)...');

    const gameId = await setupGame(page);

    // Navigate to game without query parameters
    await page.goto(`${BASE_URL}/game/${gameId}`);

    // Proving a negative needs care: toBeEmpty() would pass instantly even if a
    // modal were about to open. It's sound here without a sleep because
    // modal-query-params.js decides SYNCHRONOUSLY in its DOMContentLoaded
    // handler and returns early when there are no params — and page.goto()
    // resolves on 'load', which is after DOMContentLoaded. So the decision has
    // already been made and cannot change. Anchor on rendered content first, so
    // this can't pass merely because the page never arrived.
    await expect(page.locator('.playmat-game')).toBeVisible();

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

    // Verify card modal container is populated
    const cardModalContainer = page.locator('#card-modal-container');
    await expect(cardModalContainer).not.toBeEmpty({ timeout: 5000 });

    // Verify the modal content is visible
    const cardModal = page.locator('.card-modal-overlay');
    await expect(cardModal).toBeVisible({ timeout: 5000 });

    console.log('SUCCESS: Card modal auto-opened on prep page with ?openCard=0');
  });

  test('prep card modal shows navigation arrows for library cards', async ({ page }) => {
    console.log('Testing: Prep card modal navigation arrows for library cards...');

    const prepId = await setupPrep(page);

    // Open a library card (card index after commanders, e.g., index 10 should be in library)
    // Commanders are typically indices 0-1, library starts after
    await page.goto(`${BASE_URL}/prepare/${prepId}?openCard=10`);

    // Verify card modal is open
    const cardModal = page.locator('.card-modal-overlay');
    await expect(cardModal).toBeVisible({ timeout: 5000 });

    // Verify navigation arrows are present (library cards should have prev/next)
    const prevButton = page.locator('.card-modal-nav-prev');
    const nextButton = page.locator('.card-modal-nav-next');

    // Card 10 in the library should have both prev and next
    await expect(prevButton).toBeVisible({ timeout: 5000 });
    await expect(nextButton).toBeVisible({ timeout: 5000 });

    console.log('SUCCESS: Prep card modal shows navigation arrows for library cards');
  });

  test('prep card modal navigation works - can click through cards', async ({ page }) => {
    console.log('Testing: Prep card modal navigation clicking...');

    const prepId = await setupPrep(page);

    // Open a library card in the middle of the deck
    await page.goto(`${BASE_URL}/prepare/${prepId}?openCard=10`);

    const cardModal = page.locator('.card-modal-overlay');
    await expect(cardModal).toBeVisible({ timeout: 5000 });

    // Get the initial card title
    const cardTitle = page.locator('.card-modal-title');
    const initialTitle = (await cardTitle.textContent()) ?? '';

    // The nav arrows are plain hx-get into #card-modal-container. A click at
    // Playwright speed can put its mousedown on a node htmx is about to replace
    // and its mouseup on the replacement, so no click event fires at all.
    // Retry the click until the title actually changes.
    const nextButton = page.locator('.card-modal-nav-next');
    await expect(nextButton).toBeVisible({ timeout: 5000 });
    await expect(async () => {
      await nextButton.click();
      await expect(cardTitle).not.toHaveText(initialTitle, { timeout: 3000 });
    }).toPass({ timeout: 20000 });

    // Click prev button to go back
    const prevButton = page.locator('.card-modal-nav-prev');
    await expect(prevButton).toBeVisible({ timeout: 5000 });
    await expect(async () => {
      await prevButton.click();
      await expect(cardTitle).toHaveText(initialTitle, { timeout: 3000 });
    }).toPass({ timeout: 20000 });

    console.log('SUCCESS: Prep card modal navigation clicking works');
  });
});
