# DESIGN — Event Contract v0 (the fleet's published language)

Tracking: [JES-128](https://linear.app/honeycombio/issue/JES-128) · Status: **draft v2, incorporating Jess's first commentary round** (round 1 is in git history)

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
- Not all events are game events — see Decision 6 (scope).
- **The developer can see the log**: the Spine includes an admin screen (a webapp
  component is fine) that shows a table's log human-readably, linking each event to
  its trace in Honeycomb. (Scoped into JES-129.)

---

## Card Identity — an important concept, named

How a card is serialized in any event payload, ever:

- **Identity is the Scryfall ID.** It captures the exact printing: oracle identity,
  all faces, all names (oracle name and the vanity/flavor name), all image URIs.
- **Face is card state, not identity** — but it matters at play time (MDFCs are
  played as a chosen face), so events about playing/revealing a card carry
  `face` alongside identity. The Shuffler already tracks `currentFace`; it must
  send it.
- Names and image URLs are *derivable conveniences*, not identity, and don't belong
  in the contract's card reference. (The pre-Spine Shuffler→Tabletop scaffolding API
  may carry an `imageUrl` for rendering without a Scryfall lookup — that's the
  scaffolding's business, not the contract's.)

Contract shape: `card: { scryfallId }` + sibling `face` where the event needs it.

## Decision 1: The envelope — v2, renames from round 1 applied

| field | who writes it | what it's for |
|---|---|---|
| `id` | **sender** mints a GUID | idempotency — the Spine elides a retried duplicate |
| `tableId` | sender (after learning it) | which table's log. A GUID the **Spine mints at table creation** — the table *name* is a lookup alias, unique only among active tables, living in the `table.created` payload. **PROPOSED, needs your yes** |
| `seq` | **Spine**, on append | authoritative order within the log; senders cannot claim positions |
| `name` | sender | the event's kind, namespaced (`card.played`); determines the payload schema. See Decision 6 |
| `scope` | sender | what the event affects / how it's perceived — see Decision 6, OPEN |
| `acceptedAt` | **Spine**, on append | Spine's clock: when the log accepted it |
| `occurredAt` | sender, optional | the initiator app's clock, when physics preceded ingestion |
| `initiator` | sender | *who* made this happen: a seat, a named spectator, later the interpreter |
| `occurredIn` | sender | *which application* recorded/sent it: `shuffler`, `tabletop`, `spine`, later `interpreter` |
| `visibility` | sender | `public` — the only legal value in v0; see Decision 4 |
| `traceparent` | sender | W3C trace context — **observability only**, expires with the trace (60d); the admin screen links through it to Honeycomb |
| `schemaVersion` | sender | integer version of this `name`'s payload schema |
| `payload` | sender | the kind-specific body |

**The split in one line:** uniqueness travels with the event (sender GUID);
truth-of-order and truth-of-time stay with the log (Spine-assigned `seq`,
`acceptedAt`).

## Decision 2: The v0 event catalog — OPEN, firming up

- `table.created` — payload: table name, creator. Response/log carries the minted `tableId`.
- `seat.taken` — payload: seat number (1–4), player name
- `card.played` — from the Shuffler (Decision 3: **decided, game event**) —
  payload: `card: { scryfallId }`, `face`, from which seat, zone hint

Near-future, not v0: the Tabletop reporting the *physical* echo (`card.arrived`,
scope visible) once it talks to the Spine — mostly ignored by interpretation because
it's expected; **interesting precisely when it doesn't arrive**. Also not v0: card
movement/tap, chat, interpretation events. Kinds arrive when their producers do.

## Decision 3: Game event vs. physical — DECIDED: (a) game event

The Shuffler is a deterministic, not-interpreted app: when it plays a card it knows
the meaning, so it says so — `card.played`, scope `game`. Physical events are
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
loudly. (Whether the Spine *ever* holds seat-private facts is a real future
decision, not assumed.)

## Decision 5: Versioning mechanics — DECIDED

- Each event `name` versions its payload schema independently (`schemaVersion: 1`
  under `name: seat.taken`).
- The envelope itself carries one version (file-level in `contracts/`), bumped
  rarely.
- Both readers validate on receipt and **fail loudly** on unknown name or version —
  consistent with `notes/DESIGN-persistence-versioning.md`.

Where TS receives events: eventually the **Tabletop subscribes to a table's public
feed** from the Spine — it needs `card.played` to put things on the stack — and that
subscription is where TS-side contract validation lives. (In v0's scaffolding the
Shuffler POSTs to the Tabletop directly; the code carries `// JES-128` markers where
validation will land.)

## Decision 6 (new, from round 1): `name` + `scope` are separate fields — OPEN

Round 1's insight: filtering wants a dimension that payload-schema naming doesn't
give. You'd filter by *what the event affects / how it's perceived*: affects the
table; affects the game; is visible; is audible (conceptually including chat).
Proposal to react to:

- `name` — determines the payload schema, namespaced for humans: `card.played`,
  `card.moved`, `seat.taken`, `chat.said`
- `scope` — one of `table` | `game` | `visible` | `audible` (bikeshed welcome:
  is a chat message `audible`? is a sticky note `visible`?)

Open sub-questions: is scope exactly one value or could an event carry several
(a spoken "I attack" is audible *and* affects the game)? Does the Interpreter's
output (`interpretation.*`) get its own scope or is it `game`?

## Not decided here (future docs)

- Supersession/correction event shapes (Interpreter era) — durable causality via
  event `id` references (`supersedes:`, `evidence:`), per the provenance constraint.
- Chat events, transcription events.
- Projections (current reading, public view, narration feed) — Spine internals, not
  contract. (The admin screen is a projection consumer.)
- Transport (HTTP POST vs websocket) — contract is transport-neutral.
