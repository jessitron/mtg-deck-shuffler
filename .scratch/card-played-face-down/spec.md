# Play Face Down: a new event kind for cards played concealed

Mountain: spine-gathers-data
Ship: fleet
Status: ready-for-agent

## Problem Statement

Evelyn asked for a "Play face down" button in the Shuffler (morph, manifest, foretell,
and similar effects all put a card into play without revealing it). Today the Shuffler
has no way to originate a concealed play at all:

- The only concealment that exists anywhere in the fleet is on the **Tabletop side**: a
  player can right-click an already-arrived, already-face-up `mtg-card` shape and choose
  "Turn face down" (`apps/tabletop/src/client/CardContextMenu.tsx`), which flips a plain
  `props.faceDown` boolean with no other data change. Concealment has never been
  something the Shuffler asks for at the moment a card is played.
- The two-faced-cards owner had this exact gap on a "buoy list" (Mural-parity items
  dropped for later) every time it came up: a Shuffler-side "Play Face-Down" button.
  This spec is the ticket that finally picks it up.
- `card.played` (`contracts/payloads/card.played.v1.json`) has no concealment field, and
  per the two-faced-cards owner's two-axis model, it shouldn't grow one: `face`
  (front/back — which printed side) and concealment are orthogonal bits. A morph is
  played face down *with a chosen face underneath* — the two must stay independent, not
  collapse into "flip to back and hide."
- Jess's call (2026-08-12): this isn't a variant of "play," it's a different thing,
  game-wise — so it gets its **own event kind**, `card.played-face-down`, not a
  `faceDown` flag bolted onto `card.played`.

## Solution

A new event kind, `card.played-face-down`, with a payload shaped exactly like
`card.played` (same fields: card identity, `face`, `zoneHint`, both real image URLs,
`cardName`, `owner`, `isCommander`, `gameCardIndex`) but a different `name` — the shape
is identical because the *facts* are identical (a card left hand, this is its identity,
this is the face chosen underneath); only the *meaning to a receiver* differs: mint it
concealed, not revealed.

Concretely:

- **Shuffler**: a new "Play Face Down" button next to "Play" in the hand card's modal.
  In solo/clipboard mode, it copies the fleet's existing generic card-back image
  (`CARD_BACK` / `cardBackImageUrl()`) to the clipboard instead of the real card image —
  so pasting into Mural/Miro/Discord shows a concealed card, matching what "Play"
  already does for a real reveal. In table mode, it sends `card.played-face-down` to the
  Spine's event log instead of `card.played` — best-effort, exactly like `card.played`
  today (`sendCardPlayedToSpineBestEffort`): game state mutates and persists immediately
  regardless of whether the Spine send succeeds, so there is no blocking send-then-commit
  step to fail here.
  Either way, the card moves to the `Table` location in the Shuffler's own game state
  exactly as "Play" does — the Shuffler doesn't track concealment itself; it's a
  Tabletop-rendering concern (per the two-faced-cards owner, concealment is *depicted*,
  never *enforced*).
- **Contract**: `contracts/payloads/card.played-face-down.v1.json`, same required fields
  as `card.played.v1.json`.
- **Tabletop**: on receiving `card.played-face-down`, mints the `mtg-card` shape exactly
  as `card.played` does, except `faceDown: true` from creation instead of `false`. No new
  rendering code needed — `cardRender.tsx`'s existing `faceDown` branch (sleeve
  rectangle → per-player card-back image → generic gray placeholder) already covers
  every case; a Tabletop investigation confirmed minting `faceDown: true` at birth is
  already a fully-supported state, not a new code path for the render layer. The
  existing "Turn face up"/"Turn face down" context menu keeps working unchanged
  afterward — a Shuffler-originated concealed card can be revealed at the table exactly
  like a manually-concealed one.
- **Spine**: no code change. `lib/event_contract.rb`'s `payload_schema` loads whatever
  `payloads/<name>.v<version>.json` file matches the incoming envelope's `name` —
  the new contract file alone is sufficient for the Spine to accept, dedup, and log this
  event kind on its admin pages, generically, the same way it already does for every
  other kind.

