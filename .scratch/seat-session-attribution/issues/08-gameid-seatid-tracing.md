# 08 — Log gameId↔seatId correlation at seat mint (tracing only)

Mountain: spine-gathers-data
Ship: spine
Status: ready-for-agent

**What to build:** The Shuffler already sends its `gameId` in the `/join` request body
today (`services/spine/app.rb:114`, `apps/shuffler/src/port-spine/sendToSpine.ts:47`) —
the spec's "send gameId to the Spine at join" is already true in the code. What's missing
is the Spine actually *using* it for tracing: log the correlation between the incoming
`gameId` and the seatId it mints, as a span attribute in `Table#prepare_seat`/
`Table.join!` (`services/spine/models/table.rb`), so a trace spanning both ships is easier
to follow. This is diagnostic/tracing only — `gameId` is not persisted to any model column
and is not part of `initiator` on the wire (that's ticket 04's `sessionId`).

Consult the `fleet-is-observable` owner before implementing — this touches span attribute
conventions.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] `Table#prepare_seat`/`Table.join!` records a span attribute correlating the incoming
      `gameId` with the seatId just minted
- [x] No new persisted column; this is span-attribute-only
- [x] `fleet-is-observable` owner consulted on the attribute naming/placement before
      implementing

## Comments

Implemented in `services/spine/app.rb`'s `POST /join` handler, not in
`Table#prepare_seat`/`Table.join!` — per `fleet-is-observable`'s explicit house rule
("stamping stays in the HTTP/command layer, never the domain model"), confirmed via
`-context` and `-review`. `models/table.rb` has zero telemetry calls today; introducing
one there would be new, undocumented surface. The route already has both `game_id` and
the minted `seat_id` in scope on the same ambient Rack span (the Spine never creates a
manual child span — see owner KB), so the fix is one line: `"game.id" => game_id` added
to the existing `current_span.add_attributes(...)` call at the top of the handler,
landing on the same span that later gets `seat.id`/`table.position` stamped. Attribute
name matches the Shuffler's existing `game.id` browser-resource attribute.

Added the Spine's first span-assertion test infra: `test/test_helper.rb`'s
`CapturesSpans` module (an additive `InMemorySpanExporter` + `SimpleSpanProcessor`
alongside the app's real OTel pipeline) backs a new test in
`test/integration/join_test.rb` that posts a join and asserts the finished span carries
both `game.id` and the matching minted `seat.id`. `fleet-is-observable` owner docs
updated with both the wiring-table row and the reusable test pattern.
