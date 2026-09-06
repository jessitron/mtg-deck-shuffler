# Tabletop persists physical events and owns the log-to-state projection

We're moving Tabletop physical events (card moves, taps, flips, and generic shape
create/move/remove for every canvas object, not just cards) into the Spine's append-only
event log, so a discrepancy between the table and its own history becomes visible instead
of a mystery — motivated by an unsolved bug where a player's cards spatially snap back with
no discernible cause. Two decisions came out of designing this:

1. **The Tabletop, not the Spine, owns the projection from event log to Table State.** The
   natural instinct is for the Spine — which owns the log — to compute derived state and
   hand it to callers. We chose the Tabletop instead, because the Tabletop already needs
   this exact log-replay logic for its planned "load an existing table by replaying the
   log" feature (including an eventual animated catch-up). Building the projection twice —
   once in Ruby for diagnostics, once in TypeScript for catch-up — would let the two drift.
   The Spine stays a pure, honest log: it validates, stores, and replays events on request,
   and never computes a Table State of its own. The diagnostic check ("does the live table
   match the log?") is therefore entirely Tabletop-side and headless: it replays the log
   into one Table State, reads the live canvas into another, and diffs the two locally —
   no new Spine endpoint, no wire format for shipping Table State between ships.

2. **A card's arrival gets two events, not one, because two different origins are
   involved.** `card.played` (Shuffler) is the domain decision to play a card; it carries
   no canvas position because the Shuffler doesn't have one. A new `card.arrived`
   (Tabletop) event records where the card actually landed. Every other new physical event
   — `card.moved`, `card.tapped`/`card.untapped`, `card.flipped`, `card.turnedFaceDown`,
   and the generic `shape.created`/`shape.moved`/`shape.removed` fallback for untooled
   shape types — carries its position directly on one event, because for those there's
   only one origin making the decision.

Consequences: `significance` (`physical` vs `domain`) on `card.moved` is left simple
(defaulted, refined later once "designated zone" is pinned down — see
`notes/GLOSSARY.md`'s Designated Zone entry) since it doesn't affect Table State
reconstruction, only interpretation.
