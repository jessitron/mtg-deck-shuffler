# Add the card.played-face-down.v1 contract

Mountain: spine-gathers-data
Ship: fleet
Status: ready-for-agent

## What

Add `contracts/payloads/card.played-face-down.v1.json`, a sibling schema to
`contracts/payloads/card.played.v1.json` with the identical set of properties
(`card`, `face`, `zoneHint`, `frontImageUrl`, `backImageUrl`, `cardName`, `owner`,
`isCommander`, `gameCardIndex`) and the identical `required` list — only `$id`,
`title`, and the top-level `description` differ, since the meaning to a receiver is
"mint this concealed," not "mint this revealed." See spec.md's Implementation
Decisions for why this is a full duplicate file rather than a shared/extended schema.

Update `contracts/README.md`'s v0 catalog line (`table.created`, `seat.taken`,
`seat.joined`, `card.played`) to add `card.played-face-down`.

## Why this ticket is safe to land alone

Nothing sends or expects this event kind yet. The Spine's ingestion
(`services/spine/lib/event_contract.rb`) is fully generic over `payloads/<name>.v<n>.json`
— adding the file is the entire Spine-side change; there is no route or dispatch code to
touch. The Tabletop's ingestion is NOT generic (see ticket 02) but this ticket doesn't
change the Tabletop either, so it can't break anything currently running.

## Acceptance

- `contracts/payloads/card.played-face-down.v1.json` exists, validates the same shape as
  `card.played.v1.json`, `additionalProperties: true` (per the fleet's payload-evolution
  rule in `contracts/README.md`).
- `contracts/README.md`'s catalog line lists it.
- No other file changes. No ship's code changes in this ticket.
