/**
 * End-to-End Verification: Hand cards line up in a grid across rows
 *
 * The hand wraps onto a second row once there are enough cards to fill the
 * first. Every row's leftmost card should start at the same x-coordinate as
 * every other row's leftmost card — the sister-reported bug was a one-time
 * "before card 0" drop zone that only existed on row 1, shifting row 1's
 * cards right of every row below it.
 *
 * RUN: npm run test:verify -- verify-hand-grid-alignment
 *
 * The test script automatically starts and stops the server on port 3001.
 */

import { test, expect } from '@playwright/test';
import { seedGame } from './seedGame.js';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

test.setTimeout(90000);

test.describe('Hand card grid alignment', () => {
  test('every row of hand cards starts at the same left edge', async ({ page }) => {
    const gameId = await seedGame(page);
    await page.goto(`${BASE_URL}/game/${gameId}`);

    const cardCount = await page.locator('#hand-cards .card-container').count();

    const boxes = [];
    for (let i = 0; i < cardCount; i++) {
      const box = await page.locator('#hand-cards .card-container').nth(i).boundingBox();
      expect(box).not.toBeNull();
      boxes.push(box!);
    }

    const rowsByTop = new Map<number, number[]>();
    for (const box of boxes) {
      const row = rowsByTop.get(box.y) ?? [];
      row.push(box.x);
      rowsByTop.set(box.y, row);
    }

    expect(rowsByTop.size).toBeGreaterThan(1); // the bug only shows up once the hand wraps

    const leftEdges = [...rowsByTop.values()].map((xs) => Math.min(...xs));
    for (const leftEdge of leftEdges) {
      expect(leftEdge).toBeCloseTo(leftEdges[0], 0);
    }

    console.log(`SUCCESS: ${rowsByTop.size} rows of hand cards all start at x=${leftEdges[0]}`);
  });
});
