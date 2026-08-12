import { test, expect, Page } from '@playwright/test';
import { seedPrep, startGame } from './seedGame.js';
import { colorsForPlaymat, luminance } from '../../src/table-look.js';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

test.setTimeout(90000);

const MAT = '/images/playmats/aeoe-6-seam-rip.png';
const SLEEVE = '#5070b0';
const { primaryColor, secondaryColor } = colorsForPlaymat(MAT, SLEEVE);
const textOnPrimary = luminance(primaryColor) < 128 ? 'white' : 'black';

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

async function seedSleevedGame(page: Page): Promise<string> {
  const prepId = await seedPrep(page);
  await page.request.post(`${BASE_URL}/prep-table-look/${prepId}`, {
    form: { 'playmat-path': MAT },
  });
  await page.request.post(`${BASE_URL}/prep-table-look/${prepId}`, {
    form: { 'sleeve-color': SLEEVE },
  });
  return startGame(page, prepId);
}

test.describe('/game buttons use the seat\'s resolved colors', () => {
  test('hamburger toggle and library buttons render with the seat\'s primary color', async ({ page }) => {
    const gameId = await seedSleevedGame(page);
    await page.goto(`${BASE_URL}/game/${gameId}`);

    await expect(page.locator('#menu-toggle')).toHaveCSS('background-color', hexToRgb(primaryColor));
    await expect(page.locator('.draw-button')).toHaveCSS('background-color', hexToRgb(primaryColor));
    await expect(page.locator('.draw-button')).toHaveCSS('color', textOnPrimary === 'white' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)');
  });

  test('Cards on table button renders with the seat\'s primary color', async ({ page }) => {
    const gameId = await seedSleevedGame(page);
    await page.goto(`${BASE_URL}/game/${gameId}`);

    await expect(page.locator('.table-cards-button')).toHaveCSS('background-color', hexToRgb(primaryColor));
  });

  test('menu panel history button renders with the seat\'s secondary color', async ({ page }) => {
    const gameId = await seedSleevedGame(page);
    await page.goto(`${BASE_URL}/game/${gameId}`);

    await page.locator('#menu-toggle').click();
    await expect(page.locator('.history-button')).toHaveCSS('background-color', hexToRgb(secondaryColor));
  });

  test('Restart/Choose-Deck/Home stay on the fixed dark chrome — not seat colors', async ({ page }) => {
    const gameId = await seedSleevedGame(page);
    await page.goto(`${BASE_URL}/game/${gameId}`);

    await page.locator('#menu-toggle').click();
    const restartButton = page.locator('.end-game-actions button');
    await expect(restartButton).not.toHaveCSS('background-color', hexToRgb(primaryColor));
    await expect(restartButton).not.toHaveCSS('background-color', hexToRgb(secondaryColor));
  });

  test('an unsleeved game on the default mat still gets a resolved (non-fallback-broken) color', async ({ page }) => {
    const prepId = await seedPrep(page);
    const gameId = await startGame(page, prepId);
    await page.goto(`${BASE_URL}/game/${gameId}`);

    const bg = await page.locator('#menu-toggle').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    expect(bg).not.toBe('');
  });
});
