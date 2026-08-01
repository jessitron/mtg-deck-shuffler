/**
 * End-to-End Verification: the /design gallery
 *
 * The gallery's whole value is that it renders specimens with the *app's own*
 * stylesheets, so it cannot drift from the app. These tests protect that: every
 * stylesheet it declares must actually load, and the specimens must pick up real
 * app rules (not gallery chrome). They also check that the candidate buttons
 * really animate, since "does it feel good to press" is the decision the page
 * exists to support.
 *
 * RUN: npm run test:verify
 *
 * The test script automatically starts and stops the server on port 3001.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

// The app stylesheets the gallery must render its specimens with. If a page adds
// a new stylesheet, add it here and to views/design.ejs.
const APP_STYLESHEETS = [
  '/styles.css',
  '/site.css',
  '/playmat.css',
  '/game.css',
  '/prepare.css',
  '/deck-selection.css',
];

test.describe('design gallery', () => {
  test('loads every app stylesheet successfully', async ({ page }) => {
    const cssResponses = new Map<string, number>();

    page.on('response', (response) => {
      const url = new URL(response.url());
      if (url.pathname.endsWith('.css')) {
        cssResponses.set(url.pathname, response.status());
      }
    });

    await page.goto(`${BASE_URL}/design`);
    await page.waitForLoadState('networkidle');

    for (const href of [...APP_STYLESHEETS, '/design-candidates.css', '/design-gallery.css']) {
      expect(cssResponses.get(href), `${href} should have been requested`).toBeDefined();
      expect(cssResponses.get(href), `${href} should load`).toBe(200);
    }
  });

  test('specimens are styled by the real app CSS, not by the gallery', async ({ page }) => {
    await page.goto(`${BASE_URL}/design`);
    await page.waitForLoadState('networkidle');

    // .mtg-card-image is defined in styles.css — the card unit the whole layout
    // is built on. If this drifts, the gallery is lying about the app.
    const cardBack = page.locator('.library-stack .mtg-card-image').first();
    await expect(cardBack).toBeVisible();
    const box = await cardBack.boundingBox();
    expect(box?.width).toBeCloseTo(200, 0);
    expect(box?.height).toBeCloseTo(278, 0);

    // .begin-button / .button-base come from site.css, including the signature
    // 10px outset bevel.
    const beginButton = page.locator('.button-base.begin-button').first();
    await expect(beginButton).toBeVisible();
    const borderStyle = await beginButton.evaluate((el) => getComputedStyle(el).borderTopStyle);
    expect(borderStyle).toBe('outset');

    // .library-buttons button comes from playmat.css: white on black.
    const drawButton = page.locator('.library-buttons .draw-button').first();
    await expect(drawButton).toBeVisible();
    const bg = await drawButton.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe('rgb(0, 0, 0)');
  });

  test('shows each section that needs a decision', async ({ page }) => {
    await page.goto(`${BASE_URL}/design`);
    await page.waitForLoadState('networkidle');

    for (const id of ['color', 'type', 'geometry', 'buttons', 'focus', 'inputs', 'surfaces', 'cards', 'rules']) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }

    // Every "choose one" block must offer at least two options to choose between.
    const choices = page.locator('.choice');
    const choiceCount = await choices.count();
    expect(choiceCount).toBeGreaterThan(0);

    for (let i = 0; i < choiceCount; i++) {
      const options = choices.nth(i).locator('.option');
      expect(await options.count(), `choice ${i} should offer 2+ options`).toBeGreaterThanOrEqual(2);
    }
  });

  test('both candidate buttons travel when pressed', async ({ page }) => {
    await page.goto(`${BASE_URL}/design`);
    await page.waitForLoadState('networkidle');

    // Candidate B — the faithful pushable: the .front span is what moves.
    const pushable = page.locator('.pushable').first();
    const pushableFront = pushable.locator('.front');
    await expect(pushableFront).toBeVisible();

    // Scroll into view BEFORE measuring — hover() scrolls, and a pre-scroll
    // bounding box isn't comparable to a post-scroll one.
    await pushable.scrollIntoViewIfNeeded();
    await pushable.hover();
    const frontHovering = (await pushableFront.boundingBox())!;

    await page.mouse.down();
    // Comeau's press transition is 34ms; give it room to settle.
    await expect(async () => {
      const pressed = (await pushableFront.boundingBox())!;
      expect(pressed.y).toBeGreaterThan(frontHovering.y);
    }).toPass({ timeout: 2000 });
    await page.mouse.up();

    // Candidate C — the drop-in: the button itself moves.
    const flat = page.locator('.pushable-flat').first();
    await expect(flat).toBeVisible();

    await flat.scrollIntoViewIfNeeded();
    await flat.hover();
    const flatHovering = (await flat.boundingBox())!;

    await page.mouse.down();
    await expect(async () => {
      const pressed = (await flat.boundingBox())!;
      expect(pressed.y).toBeGreaterThan(flatHovering.y);
    }).toPass({ timeout: 2000 });
    await page.mouse.up();
  });

  test('candidate focus rings are visible to the keyboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/design`);
    await page.waitForLoadState('networkidle');

    for (const cls of ['candidate-focus-dark-pink', 'candidate-focus-light-pink', 'candidate-focus-double']) {
      const button = page.locator(`.${cls}`).first();
      await button.focus();
      const outlineWidth = await button.evaluate((el) => getComputedStyle(el).outlineWidth);
      expect(outlineWidth, `${cls} should draw a focus outline`).toBe('3px');
    }
  });
});
