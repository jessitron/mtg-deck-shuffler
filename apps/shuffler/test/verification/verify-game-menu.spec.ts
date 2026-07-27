/**
 * End-to-End Verification: Game Hamburger Menu
 *
 * The game screen's chrome — Undo, Action History, Restart Game,
 * Choose Another Deck, and the debug/game-state block — lives in a
 * hamburger menu at the top, hidden until toggled open. Undo also has a
 * standard Ctrl/Cmd+Z hotkey.
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

test.describe('Game Hamburger Menu', () => {

  test('game controls live in a hamburger menu, hidden until toggled', async ({ page }) => {
    await setupGame(page);

    const toggle = page.locator('#menu-toggle');
    await expect(toggle).toBeVisible({ timeout: 5000 });

    const panel = page.locator('#game-menu-panel');
    // The panel stays in the layout (display: flex) and is hidden via
    // opacity/pointer-events, so Playwright reports it as "visible". Assert
    // on opacity to capture whether it's actually shown to the player.
    await expect(panel).toHaveCSS('opacity', '0');

    await toggle.click();
    await expect(panel).toHaveCSS('opacity', '1', { timeout: 5000 });

    // The menu houses the relocated controls.
    await expect(panel.locator('button:has-text("Action History")')).toBeVisible();
    await expect(panel.locator('button:has-text("Restart Game")')).toBeVisible();
    // "Choose Another Deck" is an <a>, not a <button> — it navigates away rather
    // than acting on the game. Match on the text, not the element, since which
    // one it is doesn't matter to the player.
    await expect(panel.getByText('Choose Another Deck')).toBeVisible();
    // The debug block (.game-id et al.) is now gated behind developer mode,
    // so it is hidden here. See verify-developer-mode.spec.ts.
    await expect(panel.locator('.game-id')).not.toBeVisible();

    console.log('SUCCESS: game controls are inside the hamburger menu');
  });

  test('menu stays open across a swap triggered from inside it (undo)', async ({ page }) => {
    await setupGame(page);

    // Draw a card so there is something to undo. (Clicking the draw button,
    // which is outside the menu, also dismisses the menu — standard
    // click-outside behavior — so we draw first, then open the menu.)
    await page.locator('button.draw-button').click();
    await page.waitForTimeout(800);

    await page.locator('#menu-toggle').click();
    const panel = page.locator('#game-menu-panel');
    await expect(panel).toHaveCSS('opacity', '1');

    // Undo from inside the menu triggers a #game-container swap. The menu lives
    // inside that swapped region, so it should re-open itself after the swap.
    await panel.locator('.undo-button').click();
    await page.waitForTimeout(800);

    await expect(panel).toHaveCSS('opacity', '1');

    console.log('SUCCESS: menu open state survives a swap triggered from inside the menu');
  });

  test('clicking outside the open menu dismisses it', async ({ page }) => {
    await setupGame(page);

    await page.locator('#menu-toggle').click();
    const panel = page.locator('#game-menu-panel');
    await expect(panel).toHaveCSS('opacity', '1');

    // The draw button is outside the menu — clicking it should close the menu.
    await page.locator('button.draw-button').click();
    await page.waitForTimeout(800);

    await expect(panel).toHaveCSS('opacity', '0');

    console.log('SUCCESS: clicking outside dismisses the menu');
  });

  test('Ctrl/Cmd+Z undoes the most recent action', async ({ page }) => {
    await setupGame(page);

    const handCount = page.locator('.hand-count');
    const before = parseInt((await handCount.textContent()) ?? '0', 10);

    await page.locator('button.draw-button').click();
    await page.waitForTimeout(800);
    await expect(handCount).toHaveText(String(before + 1));

    // Standard undo hotkey (Ctrl on Linux/Win, Meta on Mac).
    await page.keyboard.press('ControlOrMeta+z');
    await page.waitForTimeout(800);

    await expect(handCount).toHaveText(String(before));

    console.log('SUCCESS: Ctrl/Cmd+Z undid the draw');
  });
});
