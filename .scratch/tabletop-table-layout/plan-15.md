# Plan — ticket 15: deck name travels to the table's name label

Mountain: tabletop-replaces-mural
Ship: fleet (Shuffler + contracts + Tabletop; Spine gets tests only)

## Decisions

- **Contract**: new `contracts/payloads/seat.joined.v1.json`. Payload:
  `seatId` (string, minLength 8), `playerName` (string, minLength 1),
  `deckName` (string, minLength 1) — all **required**; `playmatImageUrl` (uri),
  `cardBackImageUrl` (uri), `sleeveColor` (`^#[0-9a-fA-F]{6}$`) — **optional**.
  `additionalProperties: false`. Ticket 17 wires the sleeve side; this schema is its home.
  Catalog line added to `contracts/README.md`.
- **Contract seam tests** live in the Spine's established pattern:
  `test/support/envelopes.rb` gains `seat_joined_envelope`; `ingestion_test.rb` gains
  valid (201) / invalid payload (422) / unknown schemaVersion (422) cases. No Spine
  app-code change — `EventContract` already resolves any `payloads/<name>.v<n>.json`.
- **Shuffler**: `SeatJoinedEvent` gains required `deckName`; `buildSeatJoinedEvent`
  and `sendSeatJoinedBestEffort` take it; all **three** call sites pass it
  (`app.ts:519` start-game, `:637` restart, `:1615` Yo fast-start — the ticket said
  two, there are three).
- **Tabletop**: `seatJoined.ts` requires `deckName` (fail loudly, matching the schema);
  forwards it into `ensurePlayerArea` (new optional field — the defensive re-run from
  `cardArrival.ts` has no deck name and must keep working).
- **Label composition** (design-owner ruling, 2026-08-08): **two lines, player name
  first**, no prefix, no separator glyph, verbatim deck name. Missing deck name
  degrades to exactly today's one-line label — no dangling blank line.
  Stock `text` shape props otherwise untouched (Orbitron is a recorded tldraw limit;
  restyling is out of scope).

## Test seams (per ticket)

1. Shuffler `test/port-tabletop/sendToTable.test.ts` — outbound payload carries `deckName`.
2. Contract seam — Spine ingestion tests as above.
3. Tabletop `test/seatJoined.test.ts` — label shape carries player name + deck name;
   missing `deckName` → 400.