## User Stories

1. As Evelyn playing remotely, I want a "Play face down" button so I can put a morph,
   manifest, or foretold card into play without anyone (including my screen-share
   viewers) seeing its face.
2. As a player at a synced Tabletop table, I want a card I played face down to actually
   arrive concealed on the shared canvas, not face-up-then-manually-flipped, so that a
   fast-moving opponent never gets a frame where the real card was visible.
3. As a player who played a card face down, I want to later reveal it (turn it face up
   on the Tabletop) and see the *real* card, not a placeholder, so morph/unmorph plays
   through correctly.
4. As a player whose card is a two-faced card played face down, I want the chosen face
   (front or back) to still be tracked underneath the concealment, so that if the card is
   later revealed, the correct printed side shows — concealment and face are independent.
5. As Jess relying on the Spine's log as future Interpreter training data, I want "played
   concealed" to be a recognizably different event kind from "played," so the record
   doesn't quietly claim every play was a fully-revealed one.
6. As a developer reading the contract catalog, I want `card.played-face-down`'s payload
   schema to look exactly like `card.played`'s except for its name, so the two are
   obviously siblings, not independently-evolving shapes.
7. As a player in solo/clipboard mode (no table configured), I want "Play face down" to
   copy the generic card-back image to my clipboard, so pasting into Mural/Discord shows
   a concealed card the same way a normal play shows a revealed one.

## Implementation Decisions

