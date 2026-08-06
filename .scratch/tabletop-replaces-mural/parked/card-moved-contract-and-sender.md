# Design the card.moved event contract and the Tabletop→Spine sender

Mountain: tabletop-replaces-mural
Type: grilling
Status: parked — belongs to map 5, The table reports (not charted). See `README.md` in this directory.

## Question

The keystone of `TODO.md`'s `tabletop-survives-restart` line. Decided already
(2026-08-01): persistence is **event-sourced, not snapshotted** — table state survives a
restart by logging semantic events to the Spine and replaying them on room startup, not
by snapshotting the tldraw doc. [Tabletop cards report zone entry as named
events](../../tabletop-card-shape/issues/01-zone-entry-events.md) supplies the semantic
event (card entered a zone) as an in-process `console.log`-only notion; this ticket
decides how that becomes a real, transmitted event:

- The **`card.moved` contract payload** — `contracts/payloads/` today has only
  `card.played.v1.json`, `seat.taken.v1.json`, `table.created.v1.json`. What fields does
  `card.moved` need (instance id, source zone, destination zone, seat, timestamp — what
  else)? Validate the shape against both the Node (Tabletop) and Ruby (Spine) sides per
  `contracts/README.md`.
- The **Tabletop→Spine sender** — a data-flow direction that doesn't exist yet (today
  it's Shuffler→Spine and Spine→Tabletop only). The receiving end already exists:
  `POST /tables/:table_id/events` in the Spine. Consult the `fleet-is-observable` owner
  before wiring this — it's a new outbound call path that needs the same trace-context
  propagation discipline as the rest of the fleet.

Out of scope for this ticket: the **replay-on-boot** mechanism and the **freeform-doodle
snapshot store** — both wait on this payload's shape and are recorded as fog in the
map's Not yet specified, not blocked tickets, until this resolves.

Unblocked: the semantic event this needs already exists ([Tabletop cards report zone
entry as named events](../../tabletop-card-shape/issues/01-zone-entry-events.md)).
