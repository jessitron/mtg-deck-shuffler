# Move domain types out of port-persist-state/types.ts

Mountain: overhead
Ship: shuffler
Type: task
Status: resolved

## Context

Architecture review candidate #4 (Worth exploring). Genuinely domain vocabulary —
`GameStatus`, `LibraryLocation`, `CardLocation`, `GameId`, `CommandZoneLocation` — is defined
in `src/port-persist-state/types.ts` and only re-exported from `GameState.ts`
(`export { GameId, GameStatus, CardLocation, GameCard, LibraryLocation, CommandZoneLocation };`,
near the top of the file). A reader looking for "what is a `CardLocation`" in `GameState.ts`
finds only a re-export and has to already know to search a directory named for persistence,
not domain.

The six `port-*/types.ts` files aren't internally consistent either: `port-persist-state`
splits `types.ts` from `persisted-types.ts` (port interface vs. on-disk shape);
`port-persist-prep` has only one `types.ts` covering both concerns. Not in scope to fix all
six — just `port-persist-state`, since that's the one holding domain types today.

Note: during ticket work on candidate #1 (2026-08-08), a new type was added in this exact
spot — `CardMoveDestination` in `GameState.ts` (not the port) — specifically because it's
`GameState`-owned vocabulary, not persistence. That's the target shape for this ticket:
domain types live next to `GameState.ts`, not inside a port.

## What to change

Move `GameStatus`, `LibraryLocation`, `CardLocation`, `GameId`, `CommandZoneLocation` (and
whatever else in `port-persist-state/types.ts` is genuinely domain vocabulary rather than
port-interface or persisted-shape) to live next to `GameState.ts` — either inline or in a
sibling `domain-types.ts`. Leave `port-persist-state/types.ts` holding only the
`PersistStatePort` interface and its adapter-specific types. Update the re-export in
`GameState.ts` accordingly (or remove it if nothing re-exports through it anymore).

## Ship

`apps/shuffler/` only. This is a pure move — `npm run build` catching every import site is
the real test; `npm run test` should need no changes to assertions, only import paths.

## Answer

Done 2026-08-08. Created `src/domain-types.ts` (sibling to `GameState.ts`) holding the
game-state domain vocabulary: `GameId`, `GameStatus`, the five location interfaces,
`CardLocation`, `printLocation`, and `GameCard`. A file-header comment names the dependency
direction: GameState owns these; the persistence port depends on them, not vice versa.

A sibling file, not inline in `GameState.ts`, because `persisted-types.ts` needs
`CardLocation` — inlining would have made `port-persist-state` import `GameState.ts` while
`GameState.ts` imports the port: a cycle.

`port-persist-state/types.ts` now holds only the persisted envelope and port surface:
`PERSISTED_GAME_STATE_VERSION`, `IncompatibleStateVersionError`, `PersistedGameState`,
`GameHistorySummary`, `PersistStatePort`. It imports `GameId`/`GameStatus` from
`../domain-types.js` and does NOT re-export them — the two persist-state adapters were
updated to import `GameId` from the domain file directly (the compiler caught these two,
which the grep for `port-persist-state/types` importers had missed because they use the
relative `./types.js`).

`GameState.ts`'s re-export line survives unchanged and now reads sensibly — the names it
re-exports come from its sibling, not from a persistence directory. Importers via
`GameState.js` (e.g. the two adapter tests) needed no changes.

Pure move: `npm run build` clean, all 35 suites / 302 tests pass with only import-path
changes, exactly as the ticket predicted.
