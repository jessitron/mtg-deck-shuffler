# SEAMAP — The Table (the fleet)

This is the fleet-level map: the whole voyage from deck management to playing together
to an agent that learns the game. Each major component (ship) has its own seamap:

- [Shuffler](apps/shuffler/SEAMAP.md) — hidden zones: library and hand
- [Tabletop](apps/tabletop/SEAMAP.md) — the shared tldraw canvas
- [Spine](services/spine/SEAMAP.md) — tables, seats, the event log, the interpreter

The full vision: `notes/DESIGN-the-table-vision.md`. Vocabulary: `notes/GLOSSARY.md`.

## Quest

I want to play magic with my friends, remotely, using any deck. I want to do the playing, including adjudicating all rules, NOT have the app enforce them. I do want the app to learn the rules, and then help me follow what's going on, and eventually maybe suggest some triggers I forgot, and teach me more about how the game works.

## The Mountains

The ladder — playable at all times, increasingly useful and fun.

1. **Every mechanic is possible** ← this is a gradual ascent; every once in a while we add one. The basics are there, and we support everything that playing on Mural supported. I want every rule to be supported (while none are enforced). For instance: support tokens, both from Archidekt and paste-in, so that counters follow them. Weird rules like looking at an opponent's top card, without them seeing it. I'd like to support attaching cards, such as equipment, so that they move with the card like counters do
2. **Spine Tells the Story** ← _active_ — when people play Magic in this app, the game gets
   recorded: every physical event a real game produces, from both the Shuffler and the
   Tabletop, crosses the Spine's one append-only log per table. That record is what
   feeds development of the Interpreter, once this mountain is reached. The Spine sits
   in the middle: no direct HTTP between the Shuffler and the Tabletop exists anywhere
   in the code, everything routes through the Spine's event log and its SSE stream out
   to the Tabletop. Still includes: the Spine-vocabulary work `tabletop-replaces-mural`'s
   cards-come-and-go map left behind (the eleven hidden-zone Shuffler actions — draw,
   shuffle, mulligan, put-on-top/bottom, …).
3. **The Interpreter learns to read the play** — guesses at unexplained physical
   events, asks in chat, is corrected; then ears (per-player transcription); then
   proactive help ("that triggers your rabbit"). Reads the record Mountain 2 built; a
   narration panel showing what happened is part of how it shows its work.
4. **Someday: it asks to play.**

## Sea Monster

Someday we are gonna have to replace tldraw, since their hobby license application produces no response. Right now it's fine to run the tabletop on http, nobody cares (except that copy doesn't work).

Tabletop has no persistence. Yikes. We'll get to that after Spine Tells the Story.

## Safe Harbor

A change is home when:

- it's deployed and observable in Honeycomb (prod environment `mtg-deck-shuffler`);
- tests are green;
- documentation — including each ship's seamap — is consistent with the code;
- and nothing in the repo is wrong, deceptive, or extraneous.

## Success looks like

- Playing a real game with my sister feels natural, not fiddly
- In-game narration helps people understand what's going on, and helps them learn to play
- The code stays expressive of the domain — reading it teaches you the game.
- When something breaks, Honeycomb shows you why.

## Enabling Constraints

- **Playable at all times.** Every safe harbor is a game you'd actually play.
- **Physics vs meaning.** The Tabletop knows what got moved around at a table; only the
  interpreter knows what it means. Both make it into the Table's event log.
- **One append-only event log per table.** Visibility on every event; private events
  cast public shadows. Never replace — supersede. Provenance on every inferred event.
  The log is the eval dataset.
- **The Spine's language is the published language**; the event contract is
  programming-language-neutral (JSON Schema), versioned, validated on both sides.
- **Monorepo, polyglot**: TypeScript owns pixels (Shuffler, Tabletop), Ruby owns
  meaning
- **Observability is mandatory.** Every component sends telemetry to Honeycomb with
  OpenTelemetry and propagates trace context; all interesting info goes on spans.
  From each ship's first commit, not retrofitted.
- Square corners (border-radius ≤ 4px) except on physically round things. A me thing.
- Everything persisted is versioned (`apps/shuffler/notes/DESIGN-persistence-versioning.md`).
- Feature owners hold deep context for tricky features and watch for cross-feature
  interactions.

## Non-goals

- Right now, it's plenty that this works for me and my family. It makes no attempt at security or scale.
- Not a rules engine — the human adjudicates; consensus is expressed physically.
- Not a deck builder — decks come from Archidekt/MTGJSON.
- Not a voice-transport service — Discord carries the call.
- No login/auth yet, even for tables; randos are a risk we accept while demonstrating
  usefulness.
- Tablet support matters; **mobile does not** (except the home page).
- No backwards-compatibility for persisted data — failing loudly on old versions is enough.
- Not a public, multi-tenant product at scale; no native app (web only).

## Tracking

Where the live work for this project is recorded. Landings, sea monsters, and treasures live as
issues — never in this doc. (Contract: the seamapping plugin's `TRACKING-ADAPTER.md`.)

- inbox: `TODO.md` at the repo root — raw captures, pre-decision, for the whole fleet.
- tracker: `docs/agents/issue-tracker.md` — specs and tickets, post-decision.

The Mountains above are mirrored onto issues by the tracker's `Mountain:` line: every spec and
every ticket names the Mountain it serves — or `overhead` for upkeep that climbs no Mountain,
or `none` with a reason. Safe Harbor is a **state**, not a Mountain, so it is never a value on
that line. So there are no milestones to keep in sync — `grep -r 'Mountain: ' .scratch/` is the
roll-up.
