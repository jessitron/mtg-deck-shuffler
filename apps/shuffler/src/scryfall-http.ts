export const SCRYFALL_USER_AGENT = "mtg-deck-shuffler/1.0 (https://github.com/jessitron/mtg-deck-shuffler)";

export function fetchScryfall(url: string, init: RequestInit = {}, fetchFn: typeof fetch = fetch): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("User-Agent", SCRYFALL_USER_AGENT);
  return fetchFn(url, { ...init, headers });
}
