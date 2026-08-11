
import { fetchScryfall } from "../../scryfall-http.js";

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
    const response = await fetchScryfall(url, {
      // fetchScryfall adds the User-Agent Scryfall requires; Accept is ours.
      headers: { Accept: "application/json" },
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
