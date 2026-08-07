/**
 * End-to-End Verification: Deck Title Placement
 *
 * The deck title plaque used to live INSIDE the metal command-zone surround on
 * both /prepare and /game. It now sits on the playmat itself:
 *   - /prepare: a direct child of .playmat, in the grid's top row
 *   - /game:    inside .game-header-row, a SIBLING of #game-menu (not a child —
 *               game.js closes the menu on !closest("#game-menu"), so a title
 *               nested inside it would swallow the dismiss click)
 *
 * RUN: ./verify.sh verify-deck-title-placement
 */

import { test, expect } from '@playwright/test';
import { seedPrep, startGame, DEFAULT_PRECON_DECK, getPreconDisplayName } from './seedGame.js';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

test.setTimeout(90000);

test.describe('Deck title placement', () => {

  test('the deck title sits on the playmat, not in the command zone', async ({ page }) => {
    // --- Get to /prepare with a real deck ---
    const deckName = getPreconDisplayName(DEFAULT_PRECON_DECK);
    const prepId = await seedPrep(page, DEFAULT_PRECON_DECK);
    await page.goto(`${BASE_URL}/prepare/${prepId}`);

    // --- /prepare: title is on the mat ---
    const prepTitle = page.locator('.playmat > .game-title');
    await expect(prepTitle).toBeVisible();
    await expect(prepTitle).toHaveText(deckName!);

    // ...and nowhere near the command zone
    await expect(page.locator('.cool-command-zone-surround .game-title')).toHaveCount(0);

    // The command zone itself is still there, with its commander(s)
    await expect(page.locator('.cool-command-zone-surround .multiple-cards')).toBeVisible();

    // The title sits above the library stack on the mat
    const prepTitleBox = await prepTitle.boundingBox();
    const libraryBox = await page.locator('[data-testid="library-section"]').boundingBox();
    expect(prepTitleBox!.y + prepTitleBox!.height).toBeLessThanOrEqual(libraryBox!.y);

    console.log('SUCCESS: /prepare title is on the playmat');

    // --- Shuffle up into /game ---
    const gameId = await startGame(page, prepId);
    await page.goto(`${BASE_URL}/game/${gameId}`);

    // --- /game: title is in the header row, beside the hamburger ---
    const gameTitle = page.locator('.game-header-row > .game-title');
    await expect(gameTitle).toBeVisible();
    await expect(gameTitle).toHaveText(deckName!);

    await expect(page.locator('.cool-command-zone-surround .game-title')).toHaveCount(0);

    // Crucially a SIBLING of the menu, not inside it
    await expect(page.locator('#game-menu .game-title')).toHaveCount(0);
    await expect(page.locator('.game-header-row > #game-menu')).toHaveCount(1);

    // Title on the left, hamburger on the right, on the same row
    const titleBox = await gameTitle.boundingBox();
    const toggleBox = await page.locator('#menu-toggle').boundingBox();
    expect(titleBox!.x).toBeLessThan(toggleBox!.x);

    // Clicking the title closes an open menu (the reason it must be a sibling:
    // game.js's outside-click test is !evt.target.closest("#game-menu")).
    // Open state lives on <body>, so it survives HTMX swaps of #game-container.
    await page.locator('#menu-toggle').click();
    await expect(page.locator('body')).toHaveClass(/game-menu-open/);
    await gameTitle.click();
    await expect(page.locator('body')).not.toHaveClass(/game-menu-open/);

    console.log('SUCCESS: /game title is in the header row and dismisses the menu');
  });
});
