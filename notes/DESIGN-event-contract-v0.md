# DESIGN — Event Contract v0 (the fleet's published language)

Status: **draft v2, incorporating Jess's first commentary round** (round 1 is in git history)

The language-neutral event contract the Spine publishes and both TS apps validate
against. Will become JSON Schema in `contracts/` at the repo root; this doc is where
we make the decisions first. Leave comments inline — each decision is numbered.

Guiding constraints (from SEAMAP.md / the vision doc, as amended by round 1):

- One append-only event log per Table. Never replace — supersede.
- Visibility on every event. **The shadow is a first-class event**: the private fact
  it shadows may never reach the Spine at all (the Shuffler keeps hands and libraries
  to itself and sends only the public shadow of what it knows). Visibility marks what
  an event reveals, not a derivation chain.
- **Provenance and observability are separate.** Provenance is on the event itself —
  who initiated it, which app recorded it, when — and is durable. Trace context is
  recorded too (super useful for seeing the connections right now) but expires in
  60d, so nothing auditable may depend on it. Durable causality between events uses
  event `id` references, never trace ids.
- Versioned from the start; old data fails loudly. Accepted consequence today: a
  deploy can invalidate a Table. If this ever becomes publicly useful, backwards
  compatibility must hold for at least the length of a game.
- Not all events are game events — but classifying them (`scope`) is deferred until
  we know the scopes (Decision 6).
- **The developer can see the log**: the Spine includes an admin screen (a webapp
  component is fine) that shows a table's log human-readably, linking each event to
  its trace in Honeycomb. (Built with the Spine's walking skeleton; it lives at
  `/admin/tables`.)

---

## Card Identity — an important concept, named

How a card is serialized in any event payload, ever:

- **Identity is the Scryfall ID.** It captures the exact printing: oracle identity,
  all faces, all names (oracle name and the vanity/flavor name), all image URIs.
- **Face is card state, not identity** — but it matters at play time (MDFCs are
  played as a chosen face), so events about playing/revealing a card carry
  `face` alongside identity. The Shuffler already tracks `currentFace`; it must
  send it.
- Names and image URLs are _derivable conveniences_, not identity, and don't belong
  in the contract's card reference. (The pre-Spine Shuffler→Tabletop scaffolding API
  may carry an `imageUrl` for rendering without a Scryfall lookup — that's the
  scaffolding's business, not the contract's.)

**Identity has two levels** (round 2): the _definition_ and the _instance_.

- **Definition** — `scryfallId`, as above: what kind of card this is.
- **Instance** — `cardInstanceId`: _this particular Forest_, the way a physical deck
  has one. A GUID minted by the Shuffler, one per card, when the deck becomes a
  game's library. Game-mechanically two Forests are equivalent; log-wise they are
  distinct individuals, so a single card can be followed through played → tapped →
  sacrificed → graveyard, and conservation of cards is checkable: if the table ever
  holds more or fewer Forests than the log accounts for, each instance's event
  biography shows exactly where. (The Shuffler's internal `gameCardIndex` is the
  embryo of this — it _is_ static for the life of a game, but it's assigned after
  sorting the deck alphabetically (`GameState.newGame`), so an index is the card's
  alphabetical rank in a known decklist. It used to be barred from crossing the
  Shuffler's boundary as "a decodable secret" — reversed at `let-gamecardindex-out`
  (2026-08-10): decklists are public on Archidekt anyway, so decoding the index
  reveals nothing a trust-based table couldn't already look up, and the guard was
  only making every future payload reason about what may cross. `card.played` now
  sends it alongside the opaque instance GUID, not instead of it.)
- Minting scope — **DECIDED: per game**, at game start (Jess confirmed "this
  game"). "Same physical card across game nights" (persisting instance ids into
  deck files) is a noted future upgrade, fragile today because deck files are
  regenerated from Archidekt/MTGJSON.

Contract shape: `card: { scryfallId, instanceId }` + sibling `face` where the event
needs it. Downstream consequence: the Tabletop should stamp `instanceId` into each
card shape's `meta`, so future physical events (`card.moved`, tap) reference the
same individual the game events do.

## Decision 1: The envelope — v2, renames from round 1 applied

