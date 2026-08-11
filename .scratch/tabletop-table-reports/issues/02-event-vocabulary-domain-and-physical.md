# The event vocabulary: domain events and physical events

Mountain: tabletop-replaces-mural
Type: grilling
Status: resolved
Blocked by: 01

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

Out of scope for this ticket: the **replay-on-boot** mechanism — it waits on this payload's
shape and is recorded as fog in the map's Not yet specified until this resolves. A
**freeform-doodle snapshot store** was this ticket's original idea for handling arbitrary
positional state; see the Answer below for why it's rejected outright, not deferred.

Unblocked: the semantic event this needs already exists ([Tabletop cards report zone
entry as named events](../../tabletop-card-shape/issues/01-zone-entry-events.md)).

## Note (2026-08-07): the sender needs identity the session doesn't have yet

Whatever sends `card.moved` (and friends) to the Spine needs to stamp each event with
**player name and the Shuffler game id**. Checked the code: `playerName` already rides
in on `seat.joined`'s `initiator.playerName` (used for the seat label and the
`player.name` span attribute in `seatJoined.ts`/`cardArrival.ts`), but **`gameId` appears
nowhere in `apps/tabletop/src`** — it has never crossed from the Shuffler. So part of
this ticket's scope is getting both onto the tldraw session/room state (not just
per-request) so the outbound sender can read them when an event fires, not just at
`seat.joined` time.

## Answer

**Scope grew beyond `card.moved` alone.** This ticket's original question was scoped to zone
entry, forced by the replay-on-boot need. Resolved scope is wider: all of `tabletop-physics`
ticket 21's vocabulary (`card.tapped`/`untapped`, `card.flipped`, `card.turnedFaceDown`,
`counter.attached`, plus zone transitions) becomes Spine contract payloads, not just zone-move —
there's no reason the others should stay Honeycomb-only forever once the pattern exists. This
ticket designs the contracts only; the sender and the `gameId`/`playerName` identity gap noted
above are still deferred (see the map's Not yet specified) — a contract can be reviewed and
merged without also reviewing a new outbound network path.

**Domain events and physical events are two independent layers, not one thing reconstructing
the other.** A domain event says what a gesture *means* (a card entered a zone, a card tapped); a
physical event says *where something physically went*. Both can fire from a single user action —
dragging a card from hand to battlefield fires both `card.repositioned` (physical: the drag) and
`card.moved` (domain: the zone transition) — because a card can also just get shuffled around
*within* one zone (physical only, no domain event at all), and — the case that forced this
distinction to exist — a card can move meaningfully *without* crossing a zone boundary at all.

**Why physical events exist, concretely:** a future Interpreter (Mountain 3, not yet built) will
read raw motion to guess game meaning nobody told it directly. Moving a card across your own
battlefield toward an opponent's side can mean "I'm attacking" — and that gesture never crosses a
zone, so `sourceZone`/`destinationZone` would read `battlefield` → `battlefield` and carry zero
signal. Only actual coordinates carry the thing an interpreter would need to notice. This is
consistent with this ship's own charter (`SEAMAP.md`): physics reports geography, never meaning
— the Tabletop's job is to capture the motion faithfully, not to decide it's an attack.

**`card.moved.v1` (domain, zone transition):** `instanceId`, `sourceZone`, `destinationZone`. No
coordinates. Includes both source and destination (not destination alone, which would be
technically re-derivable from replaying prior events) for the same denormalized-for-convenience
reason `card.played.v1`'s `zoneHint` already exists.

**`card.repositioned.v1` (physical, motion):** `instanceId`, `fromX`/`fromY`, `toX`/`toY`,
`fromRotation`/`toRotation`, `zone`. One event per *settled* drag, reusing the exact debounce
discipline `tabletop-physics` ticket 21 already built (`GENERIC_SETTLE_MS`) rather than firing
per pointer-move.

Considered and explicitly rejected, in order:

- **Sampling the full path/route**, not just start and end position — "I only care about
  from-to, I don't care about the route." Would have meant either a sampled-points array on the
  one settled event, or abandoning the settle-debounce to log intermediate motion — neither
  survived.
- **A standalone drag-duration field** — reversed once, then reversed back to "not on its own,"
  landing on: no separate `durationMs` field. (If path sampling had been kept, per-point
  timestamps would have ridden along for free; without a path array, there's nothing to attach
  timing to.)
- **Computing which other shapes are near the card at landing**, inside this event. It's a
  cross-shape join, not a fact about this card's own motion, and it's fully reconstructable later
  from position data other events already capture — an Interpreter can compute it when it exists,
  rather than this event pre-computing a relationship whose shape isn't known yet.
- **A freeform-doodle snapshot store** for positional state generally — this ticket's own
  original idea, rejected outright: it's a snapshot mechanism, and this fleet already decided
  (2026-08-01) that persistence is event-sourced, not snapshotted. Proposing it here would have
  quietly contradicted a settled decision rather than served it.

**Naming, per ticket 01's `origin` convention:** these events will carry `tabletop.cardShapeHook`
or `tabletop.storeDiffListener` as their `origin`, mirroring the exact domain-hook-vs-generic-
fallback split `tabletop-physics` ticket 21 already established for the Honeycomb-only version of
this same vocabulary.

**Not done here:** the actual `payloads/card.moved.v1.json` / `card.repositioned.v1.json` files
(or the remaining vocabulary's payload files), the sender, or the `gameId`/`playerName` plumbing.
This ticket decided the shape; building it is separate, later work.

## Comments
