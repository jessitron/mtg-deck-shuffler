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

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

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

    // .begin-button / .button-base / .pushable-flat come from site.css + styles.css:
    // the canonical box-shadow press physics (JES-155 choice 1), but the Big Fat CTA
    // keeps its own white fill + signature chunky light-pink border — it's not just a
    // scaled-up primary button.
    const beginButton = page.locator('.button-base.begin-button').first();
    await expect(beginButton).toBeVisible();
    const borderStyle = await beginButton.evaluate((el) => getComputedStyle(el).borderTopStyle);
    expect(borderStyle).toBe('solid');
    const beginBg = await beginButton.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(beginBg).toBe('rgb(255, 255, 255)');

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

  test('the canonical button travels when pressed', async ({ page }) => {
    await page.goto(`${BASE_URL}/design`);
    await page.waitForLoadState('networkidle');

    // JES-155 choice 1 (.pushable-flat): the button itself moves, via box-shadow
    // + transform — no nested spans.
    const flat = page.locator('.pushable-flat').first();
    await expect(flat).toBeVisible();

    // Scroll into view BEFORE measuring — hover() scrolls, and a pre-scroll
    // bounding box isn't comparable to a post-scroll one.
    await flat.scrollIntoViewIfNeeded();
    await flat.hover();
    const flatHovering = (await flat.boundingBox())!;

    await page.mouse.down();
    // The press transition is 34ms; give it room to settle.
    await expect(async () => {
      const pressed = (await flat.boundingBox())!;
      expect(pressed.y).toBeGreaterThan(flatHovering.y);
    }).toPass({ timeout: 2000 });
    await page.mouse.up();
  });

  test('the global focus ring reaches the keyboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/design`);
    await page.waitForLoadState('networkidle');

    // shuffler-design-choices choice 5: one global :focus-visible rule in
    // styles.css — 3px light-pink at 3px offset — replacing the app's single
    // plain :focus and two `outline: none` regressions.
    //
    // Asserted on the #focus specimens, which carry only real app classes (no
    // candidate class), so the ring can only be coming from the global rule.
    // .focus() rather than keyboard.press('Tab'): Chromium matches
    // :focus-visible on programmatic focus, and the candidate-ring test this
    // replaced relied on the same behaviour. If it ever flakes, tab to the
    // element — don't weaken the CSS to a plain :focus.
    for (const selector of ['#focus .pushable-flat', '#focus .group-by-type-toggle']) {
      const el = page.locator(selector).first();
      await expect(el).toBeVisible();
      await el.focus();

      // Poll rather than read once: .group-by-type-toggle (playmat.css) carries
      // `transition: all 0.2s ease`, and outline-width animates, so an immediate
      // read catches the ring part-way in (1px) and looks like a missing rule.
      await expect(async () => {
        const ring = await el.evaluate((node) => {
          const s = getComputedStyle(node);
          return { width: s.outlineWidth, color: s.outlineColor, offset: s.outlineOffset };
        });
        expect(ring.width, `${selector} outline width`).toBe('3px');
        expect(ring.color, `${selector} outline color is --light-pink`).toBe('rgb(221, 199, 221)');
        expect(ring.offset, `${selector} outline offset`).toBe('3px');
      }).toPass({ timeout: 2000 });
    }
  });
});