| field           | who writes it              | what it's for                                                                                                                                                                 |
| --------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | **sender** mints a GUID    | idempotency — the Spine elides a retried duplicate                                                                                                                            |
| `tableId`       | sender (after learning it) | which table's log. A GUID the **Spine mints at table creation** — the table _name_ is a lookup alias, unique only among active tables, living in the `table.created` payload. |
| `seq`           | **Spine**, on append       | authoritative order within the log; senders cannot claim positions                                                                                                            |
| `name`          | sender                     | the event's kind, namespaced (`card.played`); determines the payload schema. (No `scope` field in v0 — see Decision 6)                                                        |
| `acceptedAt`    | **Spine**, on append       | Spine's clock: when the log accepted it                                                                                                                                       |
| `occurredAt`    | sender, optional           | the initiator app's clock, when physics preceded ingestion                                                                                                                    |
| `initiator`     | sender                     | _who_ made this happen: a seat, a named spectator, later the interpreter                                                                                                      |
| `occurredIn`    | sender                     | _which application_ recorded/sent it: `shuffler`, `tabletop`, `spine`, later `interpreter`                                                                                    |
| `visibility`    | sender                     | `public` — the only legal value in v0; see Decision 4                                                                                                                         |
| `traceparent`   | sender                     | W3C trace context — **observability only**, expires with the trace (60d); the admin screen links through it to Honeycomb                                                      |
| `schemaVersion` | sender                     | integer version of this `name`'s payload schema                                                                                                                               |
| `payload`       | sender                     | the kind-specific body                                                                                                                                                        |

**The split in one line:** uniqueness travels with the event (sender GUID);
truth-of-order and truth-of-time stay with the log (Spine-assigned `seq`,
`acceptedAt`).

## Decision 2: The v0 event catalog — DECIDED (three kinds)

- `table.created` — payload: table name, creator. Response/log carries the minted `tableId`.
- `seat.taken` — payload: `seatId` (a short GUID — player names are not unique;
  seat identity is its own thing, mintable as a sequence once the Spine owns it),
  seat number (1–4), player name (display only)
- `card.played` — from the Shuffler (Decision 3: **decided, game event**) —
  payload: `card: { scryfallId, instanceId }`, `face`, from which seat, zone hint

Near-future, not v0: **more Shuffler game events** — it deterministically knows
more than it says (`card.picked_up`, and the public shadows: drew a card, mulliganed,
shuffled) — cheap to add once `card.played` flows, since it's the same pipe. Also
near-future: the Tabletop reporting the _physical_ echo (`card.arrived`)
once it talks to the Spine — mostly ignored by interpretation because
it's expected; **interesting precisely when it doesn't arrive**. Also not v0: card
movement/tap, chat, interpretation events. Kinds arrive when their producers do.

## Decision 3: Game event vs. physical — DECIDED: (a) game event

