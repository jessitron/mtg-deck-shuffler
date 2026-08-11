
import { test, expect, Page } from '@playwright/test';
import { seedPrep } from './seedGame.js';
import { sleeveQuickPicksForPlaymat, colorsForPlaymat, luminance, DEFAULT_PLAYMAT_PATH } from '../../src/table-look.js';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

test.setTimeout(90000);

const DEFAULT_MAT = '/images/playmats/aeoe-41-terrasymbiosis.png';
const OTHER_MAT = '/images/playmats/aeoe-6-seam-rip.png';

const DEFAULT_QUICK_PICKS = sleeveQuickPicksForPlaymat(DEFAULT_PLAYMAT_PATH);
const QUICK_PICK = DEFAULT_QUICK_PICKS[0].hex;
const OTHER_MAT_QUICK_PICK = sleeveQuickPicksForPlaymat(OTHER_MAT)[0].hex;

// The command-zone/deck-title backgrounds are tinted by colorsForPlaymat's resolved
// secondaryColor, not the raw sleeve hex — resolve what a given sleeve pick against the
// default mat actually renders as.
function resolvedSecondaryFor(sleeveHex: string | undefined): string {
  return colorsForPlaymat(DEFAULT_PLAYMAT_PATH, sleeveHex).secondaryColor;
}

