
import { test, expect, Page } from '@playwright/test';
import { seedPrep, seedGame } from './seedGame.js';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

test.setTimeout(90000);

function isSortedAlphabetically(names: string[]): boolean {
  for (let i = 1; i < names.length; i++) {
    if (names[i - 1].localeCompare(names[i]) > 0) return false;
  }
  return true;
}

async function shuffle(page: Page, gameId: string): Promise<void> {
  await page.request.post(`${BASE_URL}/shuffle/${gameId}`);
}

test.describe('Library Search - Alphabetical Order', () => {
  test('game library modal lists cards alphabetically, ungrouped', async ({ page }) => {
    const gameId = await seedGame(page);

    await page.goto(`${BASE_URL}/game/${gameId}?openLibrary=true`);
    const libraryModal = page.locator('.modal-overlay');
    await expect(libraryModal).toBeVisible({ timeout: 5000 });

    const cardNames = await page.locator('.library-card-item .clickable-card-name').allTextContents();
    expect(cardNames.length).toBeGreaterThan(1);
    expect(isSortedAlphabetically(cardNames)).toBe(true);
  });

  test('game library modal lists cards alphabetically within each type group', async ({ page }) => {
    const gameId = await seedGame(page);

    await page.goto(`${BASE_URL}/game/${gameId}?openLibrary=true&groupBy=type`);
    const libraryModal = page.locator('.modal-overlay');
    await expect(libraryModal).toBeVisible({ timeout: 5000 });

    const groups = page.locator('.card-type-group');
    const groupCount = await groups.count();
    expect(groupCount).toBeGreaterThan(0);

    for (let i = 0; i < groupCount; i++) {
      const cardNames = await groups.nth(i).locator('.clickable-card-name').allTextContents();
      expect(isSortedAlphabetically(cardNames)).toBe(true);
    }
  });

  test('shuffling the library does not change the modal order — still alphabetical', async ({ page }) => {
    const gameId = await seedGame(page);

    await shuffle(page, gameId);

    await page.goto(`${BASE_URL}/game/${gameId}?openLibrary=true`);
    const libraryModal = page.locator('.modal-overlay');
    await expect(libraryModal).toBeVisible({ timeout: 5000 });

    const cardNames = await page.locator('.library-card-item .clickable-card-name').allTextContents();
    expect(cardNames.length).toBeGreaterThan(1);
    expect(isSortedAlphabetically(cardNames)).toBe(true);
  });

  test('prep library modal lists cards alphabetically, ungrouped', async ({ page }) => {
    const prepId = await seedPrep(page);

    await page.goto(`${BASE_URL}/prepare/${prepId}?openLibrary=true`);
    const libraryModal = page.locator('.modal-overlay');
    await expect(libraryModal).toBeVisible({ timeout: 5000 });

    const cardNames = await page.locator('.library-card-item .clickable-card-name').allTextContents();
    expect(cardNames.length).toBeGreaterThan(1);
    expect(isSortedAlphabetically(cardNames)).toBe(true);
  });
});
