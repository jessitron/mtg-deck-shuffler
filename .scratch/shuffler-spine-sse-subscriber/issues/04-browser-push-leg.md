# 04 — Browser push leg + tab lifecycle

**What to build:** A new per-game route `GET /game-events/:gameId` for native browser
`EventSource` (no htmx SSE extension, no new dependency) — one connection per open tab.
The route logs open/close rather than holding a span open for the connection's whole
lifetime (the dispatch span from ticket 03 already captures the interesting event; the
browser push itself is plumbing). A small inline script on the active-game page opens the
`EventSource` and, on message, dispatches
`document.body.dispatchEvent(new CustomEvent('game-state-updated', {bubbles:true}))` —
reusing the page's existing `hx-trigger="game-state-updated from:body"` listener completely
unchanged, so a returned card appears in Revealed via the same re-fetch path every other
externally-triggered update already uses (no entrance animation — known, accepted).

Ticket 03's registry now also tracks the set of open browser SSE response streams per game.
When the last open tab for a game disconnects, that game's Spine subscription (opened in
ticket 03) tears down; the next `GET /game-section/:gameId` hit re-opens it via ticket 03's
existing idempotent check. No expiry timer.

Consult `owners/animations` before implementing — an SSE-triggered `#game-container` swap
can now land mid-gesture during a player's own unfinished native-HTML5 hand-reorder drag;
this is accepted as a rare visual glitch, not guarded against.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] `GET /game-events/:gameId` streams SSE to a browser tab, logging open and close, with
      no lifetime-spanning span
- [ ] The active-game page opens a native `EventSource` against this route and dispatches
      `game-state-updated` on `onmessage`
- [ ] A Playwright test opens two tabs on the same game, delivers a fake `card.returned`
      event (at the Spine, or injected at the subscriber boundary), and confirms the second
      tab's `#game-container` re-fetches and shows the card in Revealed with no manual
      reload
- [ ] A test hitting `GET /game-section/:gameId` twice with no live subscription confirms
      idempotency: one Spine connection opened, not two
- [ ] A test closing the last open browser SSE tab for a game confirms the Spine-side
      subscription tears down
- [ ] A subsequent `GET /game-section/:gameId` hit after teardown confirms the subscription
      re-opens
