# 02 — Spine: `/join` becomes idempotent and administers the full seat

Mountain: spine-gathers-data
Ship: spine
Status: resolved

**What to build:** `POST /join` on the Spine grows from a thin identity call
(`{name, playerName}` → `{tableId, seatNumber}`) into the one place a seat gets fully
administered: create the table if it doesn't exist, confirm there's room, assign a seat,
mint both `seat.taken` (identity) and `seat.joined` (decoration: deck name, playmat,
sleeve, commanders, `gameUrl`) into the Spine's own log in one transaction, notify the
Tabletop directly over HTTP (best-effort — a down Tabletop doesn't fail the join), and
hand back a `tableUrl`. A retry with the same `gameId` returns the same seat instead of
minting a second one.

This ticket is Spine-only and fully testable in isolation: nothing on the Shuffler side
changes yet (that's ticket 03), so the game keeps working exactly as it does today
throughout this ticket.

Includes the one-field contract edit (`contracts/payloads/seat.joined.v1.json` gains
optional `gameUrl`) since the Spine is what mints the payload — no version bump, no
`seat.joined.v2.json`.

**Blocked by:** None — can start immediately

- [x] `seats` table gains a `game_id` column (string, nullable, unique when present)
- [x] `POST /join`'s request body accepts `{gameId, name, playerName, deckName,
      playmatImageUrl, cardBackImageUrl, sleeveColor, commanders, gameUrl}` — only
      `gameId`, `name`, `playerName`, `deckName` required
- [x] Lookup order: find existing seat by `game_id` first (idempotent replay — return
      unchanged, mint no new events); otherwise proceed exactly as `join!` does today
      (find-or-create table, take next open seat), storing `game_id` on the new seat
- [x] `Spine::Table.join!`'s existing retry-on-`NameTaken` race handling is unchanged and
      only reached after the `game_id` lookup
- [x] `take_seat!` mints `seat.taken` (`seatId`, `seat`, `playerName`), then in the same
      transaction mints `seat.joined` with the full decoration payload including `gameUrl`
- [x] `contracts/payloads/seat.joined.v1.json` gains optional `gameUrl` (string, uri);
      Spine keeps minting `schemaVersion: 1`
- [x] After the transaction commits, the Spine calls the Tabletop's existing
      `POST /api/tables/:tableName/events` with the `seat.joined` envelope it just
      minted — best-effort (failure is a span attribute, doesn't roll back the join, no
      thrown error); new `TABLETOP_URL` env var for this outbound call (mirrors the
      Shuffler's own)
- [x] Response body gains `tableUrl`: `{tableId, seatNumber, tableUrl}`, built from new
      `TABLETOP_PUBLIC_URL` env var as `${TABLETOP_PUBLIC_URL}/t/${name}`
- [x] Consult `owners/fleet-is-observable` before finalizing tracing on the new
      Spine→Tabletop outbound call (span attributes on failure, `traceparent`
      propagation, per the existing `sendCardPlayedToSpineBestEffort` precedent)
- [x] Consult `owners/two-faced-cards` that `commanders[].backImageUrl` round-trips
      through the Spine's JSON handling unchanged (string vs. `null`, present exactly
      when there's a back face)
- [x] Spine integration test (extend `services/spine/test/integration/events_test.rb`'s
      style, or new `join_test.rb`): real Roda app, real SQLite test DB, a fake Tabletop
      HTTP server standing in for `TABLETOP_URL`. Cases: first join creates
      table+seat+both events and calls the fake Tabletop; a second `/join` with the same
      `gameId` returns the same `tableId`/`seatNumber`/`tableUrl` and mints no new
      events; two different `gameId`s at the same table name get different seats; a
      `/join` when the fake Tabletop is down still returns 2xx with the seat created;
      the admin log for a joined table shows a full `seat.joined` payload (deckName,
      playmat, sleeve, commanders, gameUrl)
- [x] `bin/test` passes
