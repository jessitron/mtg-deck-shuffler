# SEAMAP — The Table (the fleet)

This is the fleet-level map: the whole voyage from deck management to playing together
to an agent that learns the game. Each major component (ship) has its own seamap:

- [Shuffler](apps/shuffler/SEAMAP.md) — hidden zones: library and hand
- [Tabletop](apps/tabletop/SEAMAP.md) — the shared tldraw canvas
- [Spine](services/spine/SEAMAP.md) — tables, seats, the event log, the interpreter

The full vision: `notes/DESIGN-the-table-vision.md`. Vocabulary: `notes/GLOSSARY.md`.

## North Star

Play Magic together, remotely, at a table the system can see. The apps manage the deck
and the table; you adjudicate the game; an agent gradually learns to interpret the play
— and someday, to play.

## The Mountains

The ladder — playable at all times, increasingly useful and fun. A strangler fig over
Mural, not a rewrite.

1. **The Tabletop replaces Mural** ← _achieved (2026-08-11)_ — a synced tldraw canvas
   where cards arrive from the Shuffler instead of the clipboard, with card shapes and
   gestures (tap, counters, zone areas) that make common movements easy. Better than
   Mural — more fragile, and worth it. The full parity list and the five maps that
   climbed it: `apps/tabletop/notes/DESIGN-tabletop-replaces-mural.md`. Some of its maps
   (e.g. table layout) still carry open tickets; they're fun follow-ons, not blockers,
   and don't unwind the achievement.
2. **Spine Tells the Story** ← _active_ — when people play Magic in this app, the game gets
   recorded: every physical event a real game produces, from both the Shuffler and the
   Tabletop, crosses the Spine's one append-only log per table. That record is what
   feeds development of the Interpreter, once this mountain is reached. Includes: the
   Spine-vocabulary work `tabletop-replaces-mural`'s cards-come-and-go map left behind
   (the eleven hidden-zone Shuffler actions — draw, shuffle, mulligan, put-on-top/bottom,
   …); [The Spine sits in the middle](.scratch/spine-in-the-middle/map.md) — no direct
   HTTP between the Shuffler and the Tabletop survives, everything routes through the
   Spine; and map 5 of `tabletop-replaces-mural` (the Tabletop→Spine sender), which
   overlaps substantially with that map and was absorbed into it.
3. **The Interpreter learns to read the play** — guesses at unexplained physical
   events, asks in chat, is corrected; then ears (per-player transcription); then
   proactive help ("that triggers your rabbit"). Reads the record Mountain 2 built; a
   narration panel showing what happened is part of how it shows its work.
4. **Someday: it asks to play.**

Spectator mode is a constraint on every mountain, not a mountain: anyone can join a
table to look — public events, commentary, hand counts but never hands. That promise is
about what the app _volunteers_ on public/shadow events — a shadow event simply
shouldn't carry a card identity in its payload design — not about policing every
boundary a payload crosses. Removing a boundary check (e.g. `let-gamecardindex-out`)
doesn't touch it; the promise's owner is whoever designs the public/shadow payload
shapes, not a guard standing at the door.

## Sea Monster

It is time to deploy and test in production again. We implemented tabletop-sse-stream and fixed bugs in it.

After the game is working for existing functionality again, we can deploy - currently prod is way behind. But we won't have our mountain yet.

Then we can start on the shuffler SSE stream, there's a map for that.

Then cards-come-and-go, which has been specced out, needs reworked considering the spine is in the middle now.

That will get us to somewhere slightly better than today's production, because you'll be able to return cards from the shuffler. We can call that safe harbor.

From there we can move forward on a few features (like "play face down"), but we'll need to get to tabletop persistence soon for stability.
I am concerned that our event streams are not resilient yet.

## Safe Harbor

A change is home when:

- it's deployed and observable in Honeycomb (prod environment `mtg-deck-shuffler`);
- tests are green;
- documentation — including each ship's seamap — is consistent with the code;
- and nothing in the repo is wrong, deceptive, or extraneous.

## Success looks like

- Playing a real game with your sister feels natural, not fiddly — and the cards
  arrive themselves.
- The running narration is good company: "wait, what just happened?" has an answer.
- The humans teach the AI in public, during play, at exactly the rate they enjoy.
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

There is no external tracker — see `CLAUDE.md` § Seamap.
