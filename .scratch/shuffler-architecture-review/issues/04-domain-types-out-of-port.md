# Move domain types out of port-persist-state/types.ts

Mountain: overhead
Ship: shuffler
Type: task
Status: needs-triage

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
