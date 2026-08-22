
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

test.describe('Library Search - Order Toggle', () => {
  test('the A-Z toggle is active by default and the Position toggle is not', async ({ page }) => {
    const gameId = await seedGame(page);

    await page.goto(`${BASE_URL}/game/${gameId}?openLibrary=true`);
    const libraryModal = page.locator('.modal-overlay');
    await expect(libraryModal).toBeVisible({ timeout: 5000 });

    await expect(page.locator('#library-order-alphabetical')).toHaveClass(/active/);
    await expect(page.locator('#library-order-position')).not.toHaveClass(/active/);
  });

  test('switching to Position order after a shuffle shows a different order than A-Z, and is stable', async ({ page }) => {
    const gameId = await seedGame(page);
    await shuffle(page, gameId);

    await page.goto(`${BASE_URL}/game/${gameId}?openLibrary=true`);
    const libraryModal = page.locator('.modal-overlay');
    await expect(libraryModal).toBeVisible({ timeout: 5000 });

    const alphabeticalNames = await page.locator('.library-card-item .clickable-card-name').allTextContents();

    await page.locator('#library-order-position').click();
    await expect(page.locator('#library-order-position')).toHaveClass(/active/);
    await expect(page.locator('#library-order-alphabetical')).not.toHaveClass(/active/);

    const positionNames = await page.locator('.library-card-item .clickable-card-name').allTextContents();
    expect(positionNames.length).toBe(alphabeticalNames.length);
    expect(positionNames).not.toEqual(alphabeticalNames);
    expect(isSortedAlphabetically(positionNames)).toBe(false);

    // Reopening in position order gives the same order again.
    await page.goto(`${BASE_URL}/game/${gameId}?openLibrary=true&order=position`);
    await expect(libraryModal).toBeVisible({ timeout: 5000 });
    const positionNamesAgain = await page.locator('.library-card-item .clickable-card-name').allTextContents();
    expect(positionNamesAgain).toEqual(positionNames);
  });

  test('the order toggle survives switching Group by Type on', async ({ page }) => {
    const gameId = await seedGame(page);
    await shuffle(page, gameId);

    await page.goto(`${BASE_URL}/game/${gameId}?openLibrary=true&order=position`);
    const libraryModal = page.locator('.modal-overlay');
    await expect(libraryModal).toBeVisible({ timeout: 5000 });

    await page.locator('#library-group-by-type-toggle').click();
    await expect(page.locator('.card-type-group').first()).toBeVisible();
    await expect(page.locator('#library-order-position')).toHaveClass(/active/);
  });
});
