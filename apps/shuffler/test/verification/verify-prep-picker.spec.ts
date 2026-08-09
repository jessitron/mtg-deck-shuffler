/**
 * End-to-End Verification: the prep-screen table-look picker (ticket 16).
 *
 * One setup panel on /prepare: playmat swatches (curated aeoe-* art) and a
 * sleeve color row (None / mana pie / custom color input). Picks live-preview
 * on the page and persist into the prep immediately, so a reload — and later
 * the seat.joined send — sees them.
 *
 * RUN: npm run test:verify
 */

import { test, expect, Page } from '@playwright/test';
import { seedPrep } from './seedGame.js';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

test.setTimeout(90000);

const DEFAULT_MAT = '/images/aeoe-43-cascading-cataracts.png';
const OTHER_MAT = '/images/aeoe-6-seam-rip.png';
const FOREST_GREEN = '#2a8439'; // --mana-G quick pick

async function gotoPrep(page: Page): Promise<string> {
  const prepId = await seedPrep(page);
  await page.goto(`${BASE_URL}/prepare/${prepId}`);
  return prepId;
}

function matSwatch(page: Page, path: string) {
  return page.locator(`.table-look-panel [data-mat-path="${path}"]`);
}

function sleeveSwatch(page: Page, hex: string) {
  return page.locator(`.table-look-panel [data-sleeve-color="${hex}"]`);
}

test.describe('Prepare screen — table-look panel', () => {
  test('defaults: today\'s mat is selected, and no sleeve', async ({ page }) => {
    await gotoPrep(page);

    await expect(matSwatch(page, DEFAULT_MAT)).toHaveClass(/table-look-selected/);
    await expect(page.locator('.table-look-panel [data-sleeve-color=""]')).toHaveClass(/table-look-selected/);
  });

  test('picking a playmat previews live and persists across reload', async ({ page }) => {
    const prepId = await gotoPrep(page);

    await matSwatch(page, OTHER_MAT).click();

    // Live preview: the mat art on the page swaps
    await expect(page.locator('.playmat')).toHaveCSS('background-image', new RegExp('aeoe-6-seam-rip'));
    await expect(matSwatch(page, OTHER_MAT)).toHaveClass(/table-look-selected/);

    // Persisted: a fresh page load renders the pick from prep state
    await page.goto(`${BASE_URL}/prepare/${prepId}`);
    await expect(matSwatch(page, OTHER_MAT)).toHaveClass(/table-look-selected/);
    await expect(page.locator('.playmat')).toHaveCSS('background-image', new RegExp('aeoe-6-seam-rip'));
  });

  test('picking a sleeve color tints the page and is captured in prep state', async ({ page }) => {
    const prepId = await gotoPrep(page);

    await sleeveSwatch(page, FOREST_GREEN).click();

    // Live preview: command-zone surround and deck-title plaque take the tint
    await expect(page.locator('.cool-command-zone-surround')).toHaveCSS('background-color', 'rgb(42, 132, 57)');
    await expect(page.locator('.game-title')).toHaveCSS('background-color', 'rgb(42, 132, 57)');

    // Captured: reload shows the chip selected and the tint re-applied
    await page.goto(`${BASE_URL}/prepare/${prepId}`);
    await expect(sleeveSwatch(page, FOREST_GREEN)).toHaveClass(/table-look-selected/);
    await expect(page.locator('.game-title')).toHaveCSS('background-color', 'rgb(42, 132, 57)');
  });

  test('None is a valid choice: picking a color then None clears the sleeve', async ({ page }) => {
    const prepId = await gotoPrep(page);

    await sleeveSwatch(page, FOREST_GREEN).click();
    await expect(page.locator('.game-title')).toHaveCSS('background-color', 'rgb(42, 132, 57)');

    await page.locator('.table-look-panel [data-sleeve-color=""]').click();
    await expect(page.locator('.game-title')).not.toHaveCSS('background-color', 'rgb(42, 132, 57)');

    await page.goto(`${BASE_URL}/prepare/${prepId}`);
    await expect(page.locator('.table-look-panel [data-sleeve-color=""]')).toHaveClass(/table-look-selected/);
  });

  test('a dark sleeve color flips the deck-title lettering to white; a light one does not', async ({ page }) => {
    const prepId = await gotoPrep(page);

    // Swamp purple (#530aae) is dark → white lettering
    await sleeveSwatch(page, '#530aae').click();
    await expect(page.locator('.game-title')).toHaveCSS('color', 'rgb(255, 255, 255)');

    // Persists through the on-load tint path too
    await page.goto(`${BASE_URL}/prepare/${prepId}`);
    await expect(page.locator('.game-title')).toHaveCSS('color', 'rgb(255, 255, 255)');

    // Plains gold (#f0e68c) is light → lettering back to the default
    await sleeveSwatch(page, '#f0e68c').click();
    await expect(page.locator('.game-title')).not.toHaveCSS('color', 'rgb(255, 255, 255)');
  });

  test('the custom color input captures an arbitrary sleeve color', async ({ page }) => {
    const prepId = await gotoPrep(page);

    const colorInput = page.locator('.table-look-panel input[type="color"]');
    await colorInput.evaluate((el: HTMLInputElement) => {
      el.value = '#8b2f5c';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await expect(page.locator('.game-title')).toHaveCSS('background-color', 'rgb(139, 47, 92)');

    await page.goto(`${BASE_URL}/prepare/${prepId}`);
    await expect(page.locator('.table-look-panel .table-look-custom')).toHaveClass(/table-look-selected/);
    await expect(colorInput).toHaveValue('#8b2f5c');
    await expect(page.locator('.game-title')).toHaveCSS('background-color', 'rgb(139, 47, 92)');
  });
});
