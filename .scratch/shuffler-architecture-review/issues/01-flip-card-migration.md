# Migrate flip-card and flip-card-modal onto applyGameCommand

Mountain: overhead
Ship: shuffler
Type: task
Status: resolved

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

## Answer

The assumption held for `/flip-card`: `renderApplied`'s `(game, whatHappened)` already had
enough to re-derive the flipped card via `game.getCards().find(gc => gc.gameCardIndex ===
gameCardIndex)` — no change to `applyGameCommand` needed there.

`/flip-card-modal` needed one small, genuine addition: it renders via
`res.render("partials/card-modal", ...)`, which sends the response itself rather than
returning a string, so it didn't fit `renderApplied`'s `(game, whatHappened) => string`
signature. Widened that signature to `(game, whatHappened) => string | void` —
`renderCommandOutcome`'s `"applied"` case only calls `res.send(html)` when `html !==
undefined`. That's a one-line escape hatch for exactly this shape, not a redesign.

Both routes migrated onto `applyGameCommand`/`parseGameIdParam`/`renderCommandOutcome`,
matching the 9 routes from candidate #1. Consequence: `loadGameFromParams` and
`requireValidVersion` (the middleware pair) became fully unused and were deleted outright.
Only `play-card`/`discard-card` remain on the old inline protocol now (ticket 02 — they need
the tabletop-send veto hook).

Same deliberate behavior change as candidate #1: both routes now uniformly check
`gameStatus() === "Active"`, which the old middleware pair didn't. Neither route previously
enforced that — flipping was allowed on an inactive game. This is the same intentional
uniformity Jess already approved for the other 9 routes, not a new decision.

`npm run build && npm run test` (299 passed) and `./verify.sh` (48 passed, 1 pre-existing
skip unrelated to this change) all green, including the two-faced-card flip specs
(`verify-prep-commander-flip.spec.ts`, the flip case in `verify-library-grouping.spec.ts`).

Consulted `fleet-is-observable-context` before starting (confirmed no telemetry regression —
the two `markCurrentSpanAsError` calls move verbatim, parse-time attributes stay in
`parseGameIdParam`) and `fleet-is-observable-update` after landing (owner docs updated,
committed separately as `7ed8687`).
