# Ticket 03 plan: Shuffler "Play Face Down" button

Scope: `apps/shuffler` only. Adds a "Play Face Down" action to the hand card's modal,
alongside "Play"/"Discard". Same `POST /play-card/:gameId/:gameCardIndex` endpoint,
distinguished by a `face-down` hx-vals flag. Table mode sends `card.played-face-down`
via the Spine (best-effort, exactly like `card.played` today); solo mode copies the
static card-back image to the clipboard instead of a real Scryfall image. No new
domain/persisted state for concealment — the card still just moves to `Table`.

## Files touched and diffs

### 1. `src/port-tabletop/types.ts` — new event kind (deliberate duplicate)

Add, alongside the existing `card.played` shapes:

```ts
export const CARD_PLAYED_FACE_DOWN_EVENT_NAME = "card.played-face-down" as const;

export interface CardPlayedFaceDownPayload {
  card: {
    scryfallId: string;
    instanceId: string;
  };
  face: "front" | "back";
  zoneHint: ZoneHint;
  frontImageUrl: string;
  backImageUrl: string | null;
  cardName: string;
  owner: string;
  isCommander: boolean;
  gameCardIndex: number;
}

export type CardPlayedFaceDownEvent = EventEnvelope<CardPlayedFaceDownPayload>;

export function buildCardPlayedFaceDownEvent(
  gameCard: GameCard,
  instanceId: string,
  initiator: Initiator,
  owner: string,
  zoneHint: ZoneHint,
  tableName: string
): CardPlayedFaceDownEvent {
  // same body as buildCardPlayedEvent, except:
  //   name: CARD_PLAYED_FACE_DOWN_EVENT_NAME
  //   origin: "shuffler.playCardFaceDownSubmit"
}
```

This is a straight copy-paste of `CardPlayedPayload`/`buildCardPlayedEvent`, not a
shared/parameterized function — per spec.md's Implementation Decisions, the two kinds
stay free to diverge later (e.g. concealed plays gaining a field revealed plays don't),
so no retroactive schema version bump is needed then.

### 2. `src/port-spine/sendToSpine.ts` — pick the variant

`sendCardPlayedToSpineBestEffort` gains a `faceDown: boolean = false` parameter:

```ts
export async function sendCardPlayedToSpineBestEffort(
  spinePort: SpinePort | undefined,
  game: GameState,
  gameCard: GameCard,
  zoneHint: ZoneHint,
  sessionId?: string,
  faceDown = false
): Promise<void> {
  ...
  const event: CardPlayedEvent | CardPlayedFaceDownEvent = faceDown
    ? buildCardPlayedFaceDownEvent(gameCard, gameCard.cardInstanceId, ..., zoneHint, tableId)
    : buildCardPlayedEvent(gameCard, gameCard.cardInstanceId, ..., zoneHint, tableId);
  await spinePort.sendEvent(tableId, event);
  ...
}
```

Still best-effort: any failure is swallowed (span attribute + `log.warn`), same as today.
`HttpSpineGateway`/`FakeSpineGateway` need no change — they just forward whatever
envelope shape they're given.

### 3. `src/app.ts` — read the flag, thread it through

- `sendCardBeforeMutate` (~line 130) gains a `faceDown: boolean` parameter, passed
  straight to `sendCardPlayedToSpineBestEffort`.
- `POST /play-card/:gameId/:gameCardIndex` (~line 1407): read
  `req.body["face-down"] === "true"` (htmx's default form encoding sends the hx-vals
  boolean as the *string* `"true"`, not a JS boolean) into a local `faceDown` const,
  and pass it into the `beforeMutate` callback's call to `sendCardBeforeMutate(...)`.
  `game.playCard(...)` itself is unchanged — concealment is not domain state; the card
  moves to `Table` exactly as a normal "Play" does.
- No new route. No change to `/discard-card` (out of scope — concealment only applies
  to originating a play).

### 4. `src/view/play-game/game-modals.ts` — the button

`formatModalActionButton` gains an optional `faceDown?: boolean` parameter. When set,
its `hx-vals` JSON includes a second key: `{"expected-version": N, "face-down": true}`.

`formatModalCardActionsForHand` gets a fourth action alongside Play/Discard/Put on
Top/Put on Bottom:

```ts
{
  action: "Play Face Down",
  endpoint: "/play-card",
  title: inTableMode
    ? "Send face down to the table and remove from hand"
    : "Copy card back and remove from hand",
  cssClass: `modal-action-button ${inTableMode ? "table-face-down-button" : "play-face-down-button"} face-down-button`,
  faceDown: true,
}
```

I'm adding `faceDown` as a field on the `CardAction` shape (or passing it as a sibling
positional arg to `formatModalActionButton` the same way `cardId`/`currentFace`/
`inTableMode` are threaded today) — whichever keeps the existing call sites
(`formatModalCardActionsForRevealed`, `formatModalCardActionsForLibrary`,
`formatModalCardActionsForTable`) unaffected, since none of them pass `faceDown`.

This button is **only added to the hand card's modal** (`formatModalCardActionsForHand`)
— not Revealed, Library, or Table modals. Matches "Play"/"Discard" in every other way:
same `leavesHand` treatment (so `data-card-id`/`data-current-face` are attached in solo
mode, same as "Play"), same auto-close-modal `hx-on::after-request` behavior.

