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

1. **The Tabletop replaces Mural** ← _active_ — a synced tldraw canvas where cards
   arrive from the Shuffler instead of the clipboard; then card shapes and gestures
   (tap, counters, zone areas) make common movements easy.
2. **The Spine tells the story** — one event log per table; a narration panel showing
   what happened, before any AI fills it.
3. **The Interpreter learns to read the play** — guesses at unexplained physical
   events, asks in chat, is corrected; then ears (per-player transcription); then
   proactive help ("that triggers your rabbit").
4. **Someday: it asks to play.**

Spectator mode is a constraint on every mountain, not a mountain: anyone can join a
table to look — public events, commentary, hand counts but never hands.

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
- Everything persisted is versioned (`notes/DESIGN-persistence-versioning.md`).
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

Where the live work for this project is recorded. The Mountains above are mirrored as
Linear milestones (re-mirroring needed after this re-charting); landings, sea monsters,
and treasures live as issues — never in this doc.

- backend: linear
- project: [MTG Deck Shuffler](https://linear.app/honeycombio/project/mtg-deck-shuffler-7e9e20cc93e9)
- team: jessitron