- **Payload shape is a duplicate of `CardPlayedPayload`, not a shared/extended type.**
  Tempting to reuse `CardPlayedPayload` for both event kinds in TypeScript, but the
  contract schemas are independent files by design (`contracts/README.md`: "one schema
  per event kind") — write `card.played-face-down.v1.json` as its own file, and give it
  its own TS payload interface in `port-tabletop/types.ts`
  (`CardPlayedFaceDownPayload`) even though today it's field-for-field identical to
  `CardPlayedPayload`. This keeps the two kinds free to diverge later (e.g. if
  concealed plays ever need a field revealed plays don't) without a retroactive schema
  version bump.
- **No new field materializes on the Tabletop's shape or the Spine.** `mtg-card`'s
  `props.faceDown` already exists; the only change on the Tabletop is which literal
  (`true` vs `false`) `cardArrival.ts` passes to `mtgCardShape(...)` for this event kind,
  gated by which endpoint/handler received it. The Spine needs no code at all.
- **Ordering matters for table mode**: the Tabletop must accept
  `card.played-face-down` (ticket 02) before the Shuffler starts sending it (ticket 03).
  The Shuffler's send is send-then-commit and table-mode blocking — sending an event kind
  the Tabletop doesn't recognize yet would 422 there and 502 here, blocking the play with
  the existing `TableSendFailedError` modal, card stays in hand. Ticket 03 is `Blocked
  by: 01, 02`.
- **The Shuffler's existing per-card endpoint carries the new kind too** — `sendCardToTable`
  posts the whole envelope (any `name`) to `POST /api/tables/:tableName/cards`; no new
  Shuffler-side HTTP route is needed. The Tabletop's `cardArrival.ts` currently
  hard-validates `expectedName = "card.played"` on that one endpoint (there's no
  generic name-driven dispatch on the Tabletop the way the Spine has) — ticket 02 has to
  decide whether that endpoint grows a second accepted name or a sibling handler branches
  on `envelope.name` before validating; either is fine, left to whoever picks up ticket 02.
- **Solo/clipboard mode needs its own button wiring**, not a byproduct of the table-mode
  event. `public/game.js`'s `copyCardToClipboard(cardId, face)` fetches
  `/proxy-image?cardId=...&face=...` (a real Scryfall-backed image) — "Play face down"
  needs a sibling function that instead fetches the fleet's static `CARD_BACK` asset
  directly (no proxy needed; it's already a local file), so clipboard-mode concealment
  needs zero server round-trip beyond the existing `/play-card` POST that moves the card
  to `Table`.
- **The button lives in the hand card's modal only** (`formatModalCardActionsForHand`,
  `apps/shuffler/src/view/play-game/game-modals.ts`), next to "Play"/"Discard" — not on
  the Revealed-cards modal. Concealed plays start hidden by definition; a card already in
  the face-up Revealed grid has already been shown, so "play it face down from there"
  isn't a real scenario worth a second button.
- **The Shuffler doesn't gain a `faceDown` concept on `GameCard` or `PersistedGameState`.**
  Concealment is a one-shot instruction to the receiver at play time, not durable
  Shuffler-side state — consistent with the two-faced-cards owner's "concealment is
  depicted, never enforced" framing, and avoiding a version bump on persisted state.

## Testing Decisions

- **Contract**: no dedicated test beyond what each consuming ship's suite already
  exercises against the new schema file (ajv/json_schemer will simply find it).
- **Tabletop**: extend whatever test currently covers `handleCardArrival` for
  `card.played` with a sibling case for `card.played-face-down`, asserting the minted
  shape has `props.faceDown === true` and both `frontImageUrl`/`backImageUrl` still
  populated for later reveal.
- **Shuffler**: a Jest test on `buildCardPlayedFaceDownEvent` (mirroring
  `test/port-tabletop/cardPlayedEvent.test.ts`'s coverage of `buildCardPlayedEvent`) —
  same assertions, different event name. A test on `POST /play-card` (or a new
  endpoint/param, whichever ticket 03 lands on) asserting `tabletopPort.sendCardToTable`
  receives an envelope with `name: "card.played-face-down"` when face-down was
  requested, using `FakeTabletopGateway`. A Playwright check that the modal's "Play Face
  Down" button exists on a hand card and that clicking it (solo mode) triggers the
  clipboard-copy path — likely by extending an existing `verify-*.spec.ts` rather than a
  new spec file.
- **Cross-ship**: `test/verification/verify-tabletop-integration.spec.ts` already spawns
  a real Tabletop from `apps/tabletop/dist` — extend it with a case that plays a card
  face down and asserts the shape arrives with `faceDown: true` on the real Tabletop.

## Out of Scope

- **Revealing/unmorphing flow beyond the Tabletop's existing "Turn face up" toggle.**
  This spec makes concealed arrival possible; it doesn't add any new reveal mechanic —
  the existing context-menu flip is reused as-is.
- **Any Spine admin-page display work.** The generic event log rendering already shows
  any event kind's payload; a nicer-looking row for `card.played-face-down` specifically
  is a follow-on if Jess wants it, not part of landing the feature.
- **Revealed-cards modal gaining a "Play Face Down" action.** See Implementation
  Decisions — judged not a real scenario.
- **Changing `card.played` itself.** It's untouched; `card.played-face-down` is a wholly
  separate, sibling event kind.
- **A generic name-driven dispatcher on the Tabletop's inbound side.** Ticket 02 only
  needs `card.played-face-down` to reach the mint path; building the fully generic
  dispatcher the Spine already has is a larger refactor not required for this feature.

## Further Notes

- Consult `owners/two-faced-cards` again on ticket 03's Shuffler implementation once
  drafted (the button + event-building code) — this spec's design was shaped by that
  owner's two-axis model and its "no new leak" ruling on `backImageUrl`, but the owner
  should see the actual diff before it lands, per the fleet's owner-review workflow.
- Consult `owners/shuffler-looks-like-itself` on the new button's styling in ticket 03 —
  it's a `.modal-action-button` sibling to "Play"/"Discard", should follow the same
  press physics and radius rules as every other button in that modal.
- The three tickets are ordered by their `Blocked by:` lines: 01 (contract) unblocks both
  02 (Tabletop) and 03 (Shuffler); 02 also unblocks 03, so 03 is the last to implement.
  01 and 02 can be worked in either order relative to each other once 01 exists, but 03
  must come last for table mode not to 502 on a real game.
