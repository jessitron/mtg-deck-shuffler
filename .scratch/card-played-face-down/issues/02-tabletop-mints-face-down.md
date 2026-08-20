# Tabletop mints card.played-face-down shapes already concealed

Mountain: spine-gathers-data
Ship: tabletop
Status: ready-for-agent

Blocked by: 01

## What

Make the Tabletop's inbound Spine-SSE path accept `card.played-face-down` and mint the
`mtg-card` shape with `faceDown: true`, instead of the hard-coded `faceDown: false` at
`apps/tabletop/src/server/cardArrival.ts:115`. There is no HTTP route to extend here —
`card.played` arrives only over the Spine SSE subscription, and `card.played-face-down`
needs to arrive the same way.

## Facts gathered for this ticket (verified against the current code)

- `card.played` has no HTTP entry point on this ship any more. `spineEventDispatch.ts`'s
  `dispatchSpineEvent(tableName, event)` inspects each envelope received over the
  per-room Spine SSE subscription (`spineSubscriber.ts`) and, today, only acts when
  `event.name === "card.played"`, handing off to `cardArrival.ts`'s `applyCardArrival`.
  Every other kind on the stream is currently ignored. This ticket needs
  `dispatchSpineEvent` to also act on `event.name === "card.played-face-down"`.
- `apps/tabletop/src/server/contractValidation.ts`'s `validateIncomingEvent<T>(body,
  expectedName)` rejects any envelope whose `name` doesn't match the caller-supplied
  `expectedName` (line ~54-56), and looks up a payload validator from a hand-built map
  keyed by `"name:schemaVersion"` (`payloadValidators`, lines ~22-25). This map needs a
  `"card.played-face-down:1"` entry pointing at the new schema file from ticket 01.
- `apps/tabletop/src/server/cardArrival.ts`'s `applyCardArrival(tableName, body)` calls
  `validateIncomingEvent<CardPlayedPayload>(body, "card.played")` — hard-wired to one
  name. There is no name-driven dispatch to extend; decide whether `applyCardArrival`
  grows a second accepted name (read `body`'s `name` before validating, branch to
  `faceDown: envelope.name === "card.played-face-down"`) or a new payload type
  parallels `CardPlayedPayload` and a small wrapper picks the right `expectedName`/type
  before delegating to shared mint logic. Either is fine — this repo's fleet CLAUDE.md
  doesn't mandate one specific dispatch shape here, and the Spine's fully-generic
  dispatch is explicitly out of scope for this ticket (see spec.md). Note
  `testSeedRoute.ts` (`POST /test/tables/:tableName/cards`, only mounted when
  `ENABLE_TEST_SEED_ROUTE=true`) also calls `applyCardArrival` directly — it's a
  test-only seam for specs with no live Spine, and whatever shape `applyCardArrival`
  ends up with, that seam keeps working unchanged since it just forwards whatever body
  it's given.
- The mint call itself (`cardArrival.ts:99-122`, `mtgCardShape(...)`) needs exactly one
  literal changed for the face-down case: `faceDown: false` → `faceDown: true`. Nothing
  else about the call changes — `frontImageUrl`, `backImageUrl`, `sleeveColor`,
  `cardBackImageUrl` are all already populated identically for both event kinds.
- No shape-type or render change is needed. `apps/tabletop/src/shared/mtgCardShape.ts`'s
  `faceDown: boolean` prop and `apps/tabletop/src/client/shapes/cardRender.tsx`'s
  existing branch (sleeve rectangle when `sleeveColor` set → per-player
  `cardBackImageUrl` image → generic `#3a3a3a` placeholder) already fully cover
  `faceDown === true` regardless of how the shape came to be in that state. Confirmed:
  nothing downstream assumes `faceDown` starts `false`.
- The existing "Turn face up"/"Turn face down" context-menu action
  (`apps/tabletop/src/client/CardContextMenu.tsx`, ~lines 65-76) needs no change — it
  toggles the same boolean prop regardless of how the card arrived, so a
  Shuffler-originated concealed card can be revealed at the table exactly like a
  manually-concealed one, for free.

## Acceptance

- A `card.played-face-down` envelope arriving over the Spine SSE subscription (or via
  `testSeedRoute.ts` in a test) mints an `mtg-card` shape with `props.faceDown === true`,
  `frontImageUrl`/`backImageUrl` populated exactly as a `card.played` envelope would.
- A malformed or unrecognized-name envelope is still rejected as invalid (fail loudly,
  per `contracts/README.md`) — this ticket must not weaken existing `card.played`
  validation while adding the sibling.
- Turning the newly-minted shape face-up via the existing context menu reveals the real
  card image.
- Test: extend whatever currently covers `handleCardArrival` with a
  `card.played-face-down` case (see spec.md Testing Decisions).

## Comments
