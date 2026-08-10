# 05 — Contract validation gets real

Mountain: tabletop-replaces-mural
Ship: fleet
Status: done

**What to build:** Amend `envelope.v1` in place — `tableId` drops `format: uuid` (pre-Spine,
the table name is the id), and `initiator` becomes the object `{ seatId?, playerName }`.
Convert the Tabletop's existing receivers (card-arrival, seat-joined) to load `contracts/`
and validate every incoming envelope and payload on receipt, replacing the hand-rolled
if-chains. Unknown `name`/`version` is rejected loudly (not silently dropped or ignored).

This is free exactly now — zero conforming producers or consumers exist yet — and never
again after this ships.

**Blocked by:** None — can start immediately.

- [x] `envelope.v1.json` no longer requires `tableId` to be a uuid; its description says
      the table name is the id
- [x] `envelope.v1.json`'s `initiator` is `{ seatId?, playerName }`
- [x] The Tabletop's card-arrival handler validates incoming envelopes/payloads against
      `contracts/`, rejecting unknown name/version with a clear error
- [x] The Tabletop's seat-joined handler does the same
- [x] The old hand-rolled validation if-chains are deleted
- [x] Existing `cardArrival.test.ts` / `seatJoined.test.ts` suites pass with real
      validation wired in; a test covers unknown name/version rejection

**Landed (2026-08-09), wider than the checklist above — the mismatch was real, not
cosmetic:** today's Shuffler→Tabletop body was a flat "envelope-lite" shape (no
`tableId`/`occurredIn`/`visibility`/`traceparent`/`schemaVersion`, no nested `payload`,
plus convenience fields the contract's payload schemas explicitly excluded). Validating
that body against the real contract as written would reject every request. Jess's call:
make both ends actually conform now, while it's free. So this ticket also:

- Rewired the Shuffler (`apps/shuffler/src/port-tabletop/types.ts`,
  `sendToTable.ts`) to send the real nested envelope+payload, including minting a
  `traceparent` per send (`port-tabletop/traceparent.ts`, mirroring the Spine's
  `current_traceparent` and the Tabletop's `currentTraceparent`).
- Amended `contracts/payloads/card.played.v1.json` and `seat.joined.v1.json` in
  place (same "zero conforming producers/consumers yet" exception as envelope.v1,
  not a new policy — after this ships, reshaping either needs a `v2`): dropped the
  unused `seat` integer and the payload-level `seatId`/`playerName` (both redundant
  with the envelope's `initiator`), and promoted `frontImageUrl`/`backImageUrl`/
  `cardName` from off-schema scaffolding into real payload fields (two-faced-cards
  review, 2026-08-09) — `backImageUrl` is `["string","null"]` and **required**, never
  omitted, per watch point 17 (`null` ⇔ no printed back exists).
- Added `ajv`/`ajv-formats` to the Tabletop and a Dockerfile `COPY contracts/` so
  the runtime image can read the schemas it validates against.

**Known asymmetry, not fixed here (two-faced-cards review, 2026-08-09):** ticket 10's
`seat.joined.commanders` will carry the same `cardName`/`frontImageUrl`/`backImageUrl`
trio this ticket just contractized on `card.played`. Whether `commanders` gets the same
treatment or stays off-schema is ticket 10's call to make explicitly, not something to
inherit by default.