CSS classes proposed (new, need `owners/shuffler-looks-like-itself-review`):
- `.face-down-button` — a marker class both game.js listeners can check without caring
  about table vs. solo mode, for anything shared between the two variants (if any).
- `.play-face-down-button` — solo/clipboard mode, sibling to `.play-button`, matched by
  a new `htmx:beforeRequest` listener in `game.js`.
- `.table-face-down-button` — table mode, sibling to `.table-play-button`, added to that
  listener's selector check (or a sibling check) for the "Sent to table" + disable
  feedback.

Styling: I plan a `.modal-action-button.face-down-button` CSS rule in `playmat.css`,
sitting next to the existing `.play-button`/`put-in-hand-button`/etc. rules (same
`:hover`/`:active` box-shadow pattern, own fill + own darker shadow color — matching
`shuffler-looks-like-itself`'s "colors stay per-site" rule for `.pushable-flat`-adjacent
buttons, though note `.modal-action-button` itself is a separate, older button family in
this file that doesn't use `.pushable-flat` at all — its siblings all hard-code hex
fills/shadows, e.g. `.play-button` is `#e91e63`/`#90123d`). I don't have a specific color
picked — my instinct is a muted violet/gray suggesting "concealed," but I want the
design owner's read on whether to introduce a new hex (matching the existing sibling
buttons' pattern) or reach for a design token instead, since this file doesn't currently
use tokens for these buttons at all.

**Question for `shuffler-looks-like-itself-review`**: should the new
`.modal-action-button.face-down-button` follow the existing sibling buttons' pattern
(a new hard-coded hex fill + matching darker shadow, no token), or is this a good place
to start moving `.modal-action-button` variants onto the fleet's shared tokens? And any
opinion on what color reads as "concealed" without colliding with the existing palette
(pink=Play, purple=Put in Hand, indigo=Put on Top, deep purple=Put on Bottom, blue=Copy,
green=Gatherer, orange=Flip)?

### 5. `public/game.js` — clipboard concealment + table feedback

New function `copyCardBackToClipboard()`, sibling to `copyCardToClipboard(cardId, face)`:
fetches the fleet's static `/images/mtg-card-back.jpg` directly (no `/proxy-image` round
trip — it's already served locally, no Scryfall lookup needed) and clipboard-writes the
blob, same span-wrapped shape as `copyCardToClipboard`.

New `htmx:beforeRequest` listener (sibling to the existing `play-button` one, ~line 98):
matches `.play-face-down-button`, calls `copyCardBackToClipboard()`, sets `"Copied!"` /
`"Copy failed 😨"` text and disables the button — same pattern as the existing listener,
just no `cardId`/`face` needed since it's always the same generic card-back image.

Existing `.table-play-button` listener (~line 90-95, sets "Sent to table" + disables):
extend its selector to also match `.table-face-down-button` (e.g.
`classList.contains("table-play-button") || classList.contains("table-face-down-button")`),
so the face-down table button gets identical in-flight feedback.

## Testing plan

1. `test/port-tabletop/cardPlayedFaceDownEvent.test.ts` (new file, mirroring
   `cardPlayedEvent.test.ts`'s coverage of `buildCardPlayedEvent`) — same assertions,
   `name: "card.played-face-down"`, `origin: "shuffler.playCardFaceDownSubmit"`.
2. A Jest test exercising `POST /play-card` end-to-end against `createApp(...)` wired
   with a `FakeSpineGateway`, an in-memory persist/card-repository stack, and a
   table-mode game seeded directly via `GameState.newGame(...)` +
   `persistStatePort.save(...)`: asserts a face-down request (`face-down: "true"` in the
   POST body) makes the fake record an envelope named `card.played-face-down`, and a
   plain request (no flag) still records `card.played` (regression guard). No existing
   Jest test drives `createApp` over real HTTP today (all HTTP-level coverage lives in
   Playwright specs) — this test starts the app on an ephemeral port via
   `http.createServer(app).listen(0)` and hits it with `fetch`, closing the server after.
3. Playwright: extend `test/verification/verify-table-mode.spec.ts` (already covers the
   solo/table hand-card-modal "Play" flow) with a case that opens the hand card modal and
   asserts a "Play Face Down" button is present; and extend whatever spec covers the
   solo/clipboard behavior for "Play" (`verify-table-mode.spec.ts`'s existing pattern, or
   a grep turns up the exact one) with a case clicking "Play Face Down" in solo mode and
   asserting the clipboard-copy code path fires (button text becomes "Copied!"/"Copy
   failed 😨" and the button disables) — extending an existing spec, not a new file.

## Questions for the two owners

**`owners/two-faced-cards-review`**: does this diff correctly keep `face` (front/back)
and concealment orthogonal? The face-down payload carries the same `face`/
`frontImageUrl`/`backImageUrl` fields as `card.played`, computed identically
(`gameCard.currentFace`, `getCardImageUrl(...)`, `twoFaced` gate for `backImageUrl`) —
concealment never touches which face was chosen underneath. Also: is duplicating
`CardPlayedPayload`/`buildCardPlayedEvent` verbatim (rather than any shared helper) the
right level of duplication, or is there a two-faced-cards-owned invariant this should
route through instead?

**`owners/shuffler-looks-like-itself-review`**: the CSS class question above, plus: does
adding a fourth button to the hand-card modal (going from 4 to 5 actions) need any layout
consideration in `playmat.css`'s modal button-group rules?
