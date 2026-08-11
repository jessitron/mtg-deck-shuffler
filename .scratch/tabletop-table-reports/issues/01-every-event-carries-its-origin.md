# 01 — Every event carries its own origin

Mountain: tabletop-replaces-mural
Ship: fleet
Type: grilling
Status: resolved
Blocked by: none

## Question

Designing `card.moved`'s contract (ticket 02) raised a question bigger than that one payload:
should an event say which code produced it, not just who triggered it and which app it happened
in?

`occurredIn` already answers "which app" (`shuffler`/`tabletop`/`spine`). `initiator` already
answers "which person." Neither answers "which mechanism, within that app" — and this map's own
domain-vs-physical split (ticket 02) recreates, at the Spine-event layer, the exact ambiguity
`tabletop-physics` ticket 21 already had to solve once at the Honeycomb layer: a `card.moved`
sourced from `MtgCardShapeUtil`'s own gesture hook is a categorically different kind of fact than
one reconstructed by a generic store-diff fallback, even when they'd otherwise look identical.

Open questions this ticket needs to settle:

- Does provenance belong on the envelope (every event, every kind) or scoped to just the new
  card-movement payloads that actually have this ambiguity today?
- What's it called, and what shape — a free string, or a closed enum?
- Given `envelope.v1.json` is already deployed, does adding a required field mean a careful
  migration, or is this fleet still young enough to just reshape it?
- If it's envelope-wide, every existing shipped kind (`table.created`, `seat.taken`,
  `seat.joined`, `card.played`) needs a real value, at whatever code actually mints it today —
  what are those values?

**Consulted the `fleet-is-observable` owner** before forming a recommendation, since this borders
directly on "recording that something happened." Their answer: no conflict with `traceparent`
(observability-only, a different lifetime and audience than a durable contract field) and no
duplication of the Honeycomb-layer span/actor conventions (a durable payload field serves a
different audience — replay, other event consumers, forever — than an ephemeral span does).
Their one real caution: a value that's constant across every instance of a kind risks being a
meaningless placeholder, so payload-scoped looked like the better fit *unless* every kind can be
given a genuinely true, specific value, not a shrug.

## Answer

**Envelope-wide, not payload-scoped.** Jess's call, overriding the owner's default lean: "that
provenance is going on there from the beginning." The caution about meaningless placeholders is
answered by fact, not by narrowing scope — every existing event kind's mint site is a real,
specific piece of code, even where it's the only value that kind will ever have today. A value
being constant isn't the same as being meaningless.

**No migration concern.** This fleet has no real producers/consumers depending on the current
envelope shape yet — the same "free right now, never again after this ships" window ticket 05
(`tabletop-cards-come-and-go`) already used once for the same reason. Bumping the version
(`envelope.v2.json`, never editing `v1` in place — that discipline holds even when nothing forces
it yet) is good practice independent of necessity, not a defensive migration.

**Field name: `origin`.** Distinct from `occurredIn` (which app) — this is one level more
specific, naming the mechanism within that app.

**Shape: an open, dot-namespaced string, validated the same way `name` already is**
(`^[a-z]+(\.[a-z_]+)+$`), not a closed enum. A closed enum would mean every new call site,
anywhere in the fleet, needs an envelope-schema change before it can mint an event — the same
problem `name` already solved by making each event kind's own payload file the real registry,
rather than enumerating kinds in the envelope itself. Matches `tabletop-physics` decision 10's
own precedent: "vocabulary is generous by default."

**Values are hard-coded literals, one per mint site** — cheap by construction, since each site
already knows exactly what it is; no detection logic, no registry.

**Every shipped kind's real value**, found by tracing each one back to its actual mint site
(not just the HTTP route that triggers it):

- `table.created` → `spine.tableLookupMiss` — minted in Ruby, `Table.create_with_event!`
  (`services/spine/app/models/table.rb:17-36`), called from `TablesController#create` when a
  table lookup by name 404s. The Shuffler's `POST /tables` call is the trigger; the Spine's own
  model is what builds the envelope.
- `seat.taken` → `spine.seatTaken` — same pattern: `Table#take_seat!` (`table.rb:42-57`), Ruby,
  triggered by the Shuffler's `POST /tables/:table_id/seats`.
- `seat.joined` → `shuffler.shuffleUp` — minted client-side, `buildSeatJoinedEvent`
  (`apps/shuffler/src/port-tabletop/types.ts:268-295`), fired at Shuffle Up.
- `card.played` → `shuffler.playCardSubmit` — minted client-side, `buildCardPlayedEvent`
  (`apps/shuffler/src/port-tabletop/types.ts:117-146`). Originally shared with discard (two
  routes, one builder function), which would have needed either two origin values off one shared
  builder or a merged value hiding a real distinction — resolved instead by `card.discard`
  becoming its own event kind entirely (`tabletop-cards-come-and-go` ticket 08), so `card.played`
  only ever needs the one value now. `card.discarded` gets `shuffler.discardCardSubmit` whenever
  that ticket ships.

Future Spine-bound physics events (ticket 02) will use this same convention —
`tabletop.cardShapeHook` for gesture-hook-sourced announcements, `tabletop.storeDiffListener`
for the generic fallback — mirroring the exact split `tabletop-physics` ticket 21 already
established for the Honeycomb-only vocabulary, now extended to the durable contract layer.

**Not done here:** the actual `envelope.v2.json` file, the four existing mint sites' code changes
to supply `origin`, or updating `EventContract`/both language validators to accept v2. This
ticket decided the shape; building it is separate, later work.

## Comments
