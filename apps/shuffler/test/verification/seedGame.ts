import { Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

export const DEFAULT_PRECON_DECK = 'precon-mtgjson-20WaystoWin_SLD.json';

function extractId(url: string, segment: 'prepare' | 'game'): string {
  const match = url.match(new RegExp(`/${segment}/([^/?]+)`));
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

export function getPreconDisplayName(deckFilename: string): string {
  const decksDir = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..', 'decks');
  const deck = JSON.parse(fs.readFileSync(path.join(decksDir, deckFilename), 'utf8'));
  const deckName: string = deck.name || deckFilename;
  return deckName.split(' - ')[0];
}
