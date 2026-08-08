# Migrate flip-card and flip-card-modal onto applyGameCommand

Mountain: overhead
Ship: shuffler
Type: task
Status: needs-triage

## Context

`/reveal-card`, `/put-in-hand`, `/put-on-top`, `/put-on-bottom`, `/shuffle`, `/mulligan`,
`/move-hand-card`, `/undo`, `/draw` all moved onto `apps/shuffler/src/apply-game-command.ts`
(2026-08-08). `/flip-card/:gameId/:gameCardIndex` and `/flip-card-modal/:gameId/:gameCardIndex`
(`app.ts`, still using `loadGameFromParams`/`requireValidVersion`) were deliberately left
behind — not because of the tabletop-send hook (that's ticket 02), but because their success
response doesn't fit `renderCommandOutcome`'s `(game, whatHappened) => string` shape:

- `/flip-card` renders `formatFlippingContainer(flippedCard, { page: "game", gameId })` — a
  narrower fragment than the whole game section, and it needs the *specific flipped card*,
  which `applyGameCommand`'s `CommandOutcome` doesn't currently expose (only the whole `game`
  and an optional `whatHappened`).
- `/flip-card-modal` renders `partials/card-modal` with navigation state on top — a third
  distinct shape again.

## What to figure out

Whether `renderCommandOutcome`'s `renderApplied` callback already has enough — it receives
`(game, whatHappened)`, and `game.getCards().find(...)` can re-derive the flipped card from
`gameCardIndex` (which the route already has) without `applyGameCommand` needing to change at
all. If that's true, this is a same-pattern-as-ticket-01-9 migration with no new design. Check
that assumption first before doing anything more elaborate — the deletion test likely says
"nothing new needed here."

## Ship

`apps/shuffler/` only. Verify with `npm run build && npm run test && ./verify.sh` from
`apps/shuffler/`.
