/**
 * End-to-End Verification: Library Modal Card Type Grouping
 *
 * This test verifies the "Group by Type" toggle in the library search modal:
 * - ?openLibrary=true shows ungrouped library
 * - ?openLibrary=true&groupBy=type shows cards grouped by type with headers
 * - Toggle button switches between grouped and ungrouped views
 * - Grouped card modal navigation stays within the type group
 * - Flipping a two-faced card preserves group-scoped navigation
 *
 * Uses the "From Cute to Brute" precon which has many two-faced cards.
 *
 * RUN: npm run test:verify
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';
const TWO_FACED_DECK = 'precon-mtgjson-FromCutetoBrute_SLD.json';

test.setTimeout(90000);

function extractPrepId(url: string): string | null {
  const match = url.match(/\/prepare\/(\d+)/);
  return match ? match[1] : null;
}

function extractGameId(url: string): string | null {
  const match = url.match(/\/game\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Select a specific precon deck by filename, submitting the form directly.
 */
async function selectDeck(page: Page, deckFilename?: string): Promise<void> {
  await page.goto(`${BASE_URL}/choose-any-deck`);

  const firstTile = page.locator('.precon-tile').first();
  await expect(firstTile).toBeVisible({ timeout: 15000 });

  const deckFile = deckFilename
    ? deckFilename
    : await firstTile.getAttribute('value');

  await page.evaluate((file: string) => {
    const form = document.querySelector('form.precon-input-section') as HTMLFormElement;
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'precon-deck';
    input.value = file;
    form.appendChild(input);
    form.submit();
  }, deckFile!);

  await page.waitForURL('**/prepare/*', { timeout: 60000 });
}

async function setupPrep(page: Page, deckFilename?: string): Promise<string> {
  await selectDeck(page, deckFilename);

  const prepId = extractPrepId(page.url());
  if (!prepId) throw new Error('Failed to create prep');
  return prepId;
}

async function setupGame(page: Page, deckFilename?: string): Promise<string> {
  await selectDeck(page, deckFilename);

  const shuffleButton = page.locator(
    'button.begin-button, button.start-game-button, button:has-text("Shuffle Up")'
  );
  await expect(shuffleButton).toBeVisible({ timeout: 10000 });
  await shuffleButton.click();

  await page.waitForURL('**/game/*', { timeout: 30000 });

  const gameId = extractGameId(page.url());
  if (!gameId) throw new Error('Failed to create game');
  return gameId;
}

