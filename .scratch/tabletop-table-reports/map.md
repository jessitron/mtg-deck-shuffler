# The table reports

Mountain: tabletop-replaces-mural
Type: wayfinder:map

**Map 5 of six.** The chart above this one is
[The Tabletop replaces Mural](../../apps/tabletop/notes/DESIGN-tabletop-replaces-mural.md) — read it first
for the whole parity list, the other five maps, and why they're split this way.

## Destination

**Decide what the Tabletop tells the Spine, and how.** Map 1 (physics) already decided the
gesture vocabulary and centralized its announcement — but stopped deliberately short of the wire,
handing that seam to this map (`tabletop-physics` ticket 10: *"physics says what happened, map 5
decides how it travels"*). This map picks that up: which of physics's announcements become real,
contract-validated events sent to the Spine; what those events actually contain; and eventually,
the sender itself.

Done when the contract shapes are designed and the vocabulary decided, not when the sender is
built — the sender is real, separate work this map's first two tickets deliberately deferred (see
Not yet specified).

## Notes

- Skills every session should consult: `/grilling`, `/domain-modeling`. Read
  `docs/agents/issue-tracker.md` before writing into the tracker.
- **Consult the `fleet-is-observable` owner** before any decision touching trace-context
  propagation, or "recording that something happened" more generally — already consulted once
  this map, on whether event provenance duplicates existing telemetry conventions (it doesn't:
  see ticket 01).
- Builds directly on `tabletop-physics`'s ticket 10 (what a shape knows and announces) and
  ticket 21 (the implemented Honeycomb-only vocabulary) — this map's domain events reuse that
  same vocabulary, now aimed at the Spine instead of only Honeycomb.
- Founding material: this map absorbed the parked
  [`card-moved-contract-and-sender.md`](../tabletop-replaces-mural/parked/README.md) ticket,
  which is now ticket 02 here, renumbered and resolved.

## Decisions so far

- **Every event carries its own provenance: which app, and which kind of code, produced it** —
  [Every event carries its own origin](issues/01-every-event-carries-its-origin.md), resolved
  2026-08-10. A new envelope field, `origin`, sits one level more specific than the existing
  `occurredIn` (which app) — it names the *mechanism within that app* (e.g. a domain-hook
  announcement versus a generic store-diff fallback), reusing the same dot-namespaced open-string
  shape as the envelope's `name` field rather than a closed enum. Requires an envelope version
  bump (`envelope.v2.json`) — not a breaking-change concern, since nothing in this fleet has a
  real producer/consumer yet and contracts are still freely reshapeable. Every one of today's
  four shipped event kinds gets a real, specific origin value, not a placeholder (checked with the
  `fleet-is-observable` owner first: a value that's constant for a given kind today is still
  meaningful, as long as it's a true fact about that kind's mint site, not a shrug).

- **Physical events and domain events are two independent, co-occurring layers, not competing
  descriptions of the same fact** — [The event vocabulary: domain and physical
  events](issues/02-event-vocabulary-domain-and-physical.md), resolved 2026-08-10. A domain event
  (`card.moved`, a zone transition) says what a gesture *means*; a physical event
  (`card.repositioned`, a settled motion) says *where something went*. Both can fire from one
  drag — moving a card from hand to battlefield fires both `card.repositioned` (physical) and
  `card.moved` (domain), because they answer different questions. Physical events exist because a
  future Interpreter (Mountain 3) will need to read raw motion to guess meaning the Tabletop was
  never told directly (e.g. a card pushed toward an opponent's side, without ever crossing a
  zone, might mean "I'm attacking") — see the ticket for why zone-only domain events can't carry
  that signal at all.

- **`envelope.v2.json` shipped, with `origin` and a new envelope-wide `significance` field**
  (2026-08-10). `origin` is exactly ticket 01's design, given real values at all four shipped
  mint sites. `significance` (`physical` | `domain` | `administrative`) is a new field Jess
  asked for directly, ahead of this map's own tickets reaching it — added to the same v2 bump
  since both needed one. Every existing kind now carries both: `table.created` and
  `seat.taken`/`seat.joined` are `administrative`; `card.played` is `domain`. See
  `notes/DESIGN-event-contract-v0.md`'s "Resolved since" section for the field shapes.

- **card.discard becomes its own event kind, not a variant of card.played** — already scoped and
  unblocked as [ticket 08 in
  tabletop-cards-come-and-go](../tabletop-cards-come-and-go/issues/08-discard-becomes-its-own-word.md)
  (its blocker, ticket 05, was done but had a stale `Status:` line — fixed 2026-08-10). Not this
  map's ticket to own, but load-bearing for ticket 01's origin values: `card.played` gets a single
  origin (`shuffler.playCardSubmit`) once discard stops sharing it.

## Not yet specified

- **The Tabletop→Spine sender itself.** A data-flow direction that doesn't exist yet (today it's
  Shuffler→Spine and Spine→Tabletop only). Needs the `fleet-is-observable` owner's input on
  trace-context propagation for a new outbound path — deliberately deferred by both ticket 01 and
  02, which design contracts only.
- **The `gameId`/`playerName` identity gap.** Whatever eventually sends `card.moved`,
  `card.repositioned`, and friends needs both stamped on the session/room state to read at fire
  time. `playerName` already rides in on `seat.joined`'s `initiator.playerName`; `gameId` appears
  nowhere in `apps/tabletop/src` today — it has never crossed from the Shuffler. Blocks the sender,
  not the contract.
- **Contract payloads for the rest of the physics vocabulary beyond `card.moved`/
  `card.repositioned`** — `card.tapped`/`untapped`, `card.flipped`, `card.turnedFaceDown`,
  `counter.attached` all need their own `payloads/<name>.v1.json` files following the same pattern.
  Ticket 02 decided they're in scope for this map; the actual schema files aren't written yet.
- **Whether gestures other than card movement need their own physical-layer event.** Only
  `card.repositioned` (for drags) got designed this session. Does dragging a counter onto a card
  need a `counter.repositioned`, or does the counter's physical motion not matter the way a
  card's does? Not decided.
- **`seat.joined`'s missing contract validation.** It's built and sent by the Shuffler but never
  actually reaches the Spine's contract-validated endpoint — goes straight to the Tabletop
  instead, bypassing `EventContract` entirely. Surfaced while researching ticket 01's origin
  values; not this map's ticket to fix, flagged rather than silently left.

## Out of scope

- **A freeform-doodle snapshot store.** Considered (it was the parked ticket's own suggestion for
  handling arbitrary/positional state) and explicitly rejected 2026-08-10: it's a snapshot
  mechanism, and this fleet already decided (2026-08-01) that persistence is event-sourced, not
  snapshotted. A snapshot store would have quietly contradicted that decision rather than served
  it.
- **Sampling a physical event's full path/route**, not just its start and end position.
  Considered and rejected: "I only care about from-to, I don't care about the route." Along with
  it, per-point timing and a standalone drag-duration field were both considered and rejected —
  not because richness is unwanted (the opposite principle governed most of this map's decisions)
  but because route and timing specifically weren't judged to carry signal worth the added
  complexity.
- **Computing which shapes are nearby a card at landing**, inside the physical event itself. It's
  a cross-shape join, not a fact about one card's own motion, and it's fully reconstructable later
  from the position data these events already capture — deferred to whenever an Interpreter
  actually needs it, not designed preemptively.
- **The replay-on-boot mechanism itself.** This map's events are what a replay would consume;
  building the replay logic is separate, later work (inherited from the original parked ticket's
  scope boundary).
