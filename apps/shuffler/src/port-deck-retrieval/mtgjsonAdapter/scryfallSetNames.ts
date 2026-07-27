/**
 * Fetches the set-code → full-set-name map from Scryfall's /sets endpoint.
 *
 * MTGJSON deck data only carries set CODES (e.g. "SLD", "PLST"), but we want to
 * display the full set TEXT (e.g. "Secret Lair Drop", "The List") on deck tiles,
 * matching what the Archidekt adapter already stores (edition names). Scryfall is
 * the same source we use for images, and /sets returns every set's code + name.
 *
 * Keys are upper-cased so they line up with MTGJSON's upper-case setCodes.
 */

const SCRYFALL_SETS_URL = "https://api.scryfall.com/sets";

interface ScryfallSet {
  code?: string;
  name?: string;
}
interface ScryfallSetsResponse {
  data?: ScryfallSet[];
  has_more?: boolean;
  next_page?: string;
}

export async function fetchScryfallSetNames(): Promise<Map<string, string>> {
  const byCode = new Map<string, string>();
  let url: string | undefined = SCRYFALL_SETS_URL;

  while (url) {
    const response = await fetch(url, {
      headers: {
        // Scryfall requires a User-Agent and Accept header on API requests.
        "User-Agent": "mtg-deck-shuffler/1.0 (https://github.com/jessitron/mtg-deck-shuffler)",
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`Scryfall /sets failed: ${response.status} ${response.statusText}`);
    }

    const body = (await response.json()) as ScryfallSetsResponse;
    for (const set of body.data || []) {
      if (set.code && set.name) byCode.set(set.code.toUpperCase(), set.name);
    }
    url = body.has_more ? body.next_page : undefined;
  }

  return byCode;
}