The Shuffler is a deterministic, not-interpreted app: when it plays a card it knows
the meaning, so it says so — `card.played`. Physical events are
reserved for genuinely observed/ambiguous happenings (the Tabletop's world), and the
physical echo of a game event is a separate, expected, low-drama event (see
Decision 2). This seeds the log with ground-truth game events for the Interpreter's
eval dataset.

## Decision 4: Visibility — RESOLVED for v0: everything is `public`

Answering round 1's question directly: **no, the Spine does not receive seat-private
events in v0** — the Shuffler was never going to send both halves of a pair; it
sends only the public shadow of what it privately knows ("seat 2 drew a card",
never which card). So v0's enum is exactly `public`, and the pair/shadow mechanics
are deferred until a producer actually wants to log a private fact. Envelope
future-proofing kept: when shadows arrive, a shadow references the `id` of the event
it shadows; adding an enum value is an envelope version bump that old readers reject
loudly. (Whether the Spine _ever_ holds seat-private facts is a real future
decision, not assumed.)

## Decision 5: Versioning mechanics — DECIDED

- Each event `name` versions its payload schema independently (`schemaVersion: 1`
  under `name: seat.taken`).
- The envelope itself carries one version (file-level in `contracts/`), bumped
  rarely.
- Both readers validate on receipt and **fail loudly** on unknown name or version —
  consistent with `apps/shuffler/notes/DESIGN-persistence-versioning.md`.

Where TS receives events: eventually the **Tabletop subscribes to a table's public
feed** from the Spine — it needs `card.played` to put things on the stack — and that
subscription is where TS-side contract validation lives. (In v0's scaffolding the
Shuffler POSTs to the Tabletop directly; the code carries `// JES-128` markers where
validation will land.)

**Revisited (2026-08-12):** "fail loudly on unknown name or version" turned out to have
been implemented as "fail loudly on *any* unrecognized field, anywhere, including the
payload" — stricter than decided here, and it broke the first payload change that added
an optional field (`colors-from-playmat-to-life-counter` ticket 02). The envelope keeps
failing loudly on anything unrecognized; payloads now ignore fields they don't know
about. Full reasoning in `notes/DESIGN-schema-evolution-policy.md`.

## Decision 6: `scope` — DECIDED: leave it off v0

Round 1's insight stands: filtering wants a dimension that payload-schema naming
doesn't give — _what the event affects / how it's perceived_ (affects the table;
affects the game; visible; audible, conceptually including chat). But we don't know
what the scopes actually are yet (one or many per event? where does
`interpretation.*` sit?), so v0 ships **`name` only** — namespaced for humans
(`card.played`, `seat.taken`), determining the payload schema.

When real filtering needs teach us the scope values, adding the field is an
envelope version bump — old readers reject it loudly, by design. Until then the
Spine's projections and the admin screen can filter on `name` prefixes, which is
plenty at three event kinds.

## v0 implementation notes (from the walking skeleton, JES-129)

The schemas live in `contracts/` (envelope.v1 + three payloads). Resolutions the
implementation made where this doc was silent:

- **The Spine authors `table.created` itself** (occurredIn `spine`) in response to
  `POST /tables` — it is never ingested through the events endpoint, which resolves
  the chicken-and-egg of an envelope requiring a `tableId` the Spine hasn't minted yet.
- **Submission vs. logged shape**: one envelope schema can't express "seq/acceptedAt
  forbidden at submission"; the schema marks them optional and the Spine rejects
  sender-supplied values in code.
- Honeycomb trace links use the environment-wide `/trace?trace_id=` URL form.

Deferred decisions the implementation surfaced (fine as-is for v0):

- **`seatId` is a full UUID** (schema requires only minLength 8 — "short" undefined).

Resolved since (tabletop-cards-come-and-go ticket 05, 2026-08-09):

- **`initiator` is `{ seatId?, playerName }`**, not a plain string — a seated player
  vs. a named spectator is now structurally distinguishable, ahead of the Interpreter
  starting to initiate events.
- **`zoneHint` is an enum** (`stack` | `battlefield` | `graveyard`) in
  `card.played.v1.json`, not a free string.

Resolved since (envelope v2, map 5 tickets 01 and 02, 2026-08-10):

- **`origin`**: an open, dot-namespaced string (same pattern as `name`, but its
  mechanism-naming segments may be camelCase — `spine.tableLookupMiss`,
  `shuffler.playCardSubmit`) naming which code path within `occurredIn`'s app minted the
  event. See
  `.scratch/tabletop-table-reports/issues/01-every-event-carries-its-origin.md`.
- **`significance`**: a closed three-value enum — `physical` (a card moved, hand sorting,
  a note/annotation), `domain` (a real game fact: drawn, played, moved to a zone), or
  `administrative` (table/seat bookkeeping) — orthogonal to `origin` and to the
  domain/physical vocabulary split in
  `.scratch/tabletop-table-reports/issues/02-event-vocabulary-domain-and-physical.md`
  (that split only classifies domain vs. physical *events*; `significance` gives every
  envelope, including administrative ones, a place to say which of the three it is).

## Not decided here (future docs)

- Supersession/correction event shapes (Interpreter era) — durable causality via
  event `id` references (`supersedes:`, `evidence:`), per the provenance constraint.
- Chat events, transcription events.
- Projections (current reading, public view, narration feed) — Spine internals, not
  contract. (The admin screen is a projection consumer.)
- Transport (HTTP POST vs websocket) — contract is transport-neutral.
