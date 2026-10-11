# DESIGN: The Table Vision

_Captured 2026-07-27 from a design conversation with Jess. This is the larger app vision:
the expansion from deck management into playing together, and from there into an agent
that gradually learns to interpret play — and someday plays._

## The one-sentence version

The Table stops being mysterious.

Today, the glossary says of the Table: "we don't track it in MTG Deck Shuffler. That is
mysterious to us." Cards leave the app via the clipboard and land on a Mural board the
app cannot see. This vision replaces Mural with a tabletop we build (on tldraw), so that
play itself becomes visible to the system — as events — and an agent can gradually learn
to read them.

## The ladder

Each rung must leave the system **playable at all times, increasingly useful and fun**.
This is a strangler fig over Mural, not a rewrite.

1. **Tabletop v0** — a synced tldraw canvas. "Play" in the Shuffler sends the card to
   the table instead of the clipboard. Playable day one: it's Mural where the cards
   arrive themselves.
2. **Card shapes & gestures** — tap/untap, counters, zone areas (Graveyard, Exile,
   Stack). More fun to play on, and every gesture is a free physical event.
3. **Event spine + narration panel v0** — one event log per table; a collapsible text
   panel showing recorded events ("Jess played Lyra Dawnbringer"). No AI yet; it's the
   slot the agent will fill, and already useful for "wait, what just happened?"
4. **Interpreter v0** — watches physical events it can't explain, guesses, asks in the
   chat panel. Corrections are recorded as events.
5. **Ears** — per-player voice transcription joins the event stream. (We do NOT carry
   the voice call — Discord keeps doing transport. Each player's browser transcribes
   its own mic. "The AI can listen" arrives years before "we run a voice channel.")
6. **Proactive help** — triggers ("that triggers your rabbit"), rules context ("Lyra
   has hexproof because of this equipment").
7. **Someday** — the agent asks to play.

Spectator mode (from the Multiplayer-aware mountain) is a constraint on every rung, not
a rung of its own: anyone can join a table to look — see what's happening, the
commentary, and in some modes comment in chat. Long-goal: a spectator's own chat with the agent, for learning
to play.

## The components

The Shuffler, Tabletop, Spine and `contracts/` as built — what each owns, what crosses each
border, and the invariants — are in `fleet-domain-map.html`. The vision adds:

| Component | Language | Owns |
|---|---|---|
| **Interpreter** (later) | inside Spine for now | Translation from physical events to game events. An AI. |
| **Chat / narration panel** (later) | UI in Tabletop, logic in Spine | The running interpretation, player corrections, the agent's questions. |

Architecture notes:

- The **Interpreter** takes the **Journeys** architecture pattern (Avdi is
  inventing it) as its architectural direction. The tour has arrived: README, guide,
  ADRs, and glossary live at `services/spine/interpreter/docs/journeys/`. Journeys
  implement an actor model, a natural fit for modeling cards on the table as actors.
- The interpreter is an **anti-corruption layer that happens to be an AI**: physical
  events in, game events out. Its boundary is sacred from day one even while it lives
  inside the Spine app, so extracting it later is a deployment decision, not a design
  one. The interpreter can add events to the logs, so both the explanans and explanandum show up in the log.

## Meaning belongs to the Interpreter

The Tabletop speaks physics (see the map). It can say "a note was placed on Lyra
Dawnbringer; the text says 'flying until end of turn'". It can never say "Lyra gained
flying" — that's meaning, and meaning belongs to the interpreter. Moving a creature from
the Stack to the battlefield signals the cast went undisputed.

## The event model

One append-only log per table. Constraints, baked in from the first event:

- **Never replace, supersede.** Physical events are evidence; you don't rewrite
  evidence. Interpretations are themselves events, appended later, that **cover**
  earlier events. A correction (from a player, in chat) triggers a superseding
  interpretation. The "current reading" of the game is a projection: each physical
  event's latest surviving interpretation.
- **Provenance on every inferred event.** A game event produced by the interpreter
  carries pointers to the physical/voice/chat events it was inferred from. Provenance
  is what makes corrections and evals possible.
- **Causality is the interpreter's job.** "Lyra gained flying until end of turn
  *because* [ref: Acrobatic Leap cast]" — with commentary ("Lyra already had flying").
- **"We don't know why" is the fallback interpretation**, so every physical event
  always has a current reading, sometimes "unexplained." The set of currently
  unexplained events is the agent's question queue.
- **The log is the eval dataset.** An interpretation event followed by a correction
  event is a labeled training example, with full provenance. No separate eval
  database — evals are a projection of the log. (This generalizes the old "hand
  recommendations & evals" mountain: every agent utterance paired with a player
  reaction is a labeled example, arriving at exactly the rate players enjoy providing
  it.)

### Event kinds (Spine language)

Not all Spine events are game events:

- **Table events** — joining a table, taking a seat, (someday) matching.
- **Chat events** — panel messages, player answers to the agent's questions.
- **Physical events** — from the Tabletop: moves, gestures, note text. Uninterpreted.
- **Game events** — meaning. Mostly born as interpretations of physical events; some
  born directly ("drew a card" from the Shuffler needs no interpreting). "This spell
  was cast, targeting card A" is a game event. So is "Player A moved this card and we
  don't know why" (the fallback).
- **Interpretation / correction events** — the layer tying physical to game, and the
  record of the agent being taught.

## Principles

- **Playable at all times.** Every rung of the ladder is a game you'd actually play.
- **Consensus is expressed physically.** At a real table, agreement looks like nobody
  stopping you. The interpreter reads the players, not the rules — it can never be a
  rules engine (still a non-goal).
- **The players own the game experience.** They enforce the rules, not the app. Jess,
  2026-08-07: _"I don't mind if people can cheat here. If people wanna cheat, it's their
  game."_ The positive form of "not a rules engine," and it decides designs, not just
  features: the app need not prevent actions, and need not conceal information.
- **On the shared canvas, anything one player can do, every player can do.** Jess's
  sharpening of the above, 2026-08-07: not "everything on the canvas *should be* public"
  — rather **there is no privileged actor.** The Tabletop has no ownership or permission
  model: any player can tap, move, turn over, or annotate any card, whoever's deck it came
  from. A card may record *where it came from*, but provenance grants no rights.
  Two consequences worth having in advance:
  - **Concealment on the canvas is theatre, so don't build it.** A face-down card is
    *depicted* face-down, not cryptographically hidden — its identity stays in the shape
    where any client can read it. Guarding it would be pointless anyway, since any player
    can simply turn the card over. For the same reason "let a player peek at a face-down
    card" needed no feature: turning it over already does it, and nothing stops them.
  - **Don't reach for "only the controller may…"** when designing gestures. If a
    restriction seems necessary, ask whether the players would rather just be trusted.
  **Extended past the Tabletop's canvas to the whole fleet, 2026-08-18** (same session
  `gameId` was let cross the Shuffler↔Tabletop boundary): _"If people want to peek at each
  others' hands, by digging around in the network tab and getting super clever about it,
  well, that's the game they choose to play. This game is adjudicated by the players, not
  by this app. This app supports play, it does not enforce."_
