
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

const APP_STYLESHEETS = [
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

    const cardBack = page.locator('.library-stack .mtg-card-image').first();
    await expect(cardBack).toBeVisible();
    const box = await cardBack.boundingBox();
    expect(box?.width).toBeCloseTo(200, 0);
    expect(box?.height).toBeCloseTo(278, 0);

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

    expect(styles.backgroundImage).toContain('aeoe-43-cascading-cataracts.png');
    expect(styles.backgroundSize).toBe('cover');
    expect(styles.borderTopStyle).toBe('solid');
    expect(styles.borderTopColor).toBe('rgb(0, 0, 0)');
    expect(styles.borderTopWidth).toBe('3px');
    expect(styles.boxShadow).toBe('none');

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

    const flat = page.locator('.pushable-flat').first();
    await expect(flat).toBeVisible();

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

    for (const selector of ['#focus .pushable-flat', '#focus .group-by-type-toggle']) {
      const el = page.locator(selector).first();
      await expect(el).toBeVisible();
      await el.focus();

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
