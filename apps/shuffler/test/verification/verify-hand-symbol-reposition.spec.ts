
import { test, expect } from '@playwright/test';
import { seedGame } from './seedGame.js';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

test.setTimeout(90000);

test.describe('Hand-symbol reposition easter egg', () => {
  test('dragging the hand image into the hand reorders it among the cards, and survives a re-render', async ({ page }) => {
    const gameId = await seedGame(page);
    await page.goto(`${BASE_URL}/game/${gameId}`);

    const cardCount = await page.locator('#hand-cards .card-container').count();
    expect(cardCount).toBeGreaterThan(2);

    // Sanity check on starting layout: hand-symbol renders last, after every card.
    const childrenBefore = await page.locator('#hand-cards').evaluate((el) =>
      Array.from(el.children).map((c) => c.className)
    );
    expect(childrenBefore[childrenBefore.length - 1]).toContain('hand-symbol');

    await page.dragAndDrop('#hand-cards .hand-symbol', '#hand-cards .hand-drop-zone[data-hand-position="1"]');

    const childrenAfterDrag = await page.locator('#hand-cards').evaluate((el) =>
      Array.from(el.children).map((c) => c.className)
    );
    const symbolIndex = childrenAfterDrag.findIndex((c) => c.includes('hand-symbol'));
    expect(symbolIndex).toBeGreaterThan(0);
    expect(symbolIndex).toBeLessThan(childrenAfterDrag.length - 1); // no longer last

    // No server call was made for this — card order/positions are untouched.
    const cardNamesAfterDrag = await page.locator('#hand-cards .card-container').evaluateAll((cards) =>
      cards.map((c) => c.getAttribute('data-hand-position'))
    );
    expect(cardNamesAfterDrag).toEqual(Array.from({ length: cardCount }, (_, i) => String(i)));

    await page.locator('.draw-button').click();
    await expect(page.locator('#hand-cards .card-container')).toHaveCount(cardCount + 1);

    const childrenAfterDraw = await page.locator('#hand-cards').evaluate((el) =>
      Array.from(el.children).map((c) => c.className)
    );
    const symbolIndexAfterDraw = childrenAfterDraw.findIndex((c) => c.includes('hand-symbol'));
    expect(symbolIndexAfterDraw).toBeGreaterThan(0);
    expect(symbolIndexAfterDraw).toBeLessThan(childrenAfterDraw.length - 1);

    const lastCardPosition = await page
      .locator('#hand-cards .card-container')
      .last()
      .getAttribute('data-hand-position');
    expect(lastCardPosition).toBe(String(cardCount)); // the newly-drawn card, appended last

    console.log('SUCCESS: hand-symbol repositioned client-side and survived a full re-render');
  });
});
