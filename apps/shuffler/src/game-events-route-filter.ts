/**
 * Matches `/game-events/:gameId` — the browser-facing SSE route (`app.ts`). Used to
 * suppress the auto-instrumented incoming-request span for that route: the connection
 * stays open for the whole browser tab's lifetime, and a span that long would dwarf
 * everything else in a trace. Open/close are logged instead (see `log.ts` usage in
 * `app.ts`).
 */
export function isGameEventsStreamPath(url: string | undefined): boolean {
  if (!url) return false;
  const path = url.split("?")[0];
  return /^\/game-events\/[^/]+$/.test(path);
}
