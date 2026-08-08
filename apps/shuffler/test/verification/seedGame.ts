/**
 * Seed a prep/game directly through the API instead of clicking through
 * /choose-any-deck. See `.scratch/verify-suite-speed/issues/03-setup-cost-and-isolation.md`
 * (decision 1): the click-through costs ~1.3s per navigation because the deck
 * chooser renders 191 remote Scryfall images, and 41 of 42 specs don't need to
 * re-prove that path — `verify-precon-to-prepare.spec.ts` is the one that does.
 *
 * `page.request` is used (not a bare `request` fixture) so the seeded prep/game
 * cookies land in the same browser context the test goes on to interact with.
 */
import { Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

export const DEFAULT_PRECON_DECK = 'precon-mtgjson-20WaystoWin_SLD.json';

function extractId(url: string, segment: 'prepare' | 'game'): string {
  const match = url.match(new RegExp(`/${segment}/(\\d+)`));
  if (!match) throw new Error(`Expected to land on /${segment}/<id>, got "${url}"`);
  return match[1];
}

/** POSTs /deck and returns the new prepId. */
export async function seedPrep(page: Page, deckFilename: string = DEFAULT_PRECON_DECK): Promise<string> {
  const response = await page.request.post(`${BASE_URL}/deck`, {
    form: { 'deck-source': 'precon', 'precon-deck': deckFilename },
  });
  return extractId(response.url(), 'prepare');
}

export interface TableFields {
  tableName: string;
  playerName: string;
}

/** POSTs /start-game for an existing prepId and returns the new gameId. */
export async function startGame(page: Page, prepId: string, table?: TableFields): Promise<string> {
  const response = await page.request.post(`${BASE_URL}/start-game`, {
    form: {
      'prep-id': prepId,
      ...(table ? { 'table-name': table.tableName, 'player-name': table.playerName } : {}),
    },
  });
  return extractId(response.url(), 'game');
}

/** Seeds a prep, then POSTs /start-game, and returns the new gameId. */
export async function seedGame(page: Page, deckFilename?: string, table?: TableFields): Promise<string> {
  const prepId = await seedPrep(page, deckFilename);
  return startGame(page, prepId, table);
}

/**
 * The deck title shown on /prepare and /game — same cleanup
 * `LocalFileAdapter.listAvailableDecks()` applies (strips the " - <set name>"
 * suffix from the deck's stored `name`). Lets specs assert on the title text
 * without clicking through the deck chooser to read it off a tile first.
 */
export function getPreconDisplayName(deckFilename: string): string {
  const decksDir = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..', 'decks');
  const deck = JSON.parse(fs.readFileSync(path.join(decksDir, deckFilename), 'utf8'));
  const deckName: string = deck.name || deckFilename;
  return deckName.split(' - ')[0];
}
