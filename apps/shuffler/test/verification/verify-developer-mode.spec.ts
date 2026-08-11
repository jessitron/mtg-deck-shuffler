
import { test, expect } from '@playwright/test';
import { seedGame } from './seedGame.js';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

test.setTimeout(90000);

async function setupGame(page: any): Promise<string> {
  const gameId = await seedGame(page);
  await page.goto(`${BASE_URL}/game/${gameId}`);
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

    await setupGame(page);

    // Draw a card to trigger a #game-container swap.
    await page.locator('button.draw-button').click();

    await expect(page.locator('body')).toHaveClass(/dev-mode/);
    await page.locator('#menu-toggle').click();
    await expect(page.locator('#game-menu-panel')).toHaveCSS('opacity', '1');
    await expect(page.locator('.menu-debug')).toBeVisible();

    console.log('SUCCESS: dev mode survives swaps');
  });

  test('Exit dev mode link returns to normal', async ({ page }) => {
    await page.goto(`${BASE_URL}/dontdie`);

    await setupGame(page);
    await expect(page.locator('body')).toHaveClass(/dev-mode/);

    await page.locator('#menu-toggle').click();
    await expect(page.locator('#game-menu-panel')).toHaveCSS('opacity', '1');

    await page.locator('.exit-dev-mode').click();

    // Back on a game page (redirected via referer), no longer in dev mode.
    await expect(page.locator('body')).not.toHaveClass(/dev-mode/);

    await page.locator('#menu-toggle').click();
    await expect(page.locator('#game-menu-panel')).toHaveCSS('opacity', '1');
    await expect(page.locator('.menu-debug')).not.toBeVisible();

    console.log('SUCCESS: exit dev mode link works');
  });
});
