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
  // The fleet's shared palette (@fleet/design-tokens), served by app.ts from the
  // workspace package. Every page loads it ahead of styles.css, and the swatches
  // in this gallery are describing ITS values — so if it 404s (the container
  // symlink trap), the gallery lies about the palette rather than losing it.
  '/fleet/tokens.css',
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

    for (const href of [...APP_STYLESHEETS, '/design-candidates.css', '/design-gallery.css']) {
      expect(cssResponses.get(href), `${href} should have been requested`).toBeDefined();
      expect(cssResponses.get(href), `${href} should load`).toBe(200);
    }
  });

  test('specimens are styled by the real app CSS, not by the gallery', async ({ page }) => {
    await page.goto(`${BASE_URL}/design`);

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

  test('the playmat specimen stages use the real .playmat class, not a lookalike', async ({ page }) => {
    await page.goto(`${BASE_URL}/design`);

    // design-playmat-specimen: `.stage-playmat` used to hand-copy the mat's art URL,
    // background-size/position and its own 3px border instead of inheriting the real
    // `.playmat` rule in playmat.css. These stages now carry `class="stage playmat"`
    // directly, so the art/border/no-shadow all have to come from the app's own rule.
    const stage = page.locator('.design-page .stage.playmat').first();
    await expect(stage).toBeVisible();

    const styles = await stage.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        backgroundImage: s.backgroundImage,
        backgroundSize: s.backgroundSize,
        borderTopStyle: s.borderTopStyle,
        borderTopColor: s.borderTopColor,
        borderTopWidth: s.borderTopWidth,
        boxShadow: s.boxShadow,
      };
    });

    // Art, cover sizing and border style/color come straight from the bare `.playmat`
    // rule in playmat.css — nothing here is redeclared by the gallery.
    expect(styles.backgroundImage).toContain('aeoe-43-cascading-cataracts.png');
    expect(styles.backgroundSize).toBe('cover');
    expect(styles.borderTopStyle).toBe('solid');
    expect(styles.borderTopColor).toBe('rgb(0, 0, 0)');
    // Only the width is thinned for the specimen's smaller scale — the real mat is
    // framed at 10px, this gallery box at 3px (design-gallery.css's own override).
    expect(styles.borderTopWidth).toBe('3px');
    // 2026-08-10: the game mat's drop shadow was removed on both play pages and never
    // came back. The shared `.playmat` rule carries none, and the gallery must not
    // reintroduce one locally.
    expect(styles.boxShadow).toBe('none');

    // prepare.css keys some placement rules on the bare `.playmat` class (the mat is
    // the domain object those things sit relative to) — `.playmat > .game-title`,
    // `.playmat .cool-command-zone-surround`, `.playmat .commander-placeholder`,
    // `.playmat .table-look-panel`. Those rules now reach /design too, since
    // prepare.css is loaded here and the real `.playmat` class is on the stage. The
    // gallery resets their align-self/margin so specimens keep the gallery's own
    // centered layout rather than picking up /prepare's page placement.
    const plaque = page.locator('#surfaces .stage.playmat .game-title');
    await expect(plaque).toBeVisible();
    const plaqueMargin = await plaque.evaluate((el) => getComputedStyle(el).marginBottom);
    expect(plaqueMargin).toBe('0px');

    const panel = page.locator('#table-look .stage.playmat .table-look-panel');
    await expect(panel).toBeVisible();
    const panelStyles = await panel.evaluate((el) => {
      const s = getComputedStyle(el);
      return { marginTop: s.marginTop, alignSelf: s.alignSelf };
    });
    expect(panelStyles.marginTop).toBe('0px');
    expect(panelStyles.alignSelf).toBe('auto');
  });

  test('the Tabletop sleeved-card mock renders a card centered in a sleeve frame', async ({ page }) => {
    await page.goto(`${BASE_URL}/design`);

    // table-layout ticket 17: face-up sleeve rendering is a card image inset
    // inside a square, sleeve-colored frame — no border-radius on the frame,
    // rounded corners only on the image inside.
    const frame = page.locator('#sleeved-card .card-mock-sleeved-face');
    await expect(frame).toBeVisible();
    const frameRadius = await frame.evaluate((el) => getComputedStyle(el).borderRadius);
    expect(frameRadius).toBe('0px');

    const img = frame.locator('img');
    await expect(img).toBeVisible();
    const imgRadius = await img.evaluate((el) => getComputedStyle(el).borderRadius);
    expect(imgRadius).not.toBe('0px');
  });

  test('the canonical button travels when pressed', async ({ page }) => {
    await page.goto(`${BASE_URL}/design`);

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

    // shuffler-design-choices choice 5: one global :focus-visible rule in
    // styles.css — 3px light-pink at 3px offset — replacing the app's single
    // plain :focus and three `outline: none` regressions.
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