function isDarkHex(hex: string): boolean {
  return luminance(hex) < 128;
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

// The default mat's own chosenTwo pair happens to be two dark colors, so no sleeve pick
// against it ever resolves to a light secondaryColor — the dark/light lettering test needs
// a mat whose curated pair actually spans both, so it targets OTHER_MAT instead.
const OTHER_MAT_QUICK_PICKS = sleeveQuickPicksForPlaymat(OTHER_MAT);
function resolvedSecondaryForOtherMat(sleeveHex: string | undefined): string {
  return colorsForPlaymat(OTHER_MAT, sleeveHex).secondaryColor;
}
const darkPick = OTHER_MAT_QUICK_PICKS.find((p) => isDarkHex(resolvedSecondaryForOtherMat(p.hex)));
const lightPick = OTHER_MAT_QUICK_PICKS.find((p) => !isDarkHex(resolvedSecondaryForOtherMat(p.hex)));
if (!darkPick || !lightPick) {
  throw new Error(
    `OTHER_MAT's quick-picks (${OTHER_MAT_QUICK_PICKS.map((p) => p.hex).join(', ')}), resolved against its ` +
      "chosenTwo, need at least one dark and one light secondaryColor for the dark/light lettering test to mean anything."
  );
}

// For the "None clears the sleeve" test to mean anything, the sleeved tint must actually
// differ from the no-sleeve default — not every quick pick's resolved secondaryColor does.
const noSleeveSecondary = resolvedSecondaryFor(undefined);
const pickThatChangesTint = DEFAULT_QUICK_PICKS.find((p) => resolvedSecondaryFor(p.hex) !== noSleeveSecondary);
if (!pickThatChangesTint) {
  throw new Error(
    `None of the default playmat's quick-picks (${DEFAULT_QUICK_PICKS.map((p) => p.hex).join(', ')}) resolve to a ` +
      "secondaryColor different from the no-sleeve default — the clear-sleeve test needs one that does."
  );
}

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

// Each swatch fires an independent htmx POST to /prep-table-look/:prepId, outerHTML-swapping
// the panel. Clicking a second swatch immediately after the first can race the swap — the
// second click's target may not have its listener attached yet, silently dropping the click.
// Waiting for the network to go idle (not just for the "selected" class to appear) is what
// reliably clears that race.
async function clickSwatchAndSettle(page: Page, locator: ReturnType<typeof matSwatch>): Promise<void> {
  await locator.click();
  await page.waitForLoadState('networkidle');
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
    const tint = hexToRgb(resolvedSecondaryFor(QUICK_PICK));

    await sleeveSwatch(page, QUICK_PICK).click();

    // Live preview: command-zone surround and deck-title plaque take the resolved tint
    await expect(page.locator('.cool-command-zone-surround')).toHaveCSS('background-color', tint);
    await expect(page.locator('.game-title')).toHaveCSS('background-color', tint);

    // Captured: reload shows the chip selected and the tint re-applied
    await page.goto(`${BASE_URL}/prepare/${prepId}`);
    await expect(sleeveSwatch(page, QUICK_PICK)).toHaveClass(/table-look-selected/);
    await expect(page.locator('.game-title')).toHaveCSS('background-color', tint);
  });

  test('None is a valid choice: picking a color then None clears the sleeve', async ({ page }) => {
    const prepId = await gotoPrep(page);
    const sleeveTint = hexToRgb(resolvedSecondaryFor(pickThatChangesTint.hex));
    const noSleeveTint = hexToRgb(noSleeveSecondary);

    await clickSwatchAndSettle(page, sleeveSwatch(page, pickThatChangesTint.hex));
    await expect(page.locator('.game-title')).toHaveCSS('background-color', sleeveTint);

    const noneLocator = page.locator('.table-look-panel [data-sleeve-color=""]');
    await clickSwatchAndSettle(page, noneLocator);
    await expect(page.locator('.game-title')).toHaveCSS('background-color', noSleeveTint);

    await page.goto(`${BASE_URL}/prepare/${prepId}`);
    await expect(page.locator('.table-look-panel [data-sleeve-color=""]')).toHaveClass(/table-look-selected/);
  });

  test('a dark sleeve color flips the deck-title lettering to white; a light one does not', async ({ page }) => {
    const prepId = await gotoPrep(page);

    // OTHER_MAT's curated pair spans dark and light; the default mat's does not.
    // Wait for each swap to land before the next click — otherwise the POSTs race.
    await clickSwatchAndSettle(page, matSwatch(page, OTHER_MAT));

    // A dark quick-pick → white lettering
    await clickSwatchAndSettle(page, sleeveSwatch(page, darkPick.hex));
    await expect(page.locator('.game-title')).toHaveCSS('color', 'rgb(255, 255, 255)');

    // Persists through the on-load tint path too
    await page.goto(`${BASE_URL}/prepare/${prepId}`);
    await expect(page.locator('.game-title')).toHaveCSS('color', 'rgb(255, 255, 255)');

    // A light quick-pick → lettering back to the default
    await clickSwatchAndSettle(page, sleeveSwatch(page, lightPick.hex));
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

    const customTint = hexToRgb(resolvedSecondaryFor('#8b2f5c'));
    await expect(page.locator('.game-title')).toHaveCSS('background-color', customTint);

    await page.goto(`${BASE_URL}/prepare/${prepId}`);
    await expect(page.locator('.table-look-panel .table-look-custom')).toHaveClass(/table-look-selected/);
    await expect(colorInput).toHaveValue('#8b2f5c');
    await expect(page.locator('.game-title')).toHaveCSS('background-color', customTint);
  });

  test('picking a mat or sleeve keeps keyboard focus on the equivalent swatch after the swap', async ({ page }) => {
    await gotoPrep(page);

    await matSwatch(page, OTHER_MAT).click();
    await expect(matSwatch(page, OTHER_MAT)).toBeFocused();

    await sleeveSwatch(page, OTHER_MAT_QUICK_PICK).click();
    await expect(sleeveSwatch(page, OTHER_MAT_QUICK_PICK)).toBeFocused();
  });

  test('typed table/player name survives a mat pick (unsaved text is not wiped by the swap)', async ({ page }) => {
    await gotoPrep(page);

    await page.locator('.join-table-summary').click();
    await page.locator('input[name="table-name"]').fill('Friday Night');
    await page.locator('input[name="player-name"]').fill('Jess');

    await matSwatch(page, OTHER_MAT).click();
    await expect(page.locator('.playmat')).toHaveCSS('background-image', new RegExp('aeoe-6-seam-rip'));

    await expect(page.locator('input[name="table-name"]')).toHaveValue('Friday Night');
    await expect(page.locator('input[name="player-name"]')).toHaveValue('Jess');
    await expect(page.locator('.join-table-details')).toHaveJSProperty('open', true);
  });
});
