# SEAMAP — Spine (ship)

One ship in [the fleet](../../SEAMAP.md). The Spine is the event hub and the central
domain language: Tables, Seats, the log, and — for now — the Interpreter. _(Rewritten
from the JES-129 Rails walking skeleton to plain Ruby — Roda + Sequel + SQLite +
Minitest, see `.scratch/spine-roda-rewrite/` at repo root. Through ticket 06: OTel to
Honeycomb, join-by-name, contract-validated generic event ingestion, SSE outbound
delivery, and an `/admin/tables` screen that live-appends via that same SSE stream.)_

## North Star

Every table's story, told in events: what happened, what it meant, and how we came to
believe it.

## The Mountains

1. **Tables and Seats** ← _active_ — a table you can join by name (from the Shuffler's
   Prep screen); seats for 1–4 players; spectators welcome without one.
   _Being rebuilt on Roda/Sequel (`.scratch/spine-roda-rewrite/`) as a single `join`
   endpoint (name a table, get a seat; creates the table if it doesn't exist yet).
   The Shuffler's Prep screen doesn't call it yet._
2. **The event log** — append-only, one per table; visibility on every event; private
   events cast public shadows; projections (current reading, public view for
   spectators, narration feed).
   _Rebuilt on Roda/Sequel through ticket 05: append-only log, dedup on sender id, loud
   contract validation (`POST /tables/:table_id/events`, envelope v3 — `traceparent`
   moved out of the body entirely, header-only inbound), and live outbound delivery
   over SSE (`GET /tables/:table_id/events/stream`, one stream per table, fed by a
   plain-Ruby broadcaster), and an `/admin/tables` screen (ticket 06) that dogfoods
   that same stream to append new rows live, no reload. Still ahead overall:
   public-only is the whole visibility story so far; richer projections._
3. **The Interpreter** — physical events in, game events out, with provenance,
   causality, confidence, and commentary. Guesses; asks in chat; is corrected;
   supersedes itself. Later: ears (transcript events join the evidence), then
   proactive help. The unexplained-events queue is its curriculum, and the log is the
   eval dataset.

## Safe Harbor

- Deployed alongside the fleet, observable in Honeycomb.
- Tests green; this map consistent with the code.
- Event schemas versioned; old data fails loudly.

## Enabling Constraints

- **Ruby**. The **Journeys** pattern (Avdi is inventing it) is the architectural
  direction for the **Interpreter** component — its docs (README, guide, ADRs,
  glossary) live at `interpreter/docs/journeys/`. Journeys implement an actor model,
  which resonates with modeling cards on the table as actors. The rest of the Spine
  (tables, seats, the log) is plain domain code that journeys read from and append to.
- The Spine's language is the fleet's published language: the event contract is
  language-neutral (JSON Schema in `contracts/`), versioned, validated on both sides.
- **Never replace, supersede.** Physical events are evidence; interpretations are
  events that cover them; corrections trigger supersession. Nothing is rewritten.
- The Interpreter is an anti-corruption layer that happens to be an AI. Its boundary
  (physical events in, game events out) is sacred even while it lives inside this app,
  so extraction later is a deployment decision, not a design one.
- Not all Spine events are game events: table events, chat events, physical events,
  game events, interpretations/corrections — visibility cuts across them all.
- Observability is mandatory: telemetry to Honeycomb via OpenTelemetry, trace context
  propagated in and out (arriving events carry it; interpretations link back through
  it), all interesting info on spans. From the first commit.

## Non-goals

- Not a rules engine. The Interpreter reads players, not rules — "we don't know why"
  is a legitimate, first-class interpretation.
- No auth yet; table names shared over Discord are the trust model.
- Doesn't render game pixels. Those belong to TypeScript — the Shuffler and Tabletop
  are the only ships players look at. `/admin/tables` is the one exception: a plain-ERB
  developer tool for reading the log, not a player-facing surface.