test.describe('Library Modal - Card Type Grouping', () => {

  test('library modal shows Group by Type toggle button', async ({ page }) => {
    const prepId = await setupPrep(page);

    await page.goto(`${BASE_URL}/prepare/${prepId}?openLibrary=true`);

    const libraryModal = page.locator('.modal-overlay');
    await expect(libraryModal).toBeVisible({ timeout: 5000 });

    // Toggle button should be present
    const toggleButton = page.locator('.group-by-type-toggle');
    await expect(toggleButton).toBeVisible({ timeout: 5000 });
  });

  test('groupBy=type query parameter shows cards grouped with type headers', async ({ page }) => {
    const prepId = await setupPrep(page);

    await page.goto(`${BASE_URL}/prepare/${prepId}?openLibrary=true&groupBy=type`);

    const libraryModal = page.locator('.modal-overlay');
    await expect(libraryModal).toBeVisible({ timeout: 5000 });

    // Should have type group headers
    const typeHeaders = page.locator('.card-type-header');
    const headerCount = await typeHeaders.count();
    expect(headerCount).toBeGreaterThan(1);

    // Toggle button should be active
    const toggleButton = page.locator('.group-by-type-toggle.active');
    await expect(toggleButton).toBeVisible({ timeout: 5000 });
  });

  test('grouped view: card modal prev/next stays within the type group', async ({ page }) => {
    // Use a game with the two-faced deck so we test the game card-modal route
    const gameId = await setupGame(page, TWO_FACED_DECK);

    // Open grouped library modal
    await page.goto(`${BASE_URL}/game/${gameId}?openLibrary=true&groupBy=type`);

    const libraryModal = page.locator('.modal-overlay');
    await expect(libraryModal).toBeVisible({ timeout: 5000 });

    // Find the first type group and count its cards
    const firstGroup = page.locator('.card-type-group').first();
    const firstGroupHeader = firstGroup.locator('.card-type-header');
    const headerText = await firstGroupHeader.textContent();
    // Header format: "Creature (27)" — extract the count
    const groupCountMatch = headerText?.match(/\((\d+)\)/);
    const groupCount = groupCountMatch ? parseInt(groupCountMatch[1]) : 0;
    expect(groupCount).toBeGreaterThan(1);

    // Click the first card name in the first group. Retried: the click is an
    // htmx swap and can be swallowed if it straddles the settle.
    const firstCardInGroup = firstGroup.locator('.clickable-card-name').first();
    const cardModal = page.locator('.card-modal-overlay');
    await expect(async () => {
      await firstCardInGroup.click();
      await expect(cardModal).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 20000 });

    // Position indicator should show "Card 1 of <groupCount>" (not the full library count)
    const positionIndicator = page.locator('.card-modal-position-indicator');
    await expect(positionIndicator).toHaveText(`Card 1 of ${groupCount}`);

    // Should have no prev button (we're at position 1)
    const prevButton = page.locator('.card-modal-nav-prev');
    await expect(prevButton).not.toBeVisible();

    // Should have a next button
    const nextButton = page.locator('.card-modal-nav-next');
    await expect(nextButton).toBeVisible();

    // Click next. Retried in case the click straddles an htmx swap/settle.
    await expect(async () => {
      await nextButton.click();
      await expect(positionIndicator).toHaveText(`Card 2 of ${groupCount}`, { timeout: 3000 });
    }).toPass({ timeout: 20000 });

    // Now prev button should appear
    await expect(page.locator('.card-modal-nav-prev')).toBeVisible();
  });

  test('flipping a two-faced card preserves group-scoped navigation', async ({ page }) => {
    const gameId = await setupGame(page, TWO_FACED_DECK);

    // Open grouped library modal
    await page.goto(`${BASE_URL}/game/${gameId}?openLibrary=true&groupBy=type`);

    const libraryModal = page.locator('.modal-overlay');
    await expect(libraryModal).toBeVisible({ timeout: 5000 });

    // Find a type group that has multiple cards
    const groups = page.locator('.card-type-group');
    const groupCount = await groups.count();
    let targetGroup = null;
    let targetGroupSize = 0;

    for (let i = 0; i < groupCount; i++) {
      const group = groups.nth(i);
      const headerText = await group.locator('.card-type-header').textContent();
      const match = headerText?.match(/\((\d+)\)/);
      const size = match ? parseInt(match[1]) : 0;
      if (size > 2) {
        targetGroup = group;
        targetGroupSize = size;
        break;
      }
    }

    expect(targetGroup).not.toBeNull();

    // Find a two-faced card in this group (it'll have a flip button when opened)
    // Try each card until we find one with a flip button
    const cardNames = targetGroup!.locator('.clickable-card-name');
    const cardCount = await cardNames.count();
    let foundFlipCard = false;

    for (let i = 0; i < cardCount; i++) {
      // Opening a card is an htmx swap into #card-modal-container. A click at
      // Playwright speed can land its mousedown on a node htmx then replaces, so
      // no click event fires; retry until the modal actually opens.
      const cardModal = page.locator('.card-modal-overlay');
      await expect(async () => {
        await cardNames.nth(i).click();
        await expect(cardModal).toBeVisible({ timeout: 3000 });
      }).toPass({ timeout: 20000 });

      const flipButton = page.locator('.card-modal-overlay .flip-button');
      if (await flipButton.isVisible()) {
        foundFlipCard = true;

        // Record position before flip
        const positionIndicator = page.locator('.card-modal-position-indicator');
        const positionText = await positionIndicator.textContent();
        const positionMatch = positionText?.match(/Card (\d+) of (\d+)/);
        const currentPosition = positionMatch ? parseInt(positionMatch[1]) : 0;
        const totalInGroup = positionMatch ? parseInt(positionMatch[2]) : 0;
        expect(totalInGroup).toBe(targetGroupSize);

        // Flip the card.
        // NOTE: unlike the clicks above, this one is not retried, because the
        // assertion that follows cannot tell whether it landed — the position
        // indicator reads the same before and after a flip, which is precisely
        // what the test is asserting. A swallowed flip would still pass. That
        // gap predates this change; see .scratch/verify-suite-speed/issues/02.
        await flipButton.click();

        // After flip, position indicator should still show group-scoped count
        await expect(positionIndicator).toHaveText(`Card ${currentPosition} of ${totalInGroup}`);

        // Navigate to next card (if not at end)
        if (currentPosition < totalInGroup) {
          const nextButton = page.locator('.card-modal-nav-next');
          await expect(nextButton).toBeVisible();
          // Same swap/settle straddle as opening the modal. Retry until the
          // position indicator advances within the group.
          await expect(async () => {
            await nextButton.click();
            await expect(positionIndicator).toHaveText(
              `Card ${currentPosition + 1} of ${totalInGroup}`,
              { timeout: 3000 }
            );
          }).toPass({ timeout: 20000 });
        }

        break;
      }

      // Close the modal and try the next card. Retried for the same reason:
      // a swallowed close leaves the modal up and the next iteration clicks
      // into the wrong thing.
      const closeButton = page.locator('.card-modal-close');
      await expect(async () => {
        await closeButton.click();
        await expect(cardModal).toBeHidden({ timeout: 3000 });
      }).toPass({ timeout: 20000 });
    }

    expect(foundFlipCard).toBe(true);
  });

  test('prep page: flipping a two-faced card preserves group-scoped navigation', async ({ page }) => {
    const prepId = await setupPrep(page, TWO_FACED_DECK);

    // Open grouped library modal
    await page.goto(`${BASE_URL}/prepare/${prepId}?openLibrary=true&groupBy=type`);

    const libraryModal = page.locator('.modal-overlay');
    await expect(libraryModal).toBeVisible({ timeout: 5000 });

    // Find a type group that has multiple cards
    const groups = page.locator('.card-type-group');
    const groupCount = await groups.count();
    let targetGroup = null;
    let targetGroupSize = 0;

    for (let i = 0; i < groupCount; i++) {
      const group = groups.nth(i);
      const headerText = await group.locator('.card-type-header').textContent();
      const match = headerText?.match(/\((\d+)\)/);
      const size = match ? parseInt(match[1]) : 0;
      if (size > 2) {
        targetGroup = group;
        targetGroupSize = size;
        break;
      }
    }

    expect(targetGroup).not.toBeNull();

    // Find a two-faced card in this group
    const cardNames = targetGroup!.locator('.clickable-card-name');
    const cardCount = await cardNames.count();
    let foundFlipCard = false;

    for (let i = 0; i < cardCount; i++) {
      // Opening a card is an htmx swap into #card-modal-container. A click at
      // Playwright speed can land its mousedown on a node htmx then replaces, so
      // no click event fires; retry until the modal actually opens.
      const cardModal = page.locator('.card-modal-overlay');
      await expect(async () => {
        await cardNames.nth(i).click();
        await expect(cardModal).toBeVisible({ timeout: 3000 });
      }).toPass({ timeout: 20000 });

      const flipButton = page.locator('.card-modal-overlay .flip-button');
      if (await flipButton.isVisible()) {
        foundFlipCard = true;

        // Record position before flip
        const positionIndicator = page.locator('.card-modal-position-indicator');
        const positionText = await positionIndicator.textContent();
        const positionMatch = positionText?.match(/Card (\d+) of (\d+)/);
        const currentPosition = positionMatch ? parseInt(positionMatch[1]) : 0;
        const totalInGroup = positionMatch ? parseInt(positionMatch[2]) : 0;
        expect(totalInGroup).toBe(targetGroupSize);

        // Flip the card.
        // NOTE: unlike the clicks above, this one is not retried, because the
        // assertion that follows cannot tell whether it landed — the position
        // indicator reads the same before and after a flip, which is precisely
        // what the test is asserting. A swallowed flip would still pass. That
        // gap predates this change; see .scratch/verify-suite-speed/issues/02.
        await flipButton.click();

        // After flip, position indicator should still show group-scoped count
        await expect(positionIndicator).toHaveText(`Card ${currentPosition} of ${totalInGroup}`);

        // Navigate to next card (if not at end)
        if (currentPosition < totalInGroup) {
          const nextButton = page.locator('.card-modal-nav-next');
          await expect(nextButton).toBeVisible();
          // Same swap/settle straddle as opening the modal. Retry until the
          // position indicator advances within the group.
          await expect(async () => {
            await nextButton.click();
            await expect(positionIndicator).toHaveText(
              `Card ${currentPosition + 1} of ${totalInGroup}`,
              { timeout: 3000 }
            );
          }).toPass({ timeout: 20000 });
        }

        break;
      }

      // Close the modal and try the next card. Retried for the same reason:
      // a swallowed close leaves the modal up and the next iteration clicks
      // into the wrong thing.
      const closeButton = page.locator('.card-modal-close');
      await expect(async () => {
        await closeButton.click();
        await expect(cardModal).toBeHidden({ timeout: 3000 });
      }).toPass({ timeout: 20000 });
    }

    expect(foundFlipCard).toBe(true);
  });
});
