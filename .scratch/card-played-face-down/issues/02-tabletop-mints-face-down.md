# Tabletop mints card.played-face-down shapes already concealed

Mountain: spine-gathers-data
Ship: tabletop
Status: ready-for-agent

Blocked by: 01

## What

Make `POST /api/tables/:tableName/cards` (or a sibling route/branch, implementer's
choice — see below) accept `card.played-face-down` and mint the `mtg-card` shape with
`faceDown: true`, instead of the hard-coded `faceDown: false` at
`apps/tabletop/src/server/cardArrival.ts:115`.

## Facts gathered for this ticket (verified against the current code)

- `apps/tabletop/src/server/contractValidation.ts`'s `validateIncomingEvent<T>(body,
  expectedName)` rejects any envelope whose `name` doesn't match the caller-supplied
  `expectedName` (line ~54-56), and looks up a payload validator from a hand-built map
  keyed by `"name:schemaVersion"` (`payloadValidators`, lines ~22-25). This map needs a
  `"card.played-face-down:1"` entry pointing at the new schema file from ticket 01.
- `apps/tabletop/src/server/cardArrival.ts:32` calls
  `validateIncomingEvent<CardPlayedPayload>(req.body, "card.played")` — hard-wired to one
  name. There is no name-driven dispatch to extend; decide whether `handleCardArrival`
  grows a second accepted name (read `req.body.name` before validating, branch to
  `faceDown: req.body.name === "card.played-face-down"`) or a new payload type
  parallels `CardPlayedPayload` and a small wrapper picks the right `expectedName`/type
  before delegating to shared mint logic. Either is fine — this repo's fleet CLAUDE.md
  doesn't mandate one specific dispatch shape here, and the Spine's fully-generic
  dispatch is explicitly out of scope for this ticket (see spec.md).
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

- A `card.played-face-down` envelope posted to the existing endpoint mints an `mtg-card`
  shape with `props.faceDown === true`, `frontImageUrl`/`backImageUrl` populated exactly
  as a `card.played` envelope would.
- A malformed or unrecognized-name envelope still 422s (fail loudly, per
  `contracts/README.md`) — this ticket must not weaken existing `card.played` validation
  while adding the sibling.
- Turning the newly-minted shape face-up via the existing context menu reveals the real
  card image.
- Test: extend whatever currently covers `handleCardArrival` with a
  `card.played-face-down` case (see spec.md Testing Decisions).

## Comments
