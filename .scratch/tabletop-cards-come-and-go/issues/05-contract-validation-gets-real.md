# 05 — Contract validation gets real

Mountain: tabletop-replaces-mural
Ship: fleet
Status: ready-for-agent

**What to build:** Amend `envelope.v1` in place — `tableId` drops `format: uuid` (pre-Spine,
the table name is the id), and `initiator` becomes the object `{ seatId?, playerName }`.
Convert the Tabletop's existing receivers (card-arrival, seat-joined) to load `contracts/`
and validate every incoming envelope and payload on receipt, replacing the hand-rolled
if-chains. Unknown `name`/`version` is rejected loudly (not silently dropped or ignored).

This is free exactly now — zero conforming producers or consumers exist yet — and never
again after this ships.

**Blocked by:** None — can start immediately.

- [ ] `envelope.v1.json` no longer requires `tableId` to be a uuid; its description says
      the table name is the id
- [ ] `envelope.v1.json`'s `initiator` is `{ seatId?, playerName }`
- [ ] The Tabletop's card-arrival handler validates incoming envelopes/payloads against
      `contracts/`, rejecting unknown name/version with a clear error
- [ ] The Tabletop's seat-joined handler does the same
- [ ] The old hand-rolled validation if-chains are deleted
- [ ] Existing `cardArrival.test.ts` / `seatJoined.test.ts` suites pass with real
      validation wired in; a test covers unknown name/version rejection
