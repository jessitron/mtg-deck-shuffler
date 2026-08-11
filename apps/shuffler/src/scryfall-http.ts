/**
 * One door for outbound Scryfall requests.
 *
 * Scryfall — both `api.scryfall.com` and the `cards.scryfall.io` image CDN —
 * requires requests to identify themselves. Node's built-in `fetch` sends
 * `User-Agent: node`, which Cloudflare answers with **400 BAD REQUEST**. The
 * failure is easy to misread as our bug: the URL is correct and works in a
 * browser or under `curl`, it just doesn't work from Node without a real UA.
 * `/proxy-image` shipped without one and 400'd on every card copy.
 *
 * Route every Scryfall call through here so that lesson only has to be learned
 * once. `fetchFn` exists for tests; production always uses global `fetch`.
 */
export const SCRYFALL_USER_AGENT = "mtg-deck-shuffler/1.0 (https://github.com/jessitron/mtg-deck-shuffler)";

export function fetchScryfall(url: string, init: RequestInit = {}, fetchFn: typeof fetch = fetch): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("User-Agent", SCRYFALL_USER_AGENT);
  return fetchFn(url, { ...init, headers });
}
