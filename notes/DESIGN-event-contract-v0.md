# DESIGN — Event Contract v0 (the fleet's published language)

Tracking: [JES-128](https://linear.app/honeycombio/issue/JES-128) · Status: **draft, under discussion**

The language-neutral event contract the Spine publishes and both TS apps validate
against. Will become JSON Schema in `contracts/` at the repo root; this doc is where
we make the decisions first. Leave comments inline — each decision is numbered.

Guiding constraints (from SEAMAP.md / the vision doc):

- One append-only event log per Table. Never replace — supersede.
- Visibility on every event; private events cast public shadows.

> this isn't true, is it? The Shuffler is going to send a public shadow of what it knows about

- Provenance on every inferred event; trace context propagated in and out.

> There's provenance on the event itself (who and when), and trace context in the traces. Trace spans always contain IDs of whatever they're recording. We can record trace data on events, but it's only good for 60d, but it's super useful for me right now to see the connection.

- Versioned from the start; old data fails loudly.

> yeah, this is true. Right now, a Table can be invalidated by a deploy. If this ever becomes a publicly-useful app, we'll need to be backwards-compatible for the length of a game.

- Not all events are game events: table, chat, physical, game,
  interpretation/correction — visibility cuts across them all.

> This leaves me with a question: how do I (as developer) see the event log in the Spine? I want the Spine to include an admin screen that makes it super clear to me what is going on, so I can follow along. They can link to traces in Honeycomb.

---

## Decision 1: The envelope — DECIDED (pending your veto)

Every event, regardless of kind, wears this envelope:

| field   | who writes it           | what it's for                                                                                       |
| ------- | ----------------------- | --------------------------------------------------------------------------------------------------- |
| `id`    | **sender** mints a GUID | idempotency — the Spine elides a retried duplicate (the `unique_by:` move, at the service boundary) |
| `table` | sender                  | which table's log                                                                                   |

> Table is identified by ... what? another guid? Somewhere the table has a name but that is not globally unique (only unique among active tables)

| `seq` | **Spine**, on append | authoritative order within the log; senders cannot claim positions |
| `kind` | sender | e.g. `table.created`, `seat.taken` — namespaced, see Decision 3 |
| `at` | **Spine**, on append | authoritative time |

> so this is in Spine time. Let's be more specific. acceptedAt

| `occurredAt` | sender, optional | claimed time, when physics preceded ingestion |

> this is in the time seen by the initiator, so like Shuffler or Tabletop's clock

| `actor` | sender | who asserted this: a seat, a spectator, an app, later the interpreter |

> the word 'actor' is overloaded. Yet, there are outside-the-system sources like actor, spectator. Let's distinguish between who initiated the event and which application recorded the event. `occuredIn` ?

| `visibility` | sender | `public` \| `seat-private` (Decision 4) |

> Does the spine even receive events that are private to the seat?

| `traceparent` | sender | W3C trace context; interpretations link back through it |

> Yes, let's record this, good idea

| `schema` | sender | version of this kind's payload schema |

> so this is schema name and version? If it's only version then call it schema version. Each event kind has its own schema for the payload?

| `payload` | sender | the kind-specific body |

**The split in one line:** uniqueness travels with the event (sender GUID);
truth-of-order and truth-of-time stay with the log (Spine-assigned `seq`, `at`).

## Decision 2: The v0 event catalog — OPEN

Proposed minimum — just enough for the walking skeleton to ingest something real and
the Shuffler to emit something real:

- `table.created` — payload: table name, creator
- `seat.taken` — payload: seat number (1–4), player name
- one card event from the Shuffler — **but which? See Decision 3.**

Deliberately _not_ in v0: card movement/tap (Tabletop physics not built yet), chat,
interpretation events. Kinds arrive when their producers do.

## Decision 3: Game event vs. physical event for the Shuffler's card — OPEN, leaning game

When the Shuffler plays a card to the table, is that:

- **(a) `game.card_played`** — a _game_ event. The Shuffler genuinely knows the
  meaning of what it did; no interpretation is needed. **← Claude's lean.**

> Yes, it's a game event. Shuffler is a deterministic, not interpreted app.

- **(b) `card.arrived`** — a humbler _physical_ fact: an object appeared.

> This can also be reported by the Tabletop and recorded, because if we don't get it, that's gonna be interesting. Mostly this will be ignored by the interpretation, because it's expected.

The vision doc separates physical from game carefully because translating physical →
game is the Interpreter's whole job. Argument for (a): reserve physical events for
the Tabletop's genuinely ambiguous gestures; when a producer knows the meaning, let
it say so — that also seeds the log with ground-truth game events the Interpreter's
eval dataset will want. Argument for (b): a uniformly-physical v0 log is simpler,
and the Interpreter's world starts maximally honest ("things appear; meaning comes
later").

Payload either way: card identity (name, Scryfall image URL, which face), from
which seat.

> whoa whoa whoa. "Card Identity" is a wicked important concept here, not to be taken lightly. How do we serialize card identity? Scryfall ID? "which face" is a good callout, that's more 'card state' than identity but it matters. Image URL is wrong, there are multiple. Name is insufficient, there are multiple names (oracle name or ... what do you call the vanity name) I think Scryfall ID captures all of this. "which face" definitely matters for some cards when played - which is gonna affect the Shuffler when it sends events.
> Capture "Card Identity" as an important concept in this schema.

This choice also picks the kind namespaces we start with: `table.*`, `game.*`,
and/or `physical.*` (plus later `chat.*`, `interpretation.*`).

> yeah good point. I think there's both a kind and an event name. Or scope? Let's think about this some more. Maybe there's a scope ... I would expect to filter by events that affect the table; that affect the game; that are visible or audible (conceptually, includes chat). Each event has a scope; it also has a name (or kind) which determines its payload schema. I think that's another field on the event. That leaves namespacing in the name for things like card.played (game) and card.moved (visible)

## Decision 4: Visibility values — OPEN, probably just defer

v0 proposes exactly two: `public`, `seat-private`. Public shadows of private events
(e.g. "seat 2 drew a card" shadowing "seat 2 drew _Lightning Bolt_") are a **pair of
events** — the private one and its shadow — not a field trick. But no v0 event is
private (table/seat/card-to-table are all public acts), so we can define the enum
and postpone the shadow mechanics. Flagging so we don't accidentally design an
envelope that can't express shadows: a shadow probably references the `id` of the
event it shadows.

> so is Shuffler sending both of those now? I mean, I'm OK with that, I thought you hadn't planned on it though

## Decision 5: Versioning mechanics — OPEN, proposal below

- Each _kind_ versions its payload schema independently: `schema: 1` under
  `kind: seat.taken` means "seat.taken payload schema v1."

> This is good. Each of those payload schemas is independent.

- The envelope itself gets one version too (file-level in `contracts/`), bumped
  rarely.

> yes, yes it does.

- Both readers (Ruby, TS) validate on receipt and **fail loudly** on an unknown
  kind or version — consistent with the repo's persistence-versioning stance
  (`notes/DESIGN-persistence-versioning.md`).

> Yes, good. Where in TS do we receive events? ... the Tabletop needs to receive "card played" so it can put stuff on the stack, that's one.

## Not decided here (future docs)

- Supersession/correction event shapes (Interpreter era).
- Chat events, transcription events.
- Projections (current reading, public view, narration feed) — those are Spine
  internals, not contract.
- Transport (HTTP POST vs websocket) — contract is transport-neutral; the schema
  describes the event, not the pipe.
