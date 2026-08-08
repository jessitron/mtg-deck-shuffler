# Design the tabletop-send veto hook, then migrate play-card/discard-card

Mountain: overhead
Ship: shuffler
Type: task
Status: needs-triage

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

## What to figure out

`applyGameCommand(deps, gameId, expectedVersion, mutate)` has no slot between
status/version-check and `mutate` for a step that (a) needs the live `GameState` and the
specific `GameCard` the command targets, (b) can compute its own `zoneHint`, and (c) can
**veto the whole command** — abort before `mutate`/persist run, with its own error to render
(not one of `CommandOutcome`'s existing four kinds; the render is route-specific:
`formatTabletopSendErrorModal`).

Two shapes worth grilling with Jess before implementing:

- A `preMutate?: (game: GameState) => Promise<void>` hook parameter that throws to abort
  (same as `mutate` errors propagating today) — cheap, but conflates "aborts, doesn't
  persist" with "threw for a real bug," which currently render differently (502+modal vs 500).
- A new `CommandOutcome` kind, e.g. `{ kind: "vetoed"; errorHtml: string }`, produced by a
  `preMutate` hook that returns a result instead of throwing — keeps veto and bug-error
  distinct in the type, more machinery.

Run `/grilling` on this before implementing — it's a real interface decision, not just
mechanical migration like tickets 01 and 03-06.

## Ship

`apps/shuffler/` only. Verify with `npm run build && npm run test && ./verify.sh` from
`apps/shuffler/` — `verify-table-mode.spec.ts` exercises the unreachable-tabletop path.