- **The humans teach the AI in public, during play.** The chat panel is the eval
  machine, and the teaching is part of the game record.
- **Don't carry what you can listen to.** Discord keeps the voice call; we transcribe.
- **Made with tldraw** — we wear the watermark happily.

## Joining a table (for now)

On the Prep screen, after choosing a deck and before Shuffle Up, the player types the
name of a table. No login, no auth — randos could butt in, and that's OK while we're
demonstrating usefulness. The trust model matches how we actually play: "we're on
Discord anyway, I'll tell you the table name."

## Per-piece vision

### Shuffler (changes to this app)

- Stays the owner of the library, the hand, and its own language.
- Clipboard mode survives as solo mode.
- Someday the hand renders as a tray inside the Tabletop page; for now, separate
  browser tabs are fine. The Shuffler gradually becomes a service behind the tabletop
  rather than a destination page.

### Tabletop

- The freeform layer survives: arrows, sticky notes, scribbles — the Mural joy — comes
  free because it's still a whiteboard underneath. Freeform residue is exactly what the
  interpreter gradually learns to read.
- Emits every gesture to the Spine as a physical event.
- Hosts the collapsible narration/chat panel UI.

### Spine

- Owns projections (current reading, evals) and, for now, the interpreter.
- Plain domain code for tables, seats, and the log; the Journeys pattern belongs to
  the Interpreter (below).

### Interpreter

- Architectural direction: the **Journeys** pattern. Docs (README, guide, ADRs,
  glossary) at `services/spine/interpreter/docs/journeys/`.
- Consumes physical + voice + chat events; produces interpretation events with
  provenance, causality, confidence, and commentary.
- Asks questions in chat when interpretation fails; corrections supersede.
- Grows along the ladder: silent narrator → question-asker → listener → proactive
  helper → someday, a player.

## Repo shape

Polyglot monorepo; the layout is on the map.

Why monorepo: one person on multiple computers; the event schema churns constantly in
early rungs and cross-component changes should be one commit; notes and feature owners
are repo-scoped and will span components; Claude works best with the whole change in
one working tree.

Deployment: **each app is its own container with its own k8s deployment** — this is
NOT one Docker image. The Shuffler, Tabletop (app + sync server), and Spine build,
ship, and scale independently (shared namespace is fine).

## Non-goals (unchanged, plus)

- Still not a rules engine. The interpreter reads players, not rules.
- Still not a deck builder.
- No auth yet, even for tables.
- We do not carry the voice call.
