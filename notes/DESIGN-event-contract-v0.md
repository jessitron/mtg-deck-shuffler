# DESIGN — Event Contract v0 (the fleet's published language)

Tracking: [JES-128](https://linear.app/honeycombio/issue/JES-128) · Status: **draft, under discussion**

The language-neutral event contract the Spine publishes and both TS apps validate
against. Will become JSON Schema in `contracts/` at the repo root; this doc is where
we make the decisions first. Leave comments inline — each decision is numbered.

Guiding constraints (from SEAMAP.md / the vision doc):

- One append-only event log per table. Never replace — supersede.
- Visibility on every event; private events cast public shadows.
- Provenance on every inferred event; trace context propagated in and out.
- Versioned from the start; old data fails loudly.
- Not all events are game events: table, chat, physical, game,
  interpretation/correction — visibility cuts across them all.

---

## Decision 1: The envelope — DECIDED (pending your veto)

Every event, regardless of kind, wears this envelope:

| field | who writes it | what it's for |
|---|---|---|
| `id` | **sender** mints a GUID | idempotency — the Spine elides a retried duplicate (the `unique_by:` move, at the service boundary) |
| `table` | sender | which table's log |
| `seq` | **Spine**, on append | authoritative order within the log; senders cannot claim positions |
| `kind` | sender | e.g. `table.created`, `seat.taken` — namespaced, see Decision 3 |
| `at` | **Spine**, on append | authoritative time |
| `occurredAt` | sender, optional | claimed time, when physics preceded ingestion |
| `actor` | sender | who asserted this: a seat, a spectator, an app, later the interpreter |
| `visibility` | sender | `public` \| `seat-private` (Decision 4) |
| `traceparent` | sender | W3C trace context; interpretations link back through it |
| `schema` | sender | version of this kind's payload schema |
| `payload` | sender | the kind-specific body |

**The split in one line:** uniqueness travels with the event (sender GUID);
truth-of-order and truth-of-time stay with the log (Spine-assigned `seq`, `at`).

## Decision 2: The v0 event catalog — OPEN

Proposed minimum — just enough for the walking skeleton to ingest something real and
the Shuffler to emit something real:

- `table.created` — payload: table name, creator
- `seat.taken` — payload: seat number (1–4), player name
- one card event from the Shuffler — **but which? See Decision 3.**

Deliberately *not* in v0: card movement/tap (Tabletop physics not built yet), chat,
interpretation events. Kinds arrive when their producers do.

## Decision 3: Game event vs. physical event for the Shuffler's card — OPEN, leaning game

When the Shuffler plays a card to the table, is that:

- **(a) `game.card_played`** — a *game* event. The Shuffler genuinely knows the
  meaning of what it did; no interpretation is needed. **← Claude's lean.**
- **(b) `card.arrived`** — a humbler *physical* fact: an object appeared.

The vision doc separates physical from game carefully because translating physical →
game is the Interpreter's whole job. Argument for (a): reserve physical events for
the Tabletop's genuinely ambiguous gestures; when a producer knows the meaning, let
it say so — that also seeds the log with ground-truth game events the Interpreter's
eval dataset will want. Argument for (b): a uniformly-physical v0 log is simpler,
and the Interpreter's world starts maximally honest ("things appear; meaning comes
later").

Payload either way: card identity (name, Scryfall image URL, which face), from
which seat.

This choice also picks the kind namespaces we start with: `table.*`, `game.*`,
and/or `physical.*` (plus later `chat.*`, `interpretation.*`).

## Decision 4: Visibility values — OPEN, probably just defer

v0 proposes exactly two: `public`, `seat-private`. Public shadows of private events
(e.g. "seat 2 drew a card" shadowing "seat 2 drew *Lightning Bolt*") are a **pair of
events** — the private one and its shadow — not a field trick. But no v0 event is
private (table/seat/card-to-table are all public acts), so we can define the enum
and postpone the shadow mechanics. Flagging so we don't accidentally design an
envelope that can't express shadows: a shadow probably references the `id` of the
event it shadows.

## Decision 5: Versioning mechanics — OPEN, proposal below

- Each *kind* versions its payload schema independently: `schema: 1` under
  `kind: seat.taken` means "seat.taken payload schema v1."
- The envelope itself gets one version too (file-level in `contracts/`), bumped
  rarely.
- Both readers (Ruby, TS) validate on receipt and **fail loudly** on an unknown
  kind or version — consistent with the repo's persistence-versioning stance
  (`notes/DESIGN-persistence-versioning.md`).

## Not decided here (future docs)

- Supersession/correction event shapes (Interpreter era).
- Chat events, transcription events.
- Projections (current reading, public view, narration feed) — those are Spine
  internals, not contract.
- Transport (HTTP POST vs websocket) — contract is transport-neutral; the schema
  describes the event, not the pipe.
