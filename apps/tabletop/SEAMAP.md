# SEAMAP — Tabletop (ship)

One ship in [the fleet](../../SEAMAP.md). The Tabletop is the shared canvas where play
happens — Mural's freedom with Magic's physics.

## North Star

A table that's more fun to play on than Mural, where everything your hands do is an
event the Spine can hear.

## The Mountains

1. **A playable canvas** ← _active_ — a synced tldraw board; cards arrive from the
   Shuffler instead of the clipboard. Playable day one: Mural where the cards arrive
   themselves. _Landed (JES-127, 2026-07-27): synced canvas at `/t/:tableName`,
   card-arrival API with per-seat battlefield rows + graveyard/exile spots, OTel on
   server and browser, deployed at table.jessitron.honeydemo.io. Remaining for this
   mountain: the Shuffler-side integration (Part B — prep inputs, play/discard send)._
2. **The physics of Magic** — a custom CardShape that taps (rotate), flips, holds
   counters and notes; zone areas for Graveyard, Exile, and the Stack (geography, not
   rules). Common movements become gestures; every gesture is a physical event.
3. **The window on the game** — the collapsible narration/chat panel: the running
   interpretation, the interpreter's questions, players' answers and corrections.
   Spectators get the public view.

## Safe Harbor

- Deployed alongside the fleet, observable in Honeycomb.
- Tests green; this map consistent with the code.
- The "made with tldraw" watermark showing, happily.

## Enabling Constraints

- **Physics, not meaning.** Knows which card is which (identity), where the zones are
  (geography), what hands do (tap, flip, counters, notes — it can report a note's text
  without knowing what it means). Never interprets cards.
- The freeform layer survives: arrows, scribbles, sticky notes — the Mural joy — stay
  possible, and their uninterpreted residue is what the interpreter learns to read.
- The tldraw sync server stays deliberately dumb: presentation replication only.
  Domain authority lives in the Spine.
- React + tldraw (the pixels are TypeScript's).
- Round corners allowed on cards and playmats only, as ever.
- Observability is mandatory: telemetry to Honeycomb via OpenTelemetry, trace context
  propagated (browser spans included, across the websocket sync), all interesting
  info on spans. From the first commit.

## Non-goals

- No rules enforcement. Consensus is expressed physically — stack → battlefield means
  nobody objected.
- Doesn't own game state; it emits physical events and renders what it's told.
