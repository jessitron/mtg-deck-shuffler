# Shuffler: "Play Face Down" button, clipboard concealment, and card.played-face-down send

Mountain: spine-gathers-data
Ship: shuffler
Status: done

Blocked by: 01, 02

## What

Add a "Play Face Down" action to the hand card's modal, alongside "Play"/"Discard".
Solo/clipboard mode: copies the generic card-back image to the clipboard. Table mode:
sends `card.played-face-down` to the Spine's event log instead of `card.played` —
best-effort, same as "Play" today (never blocks or fails the play; the game state
mutates and persists immediately regardless of whether the Spine accepts the event).
Either way, moves the card to `Table` in the Shuffler's own game state exactly like
"Play" does — no new domain/persisted state for concealment.

## Where each piece lives today (verified against the current code)

- **Button markup**: `src/view/play-game/game-modals.ts`, `formatModalCardActionsForHand`
  (lines 97-124) builds the `CardAction[]` list ("Play", "Discard", "Put on Top", "Put on
  Bottom") and calls `formatModalActionButton` (lines 62-95) for each. Add a "Play Face
  Down" entry here — same `endpoint: "/play-card"`, same `cssClass` pattern
  (`modal-action-button ${playishClass} face-down-button` or similar; consult
  `owners/shuffler-looks-like-itself` before finalizing the class name/styling — see
  spec.md Further Notes), title `inTableMode ? "Send face down to the table and remove
  from hand" : "Copy card back and remove from hand"`.
- **Distinguishing the request server-side**: `formatModalActionButton` currently sends
  only `{"expected-version": N}` via `hx-vals` (line 87). The new button needs a way to
  tell `POST /play-card/:gameId/:gameCardIndex` "face down" — either a second `hx-vals`
  key (e.g. `"face-down": true`, arrives at Express as the string `"true"` under default
  htmx form encoding — check for that string, not a JS boolean) or a distinct button CSS
  class client-side plus a body flag, whichever reads more clearly in
  `formatModalActionButton`'s signature. Don't introduce a second HTTP route — see next
  point.
- **Route**: `src/app.ts`, `POST /play-card/:gameId/:gameCardIndex` (~line 1373). The
  mutate callback (`game.playCard(...)`) is unaffected — concealment is not domain
  state. The `beforeMutate` callback passed to `applyGameCommand` (~lines 1395-1401)
  currently always calls `sendCardBeforeMutate(game, cardToPlay,
  zoneHintForPlay(cardToPlay), sessionId)` (`sendCardBeforeMutate`, ~line 129, which
  forwards to `sendCardPlayedToSpineBestEffort`); when face-down was requested, this
  needs to send a `card.played-face-down` event to the Spine instead. Both
  `sendCardBeforeMutate` and `sendCardPlayedToSpineBestEffort`
  (`src/port-spine/sendToSpine.ts`) currently hard-code `buildCardPlayedEvent`/the
  `card.played` shape — both need a way to pick the face-down variant. Smallest change:
  give `sendCardBeforeMutate`/`sendCardPlayedToSpineBestEffort` a `faceDown: boolean`
  parameter that selects between `buildCardPlayedEvent` and a new
  `buildCardPlayedFaceDownEvent` (see next point) before calling `spinePort.sendEvent`.
  Note this call runs best-effort and before the mutate/persist step but never blocks or
  fails it — `sendCardPlayedToSpineBestEffort` swallows its own errors (span attribute +
  `log.warn`), it never throws, so there's no failure path here to design around.
- **Event builder**: `src/port-tabletop/types.ts` (this ship's shared event-envelope
  types live here — nothing Tabletop-gateway-specific remains in this directory, just the
  `card.played`-family payload shapes both the Spine send and the Spine-join decoration
  build against). Add `CardPlayedFaceDownPayload` (identical fields to
  `CardPlayedPayload`, lines 35-48) and `buildCardPlayedFaceDownEvent(...)` (same
  signature and body as `buildCardPlayedEvent`, lines 52-86, except `name:
  "card.played-face-down"` and `origin: "shuffler.playCardFaceDownSubmit"` or similar —
  keep `origin` distinct so Honeycomb traces can tell the two apart). Per spec.md's
  Implementation Decisions, this is a deliberate duplicate, not a shared/parameterized
  function — the two kinds are meant to be free to diverge later. `SpinePort.sendEvent`
  (`src/port-spine/types.ts`) already takes any `EventEnvelope`-shaped payload, so no
  port interface change is needed as long as the new payload type is folded into (or
  unioned with) whatever type `sendCardPlayedToSpineBestEffort` accepts — check whether
  `CardPlayedEvent`'s generic needs widening to `EventEnvelope<CardPlayedPayload |
  CardPlayedFaceDownPayload>` or a shared alias.
- **Spine send**: `sendCardPlayedToSpineBestEffort` (`src/port-spine/sendToSpine.ts`,
  called from `sendCardBeforeMutate`) builds the envelope via `buildCardPlayedEvent` and
  posts it through `spinePort.sendEvent(tableId, event)` — it's the one spot that
  currently hard-codes `card.played`'s builder; this is exactly the hard-code that needs
  the `faceDown` branch described above. `HttpSpineGateway`/`FakeSpineGateway`
  (`src/port-spine/`) implementing `SpinePort` are themselves shape-agnostic — they just
  forward whatever envelope they're given — so neither needs a change.
- **Clipboard (solo mode)**: `public/game.js`. The existing `play-button` class handling
  (`htmx:beforeRequest` listener, ~lines 97-119) reads `button.dataset.cardId` /
  `button.dataset.currentFace` and calls `copyCardToClipboard(cardId, face)`, which
  fetches `/proxy-image?cardId=...&face=...` (a real Scryfall-backed image) and writes it
  to the clipboard. The face-down button needs a sibling listener (matched on a new CSS
  class, e.g. `play-face-down-button`) that instead fetches the fleet's static
  `CARD_BACK` asset (`/images/mtg-card-back.jpg`, already served locally — no proxy
  round-trip needed) and clipboard-writes that blob. Match the existing button-text
  feedback pattern ("Copied!" / "Copy failed 😨").
- **Table-mode button text/disable feedback**: the existing `htmx:beforeRequest`
  listener for `.table-play-button` (game.js ~lines 90-95, sets "Sent to table" +
  disables) should also match whatever class the face-down table button gets, or gain a
  sibling check — otherwise the face-down table button won't get the same in-flight
  feedback.

## Testing

- Extend `test/port-tabletop/cardPlayedEvent.test.ts`-style coverage with a
  `buildCardPlayedFaceDownEvent` test file/section — same assertions as the existing
  suite, `name: "card.played-face-down"`.
- A Jest test on `POST /play-card` asserting that a face-down request makes
  `FakeSpineGateway` record an envelope named `card.played-face-down`, and a plain
  request still records `card.played` (regression guard).
- Playwright: the hand card modal shows a "Play Face Down" button; clicking it in solo
  mode triggers the clipboard-copy code path (however the existing `play-button` clipboard
  behavior is currently verified — extend that spec rather than adding a new file, if one
  exists).

## Before implementing

Per this ship's `CLAUDE.md` Task Implementation Process: consult
`owners/two-faced-cards-review` and `owners/shuffler-looks-like-itself-review` on the
concrete plan (button markup + CSS class, event-builder diff) before writing code — both
owners are already primed with this feature's context via spec.md's Further Notes, but
they haven't seen this ticket's specific diff yet.

## Comments
