# SEAMAP — Tabletop (ship)

One ship in [the fleet](../../SEAMAP.md). The Tabletop is the shared canvas where play
happens — Mural's freedom with Magic's physics. How it fits with the other ships:
the [fleet domain map](../../notes/fleet-domain-map.html).

## North Star

A table that's more fun to play on than Mural, where everything your hands do is an
event the Spine can hear.

## The Mountains

1. **A playable canvas** ← _active_ — a synced tldraw board; cards arrive from the
   Shuffler instead of the clipboard. Playable day one: Mural where the cards arrive
   themselves.
2. **The physics of Magic** — a custom CardShape that taps (rotate), transforms, holds
   counters and notes; zone areas for Graveyard, Exile, and the Stack (geography, not
   rules). Common movements become gestures; every gesture is a physical event.
   _Built: the card shape (tap, transform, face down, counters, notes), zones, the
   Stack, and the player area drawn at shuffle-up (numbers in `DESIGN.md`). Not yet
   built: gestures sent to the Spine as physical events (only the library-portal
   swallow is), and persistence — a redeploy wipes the board._
3. **The window on the game** — the collapsible narration/chat panel: the running
   interpretation, the interpreter's questions, players' answers and corrections.

## Safe Harbor

- Deployed alongside the fleet, observable in Honeycomb.
- Tests green; this map consistent with the code.
- The "made with tldraw" watermark showing, happily.

## Enabling Constraints

- **Physics, not meaning.** Knows which card is which (identity), where the zones are
  (geography), what hands do (tap, transform, counters, notes — it can report a note's text
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
