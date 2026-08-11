
import { test, expect } from '@playwright/test';
import { seedGame } from './seedGame.js';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

test.setTimeout(90000);

async function setupGame(page: any): Promise<string> {
  const gameId = await seedGame(page);
  await page.goto(`${BASE_URL}/game/${gameId}`);
  return gameId;
}

test.describe('Game Hamburger Menu', () => {

  test('game controls live in a hamburger menu, hidden until toggled', async ({ page }) => {
    await setupGame(page);

    const toggle = page.locator('#menu-toggle');
    await expect(toggle).toBeVisible({ timeout: 5000 });

    const panel = page.locator('#game-menu-panel');
    await expect(panel).toHaveCSS('opacity', '0');

    await toggle.click();
    await expect(panel).toHaveCSS('opacity', '1', { timeout: 5000 });

    // The menu houses the relocated controls.
    await expect(panel.locator('button:has-text("Action History")')).toBeVisible();
    await expect(panel.locator('button:has-text("Restart Game")')).toBeVisible();
    await expect(panel.getByText('Choose Another Deck')).toBeVisible();
    await expect(panel.locator('.game-id')).not.toBeVisible();

    console.log('SUCCESS: game controls are inside the hamburger menu');
  });

  test('menu stays open across a swap triggered from inside it (undo)', async ({ page }) => {
    await setupGame(page);

    await page.locator('button.draw-button').click();

    await page.locator('#menu-toggle').click();
    const panel = page.locator('#game-menu-panel');
    await expect(panel).toHaveCSS('opacity', '1');

    await panel.locator('.undo-button').click();

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

    await expect(panel).toHaveCSS('opacity', '0');

    console.log('SUCCESS: clicking outside dismisses the menu');
  });

  test('Ctrl/Cmd+Z undoes the most recent action', async ({ page }) => {
    await setupGame(page);

    const handCount = page.locator('.hand-count');
    const before = parseInt((await handCount.textContent()) ?? '0', 10);

    await page.locator('button.draw-button').click();
    await expect(handCount).toHaveText(String(before + 1));

    await expect(async () => {
      if ((await handCount.textContent()) === String(before)) return;
      await page.keyboard.press('ControlOrMeta+z');
      await expect(handCount).toHaveText(String(before), { timeout: 3000 });
    }).toPass({ timeout: 20000 });

    console.log('SUCCESS: Ctrl/Cmd+Z undid the draw');
  });
});
