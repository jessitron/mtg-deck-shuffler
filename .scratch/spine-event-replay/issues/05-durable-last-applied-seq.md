# 05 — Shuffler: durable seed for a resumed subscription's `lastEventId`

Mountain: spine-gathers-data
Ship: shuffler
Status: needs-triage

**What's wrong:** `subscribeToSpine`'s `lastAppliedSeq` (`src/port-spine/spineSubscriber.ts`)
lives only in that call's closure. `ensureGameSpineSubscription`
(`gameSubscriptionRegistry.ts`) opens a brand-new `subscribeToSpine` call whenever a
torn-down registry entry is re-created — every browser tab closing then a new one opening,
or a server restart — and that fresh call always starts with `lastAppliedSeq: undefined`. A
game resumed after its subscription was fully torn down currently sends **no** `lastEventId`
on that first connect, silently missing anything the Spine published in the gap. This is not
a duplicate (dedup on event id would catch that) — it's a genuine loss, confirmed by a
failing test in `test/port-spine/gameSubscriptionRegistry.test.ts` ("a game resumed after its
Spine subscription was fully torn down connects with no lastEventId").

**Fix direction:** any Spine event that mutates a game becomes a real entry in that game's own
`GameEventLog` (`src/GameEvents.ts`) — not a side-channel field — carrying the Spine event's
`seq`. `ensureGameSpineSubscription` seeds a fresh subscription from the highest `spineSeq`
already recorded there, instead of always starting from `undefined`.

## Acceptance criteria

1. **`MoveCardEvent`** (`src/GameEvents.ts`) gains an optional `spineSeq?: number` field, and
   `verb` gains `"returned"` alongside the existing `"discard"`/`"play-face-down"`.
   `nameMoveCardEvent` labels `verb: "returned"` as **"Return from table"** in move history.
2. `spineSeq` and `verb: "returned"` thread through `GameState.moveByGameCardIndex` →
   `moveCard`/`addToRevealed` → `executeMove` → `eventLog.record(...)` as new optional
   parameters. `cardReturnedDispatch.ts` passes the envelope's `seq` and `verb: "returned"`
   when it calls `moveByGameCardIndex` for `card.returned`.
3. This is an optional field with a graceful fallback (an old saved game read by new code is
   still correct — `spineSeq` is simply absent) — per
   `notes/DESIGN-persistence-versioning.md`'s exception, **no `PERSISTED_GAME_STATE_VERSION`
   bump**.
4. **Undo is disabled** for a `verb: "returned"` move: add it to `GameEventLog.canBeUndone`'s
   blocked list alongside `"start game"`/`"deal opening hand"`. (Round-tripping undo through
   the Spine so the Tabletop can restore the card's prior position is filed separately —
   `spine-return-undo-round-trip` in `TODO.md` — and is out of scope here.)
5. `ensureGameSpineSubscription` gains a parameter for the persisted game's events array. Both
   `app.ts` call sites (`GET /game/:gameId`, `GET /game-section/:gameId`) pass
   `persistedGame.events` — already loaded in scope at both call sites, no extra fetch.
   `ensureGameSpineSubscription` scans those events for the max `spineSeq` and passes that as
   the seed. Stays synchronous — no `async` ripple into either route.
6. `subscribeToSpine` accepts that seed as its initial `lastAppliedSeq` (today it always starts
   `undefined`), so the very first connect after a resume sends the correct `lastEventId`.
   A game whose log has no recorded `spineSeq` at all (never applied a Spine event) still seeds
   `undefined`, same as today's true first-ever connection.
7. **New replay-contract guard in `spineSubscriber.ts`**: `extractSeq` (reading the envelope's
   `seq` field) moves up from `cardReturnedDispatch.ts` into `spineSubscriber.ts` as a generic
   helper — it's an envelope-level field, not `card.returned`-specific. `handleFrame` checks
   incoming `seq <= lastAppliedSeq` **before** calling `onEvent` at all; if true, skip the
   dispatch entirely and `log.warn` (table id, seq, lastAppliedSeq) — the Spine replayed
   something at or before the cursor we gave it, which shouldn't happen. No live span exists
   at that point, so a log is correct per the observability convention (span attribute only
   when there's a live span to hang it on).
8. `seenEventIds` (`gameSubscriptionRegistry.ts`) is unchanged: in-memory, per-live-subscription,
   dedups a redelivered envelope id within one connection's lifetime. Unrelated to the durable
   seed and to the guard in (7), which is about a seq the Spine should never have sent at all.
9. The existing failing test in `test/port-spine/gameSubscriptionRegistry.test.ts` ("a game
   resumed after its Spine subscription was fully torn down...") passes once this lands, with
   its `ensureGameSpineSubscription` calls updated to the new signature (passing the loaded
   persisted events).
10. **UI freshness**: after a `card.returned` event is applied, the `game-state-updated` SSE
    push causes the browser to re-fetch `/game-section/:gameId`, and the fragment served there
    reflects the incremented `getStateVersion()` (`eventLog.getEvents().length`) including that
    event. This already falls out of `applyGameCommand` persisting before
    `cardReturnedDispatch.ts` calls `broadcastGameStateUpdated` — add a test that pins it down
    given the new field.

**Out of scope** (separate nodes in `map.mmd`, not this ticket): surfacing the last-event-number
in the UI, and rebasing player actions taken while disconnected.
