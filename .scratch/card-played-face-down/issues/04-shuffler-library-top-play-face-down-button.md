# Shuffler: "Play Face Down" button for the top card of the library

Mountain: spine-gathers-data
Ship: shuffler
Status: not started

Blocked by: 03

## What

Add a "Play Face Down" button to the game screen's library-buttons row, under the
Reveal | Mill row, spanning the full row width (it's a longer label than the other
buttons). Clicking it takes the top card of the library and plays it face down
directly — no peeking, no intermediate Reveal step — exactly the same domain outcome
as playing a hand card face down (ticket 03): the card moves to `Table` in the
Shuffler's own state, and (table mode) a `card.played-face-down` event goes to the
Spine; (solo mode) the generic card-back image is copied to the clipboard. This lets a
player put the top card of their library into play concealed (foretell off the top,
manifest via top-of-library effects, etc.) without the Shuffler ever showing them
its face.

There is currently no way to play the top-of-library card directly — the only paths
today are Reveal-then-play-from-Revealed, or Mill (which sends it to the graveyard,
not the table). This button is new, not a variant of an existing one.

## Where each piece lives today (verified against the current code)

- **Button row**: `src/view/play-game/library-components.ts`,
  `formatLibrarySectionHtmlFragment` (lines 4-46). The `.library-buttons` div (lines
  8-44) currently renders Draw, Shuffle, Search, Reveal, Mill. Add the new button after
  Mill, following the Reveal/Mill disabled-when-empty pattern (`game.listLibrary().length
  > 0`, lines 24-33/34-43). `inTableMode` isn't currently threaded into this function —
  compute it locally as `!!game.tableName`, matching the pattern already used at the
  call site for the hand/revealed modal actions (`app.ts:885`,
  `getModalCardActionsByLocation(..., !!game.tableName)`).
- **CSS classes to reuse verbatim** — reusing ticket 03's exact class names means
  `public/game.js` needs **no new listener code**, since its `htmx:beforeRequest`
  handlers key off class name, not which screen/row the button is in:
  - Table mode: class `table-face-down-button` — already matched by the "Sent to
    table" / disable handler (`public/game.js:117-122`).
  - Solo mode: class `play-face-down-button` — already matched by the clipboard-copy
    handler (`public/game.js:148-165`), which calls `copyCardBackToClipboard()`
    (`public/game.js:92-115`, fetches `/images/mtg-card-back.jpg` directly, no
    Scryfall proxy).
  - Button id: `id="play-top-face-down-button"` (new; no existing id to collide with).
- **Route**: new `POST /play-top-card-face-down/:gameId` in `src/app.ts`, modeled on
  `POST /mill/:gameId` (~line 1491, no `gameCardIndex` param — like Mill, the route
  derives the top card server-side) rather than on `/play-card/:gameId/:gameCardIndex`.
  Reason: `GameState.playCard` (`src/GameState.ts:514-538`) throws unless the card is
  already in `Hand` or `Revealed` (line 521-523) — a Library-located card can't go
  through it, so this needs its own domain method rather than reusing `playCard`.
  Route shape mirrors `/play-card`'s beforeMutate wiring (`app.ts:1407-1452`):
  ```ts
  const outcome = await applyGameCommand(
    { persistStatePort, cardRepository },
    gameId,
    expectedVersionFromRequest(req),
    (game) => game.playTopCardOfLibrary(browserTabId),
    async (game) => {
      const cardToPlay = game.listLibrary()[0];
      if (!game.tableName || !cardToPlay) return;
      await sendCardBeforeMutate(game, cardToPlay, zoneHintForPlay(cardToPlay), sessionId, true);
    }
  );
  ```
  `faceDown` is hard-coded `true` here (unlike `/play-card`, which reads it from a
  `face-down` hx-vals flag) — this button only ever plays face down, there's no
  face-up variant of "play the top of my library without looking." Grab
  `game.listLibrary()[0]` for the beforeMutate Spine send *before* the mutate callback
  runs (same ordering `applyGameCommand` already gives `/play-card`), since after
  `playTopCardOfLibrary` runs the card is no longer the library's top card.
- **Domain method**: `src/GameState.ts`, add `playTopCardOfLibrary(browserTabId?):
  WhatHappened`, modeled on `mill()` (lines 564-577) for "operate on
  `listLibrary()[0]`, throw if library is empty" and on `playCard()` (lines 514-538)
  for "move to `{type: "Table"}` with no discard verb". Concealment is not domain
  state (per spec.md's Implementation Decisions — `GameCard`/`PersistedGameState`
  don't gain a `faceDown` concept), so this method's name and body stay agnostic to
  face-down-ness, exactly like `playCard` is — the concealment instruction lives only
  in the route's hard-coded `sendCardBeforeMutate(..., true)` call, same layering as
  ticket 03.
- **Event builder / Spine send**: no new code. `sendCardBeforeMutate` /
  `sendCardPlayedToSpineBestEffort` (`src/port-spine/sendToSpine.ts:56-76`) and
  `buildCardPlayedFaceDownEvent` (`src/port-tabletop/types.ts:122-154`) already exist
  from ticket 03 and are reused as-is — same `card.played-face-down` event kind, same
  payload shape. `zoneHintForPlay` (`src/port-tabletop/types.ts:6-8`) already works
  for any `GameCard`, library-sourced or not.
- **CSS layout**: `public/game.css:293-321`. Current grid:
  ```css
  .library-buttons {
    grid-template-areas: "draw draw" "reveal mill" "search shuffle";
    grid-template-columns: 1fr 1fr;
  }
  ```
  Insert a new full-width row between Reveal/Mill and Search/Shuffle:
  ```css
  grid-template-areas: "draw draw" "reveal mill" "play-face-down play-face-down" "search shuffle";
  ```
  ```css
  .library-buttons .play-top-face-down-button {
    grid-area: play-face-down;
  }
  ```
  `"draw draw"` is the existing precedent for a full-width single button in this grid.
  Base button visuals come from `.library-buttons button` (`public/playmat.css:70-103`,
  black fill + `.pushable-flat`-style press physics) and the seat-color override
  (`game.css:255-259`, scoped to `.playmat-game`). Ticket 03's grey face-down styling
  (`.modal-action-button.face-down-button`, `public/playmat.css:609-621`) is scoped to
  the modal-action-button context and won't apply here as-is — consult
  `owners/shuffler-looks-like-itself-review` on whether this button should get a
  similar grey-vs-pink distinction against its row-mates, or just inherit the plain
  library-buttons black fill like Reveal/Mill do today.

## Testing

- Unit test on `GameState.playTopCardOfLibrary`: moves `listLibrary()[0]` to `Table`,
  throws on an empty library (mirror `mill()`'s existing test coverage).
- A Jest test on `POST /play-top-card-face-down` asserting `FakeSpineGateway` records
  an envelope named `card.played-face-down` sourced from the library's top card (table
  mode), and that solo mode (no `tableName`) sends nothing.
- Playwright: the library-buttons row shows a full-width "Play Face Down" button under
  Reveal/Mill, disabled when the library is empty; clicking it in solo mode triggers
  the clipboard-copy code path (extend whichever existing spec covers the hand-card
  face-down clipboard flow from ticket 03, rather than adding a new file).

## Before implementing

Per this ship's `CLAUDE.md` Task Implementation Process: consult
`owners/shuffler-looks-like-itself-review` on the new button's placement/styling in
the library-buttons grid (full-width row, grey-vs-black question above) before writing
CSS. `owners/two-faced-cards-review` doesn't need a fresh consult — this ticket reuses
ticket 03's event-building code unchanged; it only adds a new caller.

## Comments
