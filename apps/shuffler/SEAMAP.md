# SEAMAP — Shuffler (ship)

One ship in [the fleet](../../SEAMAP.md). The Shuffler owns the hidden zones — library
and hand — for one player. Its code is this directory.

## North Star

Your library and hand, effortless and true. Shuffle up any deck; the app tracks the
hidden zones so your hands are free to play.

## The Mountains

1. **Good play experience** ← _active_ — the hidden zones feel real and fun.
   _Next peak: table fidelity — animations of cards moving, playmats, sleeves.
   (Discard/exile tracking and "library on the right" are migrating to the Tabletop's
   chart — the table stops being mysterious.)_
2. **Join a table** — a Shuffler Game connects to a Seat at a Table (Spine context).
   _Peaks: **reached (JES-127)** — table + player name on the Prep screen (seatId
   minted at join, prep records table info for rejoining); Play and Discard send the
   card to the table, send-then-commit, the verb implies the landing zone
   (land→battlefield, nonland→stack, discard→graveyard; clipboard survives as solo
   mode). Still ahead: hidden-zone events cast public shadows to the
   Spine (drew a card, hand count, mulligan) — the shadow logic lives here, at the
   source._
3. **A tray, not a tab** — someday the hand renders inside the Tabletop page, and the
   Shuffler becomes a service behind the table rather than a destination. Separate
   browser tabs are fine for now.

## Safe Harbor

- Deployed to EKS at https://mtg.jessitron.honeydemo.io, observable in Honeycomb
  (prod environment `mtg-deck-shuffler`).
- Tests green; docs (including this map) consistent with the code.

## Enabling Constraints

- Keeps its own bounded-context language: Game, Library, Hand, Mulligan. No renames to
  satisfy neighbors — translation happens at the boundary (Game ↔ Seat).
- HTMX for interactivity; custom JS only when HTMX can't do it (OTel, animations).
- EJS templates for pre-game pages and any new pages. The TypeScript view functions on
  the gameplay pages are historical, not an intention to preserve.
- Ports, adapters, gateways (`notes/PATTERN-port-adapter-gateway.md`). Fakes, never mocks.
- Games are tracked as a series of events; everything persisted is versioned.
- Observability is mandatory: telemetry to Honeycomb via OpenTelemetry, trace context
  propagated (including into Spine events), all interesting info on spans.

## Non-goals

- Never shows another player's hand. Hidden means hidden; only shadows are public.
- Not the place where play happens — that's the Tabletop's chart.
