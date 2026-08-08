# Shuffler architecture review — deepening the shallow modules

Mountain: overhead
Ship: shuffler
Type: wayfinder:map

## Destination

The 2026-08-08 `/improve-codebase-architecture` review of `apps/shuffler/` surfaced six
deepening candidates. Candidate #1 (the app.ts route-mutation protocol) is done. This map
tracks the other five, plus one piece of #1 that was deliberately deferred rather than
bundled in. Done when each ticket below is either resolved or explicitly parked with a reason.

## Notes

- The original report (HTML, not committed — it lived in the OS temp dir for that session)
  used `/codebase-design` vocabulary throughout: module, interface, depth, seam, adapter,
  leverage, locality. Keep using those terms in these tickets rather than drifting into
  "component"/"service"/"boundary."
- Before touching anything that adds/changes UI (ticket 06 touches `<head>` for every page):
  consult `owners/shuffler-looks-like-itself/`.
- Before touching anything that touches HTTP middleware or recording-that-something-happened
  (tickets 01, 02): consult `owners/fleet-is-observable/`. It already has a note (added
  2026-08-08) on which of app.ts's game routes are on the new `applyGameCommand` protocol vs.
  the old `loadGameFromParams`/`requireValidVersion` middleware pair — read that before
  extending either.

## Decisions so far

- **[Design and implement the tabletop-send pre-commit hook](issues/02-tabletop-send-veto-hook.md) —
  done** (2026-08-08). `applyGameCommand` gained an optional `beforeMutate` hook (runs after
  status/version checks, before `mutate`); on failure it throws a typed
  `TableSendFailedError(errorHtml)`, which `applyGameCommand` catches into a new
  `CommandOutcome` kind, `{ kind: "send-failed", errorHtml }` — any other thrown error still
  propagates uncaught, same as `mutate`'s do today. `renderCommandOutcome` got the matching
  case. `/play-card`/`/discard-card` fully migrated onto `applyGameCommand` +
  `renderCommandOutcome`, same as the other 9 routes; the now-dead `validateStateVersion`
  helper was deleted. Both routes' `beforeMutate` closures share one local helper,
  `sendCardBeforeMutate`, so the span-attribute set and the send-failure logging (now
  `log.error`, not `console.error`, per `fleet-is-observable`) live in one place, not two.
  A code-review pass before commit caught and fixed one real regression (lost span
  attributes in `/play-card`'s mutate callback). Also: it isn't a veto (permission check),
  it's a required side effect — renamed accordingly, so the kind is `"send-failed"` not
  `"vetoed"`.

- **Candidate #1 — collapse app.ts's route-mutation protocol: done** (2026-08-08, merged to
  main). Deleted the dead `/put-down` route, collapsed GameState's four `*ByGameCardIndex`
  methods into `moveByGameCardIndex(index, destination)`, added Express-free
  `apply-game-command.ts` (unit-tested, no HTTP layer needed), and migrated 9 routes onto it:
  `reveal-card`, `put-in-hand`, `put-on-top`, `put-on-bottom`, `shuffle`, `mulligan`,
  `move-hand-card`, `undo`, `draw`. All 9 now uniformly check `gameStatus() === "Active"`
  (6 of them didn't before — deliberate behavior change, approved by Jess, not a side effect).
  `flip-card`, `flip-card-modal`, `play-card`, `discard-card` deliberately stayed on the old
  middleware pair — see tickets 01 and 02 (both now done; all 13 game-mutating routes are on
  `applyGameCommand`).

- **[Migrate flip-card and flip-card-modal onto applyGameCommand](issues/01-flip-card-migration.md) —
  done** (2026-08-08). The `renderApplied` assumption held for `/flip-card` (no change to
  `applyGameCommand` needed); `/flip-card-modal` needed `renderApplied`'s signature widened
  to `(game, whatHappened) => string | void` since it sends its own response via `res.render`.
  `loadGameFromParams`/`requireValidVersion` are now fully unused and deleted.

## Fog — not yet specified

- [Shrink active-game-page.ts's interface](issues/03-active-game-page-interface.md)
- [Move domain types out of port-persist-state/types.ts](issues/04-domain-types-out-of-port.md)
- [Name the send-then-commit failure protocol](issues/05-name-send-then-commit-protocol.md)
- [Unify the Shuffler's two page-shell builders](issues/06-unify-page-shell.md)
