# Design the tabletop-send pre-commit hook, then migrate play-card/discard-card

Mountain: overhead
Ship: shuffler
Type: task
Status: resolved

## Context

`/play-card/:gameId/:gameCardIndex` and `/discard-card/:gameId/:gameCardIndex` in `app.ts`
still hand-inline the full retrieve/reconstruct/status-check/version-check/mutate/persist
protocol instead of using `apply-game-command.ts`, because in table mode they must send the
card to the Tabletop **first** (send-then-commit, JES-127/`notes` in `apps/shuffler/CLAUDE.md`
§ Table Mode) and abort the whole request — no mutation, no persist — if the tabletop rejects
it (502 + `formatTabletopSendErrorModal`).

Exact current shape (`app.ts`, both routes near-identical except the verb and zone hint):

1. retrieve, reconstruct, status-check, version-check (inlined, not via `applyGameCommand`)
2. `game.findCardByIndex(gameCardIndex)`
3. if `game.tableName` and the card's in the right zone: compute a `zoneHint`
   (`zoneHintForPlay(card)` for play, literal `"graveyard"` for discard), call
   `sendCardToTableFirst(tabletopPort, game, card, zoneHint)` — on throw, 502 + modal,
   **stop here, nothing persisted**
4. `game.playCard(...)` / `game.discardCard(...)` (returns `WhatHappened`)
5. persist, render (`formatActiveGameHtmlSection(game, whatHappened)`)

## What to figure out — resolved by /grilling, 2026-08-08

`applyGameCommand(deps, gameId, expectedVersion, mutate)` has no slot between
status/version-check and `mutate` for a step that (a) needs the live `GameState` and the
specific `GameCard` the command targets, (b) can compute its own `zoneHint`, and (c) sends the
card to the tabletop — a **required side effect**, not a permission check: on failure it aborts
the whole command (no mutate, no persist), with its own error to render
(`formatTabletopSendErrorModal`, route-specific).

**Naming correction from the grill**: earlier drafts of this ticket called this a "veto hook."
It isn't a veto (a gate deciding whether the command is *allowed*) — it's an important
side-effecting call (telling the Tabletop about the card) whose failure means the command
can't safely proceed. Keep calling it a pre-commit side effect / `beforeMutate`, not a veto.

**Settled design (revised — Jess changed her mind back to the typed-outcome shape):**

- `applyGameCommand` gains one new optional parameter:
  `beforeMutate?: (game: GameState) => Promise<void>`, called right after the existing
  status/version checks, before `mutate`.
- On failure, `beforeMutate` throws a dedicated `TableSendFailedError(errorHtml)` — a small typed
  error class carrying the pre-rendered `errorHtml` (from `formatTabletopSendErrorModal`).
  `applyGameCommand` catches specifically that class and returns a new `CommandOutcome` kind,
  `{ kind: "send-failed"; errorHtml: string }`. Any other error (a real bug) still propagates
  uncaught, same contract `mutate` errors already have today.
- `renderCommandOutcome` gets one new `case "send-failed"`: `502`, `HX-Retarget`/`HX-Reswap` to
  the modal container, send `outcome.errorHtml` — same headers the inline code sets today.
- `/play-card` and `/discard-card` fully migrate onto `applyGameCommand` + `renderCommandOutcome`,
  same as the other 9 routes — no bespoke `res.headersSent` guard, no route doing its own
  rendering mid-flight. Each route's `beforeMutate` closure reproduces today's inline logic: look
  up the card, check `game.tableName` + zone, and if applicable `await
  sendCardToTableFirst(...)`, catching its failure and re-throwing as
  `TableSendFailedError(formatTabletopSendErrorModal(verb, cardName, tableName))`.
- Naming stays `"send-failed"`, not `"vetoed"` — per the correction above, this is a required
  side effect failing, not a permission check being denied.

This is a clean win over the self-rendering-closure alternative considered earlier: because the
outcome is typed, `/play-card`/`/discard-card` can now go through the *exact* same
`applyGameCommand`/`renderCommandOutcome` pair as the other 9 routes, rather than staying
bespoke routes with their own response-writing inside the hook. That was the whole point of this
ticket's migration, so the typed outcome earns its extra machinery.

This was chosen over collapsing tabletop-send failures into the generic `500` catch-all: that
distinction is real, tested behavior (`verify-table-mode.spec.ts` exercises the
unreachable-tabletop path rendering 502+modal), and losing it would be a behavior regression
riding along on what's supposed to be a structural migration.

A related but explicitly out-of-scope idea surfaced during the grill: `applyGameCommand`'s
whole retrieve/reconstruct/check/mutate/persist shape resembles the Journey pattern documented
for the Spine (`services/spine/interpreter/docs/journeys/`) — the tabletop send in particular
reads as an *Enactment*, not a veto. Not pursued here; captured as `applygamecommand-as-journey`
in the root `TODO.md`.

## Ship

`apps/shuffler/` only. Verify with `npm run build && npm run test && ./verify.sh` from
`apps/shuffler/` — `verify-table-mode.spec.ts` exercises the unreachable-tabletop path.
