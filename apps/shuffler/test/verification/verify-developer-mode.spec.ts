/**
 * End-to-End Verification: Developer Mode
 *
 * Developer mode is an undocumented toggle. Hitting the secret URL /dontdie
 * sets a cookie; from then on the game page renders <body class="dev-mode">
 * and the debug info inside the hamburger menu (the .menu-debug block:
 * game id, state version, tab id, State button) becomes visible. Without the
 * cookie that debug block is hidden via CSS. An "Exit dev mode" link inside
 * the menu clears the cookie and returns to normal.
 *
 * RUN: npm run test:verify
 *
 * The test script automatically starts and stops the server on port 3001.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

test.setTimeout(90000);

function extractGameId(url: string): string | null {
  const match = url.match(/\/game\/(\d+)/);
  return match ? match[1] : null;
}

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

test.describe('Developer Mode', () => {

  test('debug info is hidden by default (no dev mode cookie)', async ({ page }) => {
    await setupGame(page);

    await expect(page.locator('body')).not.toHaveClass(/dev-mode/);

    // Open the menu, then assert the debug block is not shown.
    await page.locator('#menu-toggle').click();
    await expect(page.locator('#game-menu-panel')).toHaveCSS('opacity', '1');

    await expect(page.locator('.menu-debug')).not.toBeVisible();

    console.log('SUCCESS: debug info hidden without dev mode');
  });

  test('hitting /dontdie reveals debug info in the menu', async ({ page }) => {
    // Enter dev mode via the secret URL, then start a game.
    await page.goto(`${BASE_URL}/dontdie`);
    await page.waitForLoadState('networkidle');

    await setupGame(page);

    await expect(page.locator('body')).toHaveClass(/dev-mode/);

    await page.locator('#menu-toggle').click();
    await expect(page.locator('#game-menu-panel')).toHaveCSS('opacity', '1');

    // The debug block and the exit link are now visible.
    await expect(page.locator('.menu-debug')).toBeVisible();
    await expect(page.locator('.menu-debug .game-id')).toBeVisible();
    await expect(page.locator('.exit-dev-mode')).toBeVisible();

    console.log('SUCCESS: dev mode reveals debug info');
  });

  test('debug info survives a game-state swap while in dev mode', async ({ page }) => {
    await page.goto(`${BASE_URL}/dontdie`);
    await page.waitForLoadState('networkidle');

    await setupGame(page);

    // Draw a card to trigger a #game-container swap.
    await page.locator('button.draw-button').click();
    await page.waitForTimeout(800);

    await expect(page.locator('body')).toHaveClass(/dev-mode/);
    await page.locator('#menu-toggle').click();
    await expect(page.locator('#game-menu-panel')).toHaveCSS('opacity', '1');
    await expect(page.locator('.menu-debug')).toBeVisible();

    console.log('SUCCESS: dev mode survives swaps');
  });

  test('Exit dev mode link returns to normal', async ({ page }) => {
    await page.goto(`${BASE_URL}/dontdie`);
    await page.waitForLoadState('networkidle');

    await setupGame(page);
    await expect(page.locator('body')).toHaveClass(/dev-mode/);

    await page.locator('#menu-toggle').click();
    await expect(page.locator('#game-menu-panel')).toHaveCSS('opacity', '1');

    await page.locator('.exit-dev-mode').click();
    await page.waitForLoadState('networkidle');

    // Back on a game page (redirected via referer), no longer in dev mode.
    await expect(page.locator('body')).not.toHaveClass(/dev-mode/);

    await page.locator('#menu-toggle').click();
    await expect(page.locator('#game-menu-panel')).toHaveCSS('opacity', '1');
    await expect(page.locator('.menu-debug')).not.toBeVisible();

    console.log('SUCCESS: exit dev mode link works');
  });
});
