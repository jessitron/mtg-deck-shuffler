# 06 — Give rooms.ts a typed "does this instance exist" question

**Status:** ready-for-agent

**Files:** `src/server/cardArrival.ts` (`instanceAlreadyOnTable`, lines 40–44), `src/server/rooms.ts`

**Problem:** the one place that reaches into tldraw's raw snapshot with an unchecked `as any`
cast (`room.getCurrentSnapshot().documents`) sits beside the HTTP handler in `cardArrival.ts`,
not beside the module (`rooms.ts`) that owns room state.

**Solution:** a typed method on `RoomEntry` that owns the cast and the scan — per the review,
this file is "already shallow," so the fix is pushing the responsibility one level deeper, not
splitting it further.

- [ ] `RoomEntry` gains a method, e.g. `hasInstance(instanceId: string): boolean`, that owns the
      snapshot read and the cast internally.
- [ ] `cardArrival.ts`'s `instanceAlreadyOnTable` (or its call site) calls `RoomEntry.hasInstance`
      instead of reaching into the raw snapshot itself.
- [ ] The `as any` cast is gone from `cardArrival.ts` — it now lives inside `rooms.ts`, where the
      room-state module can keep it correct if tldraw's snapshot shape ever changes.
- [ ] Unit test coverage on `RoomEntry.hasInstance` directly, not only indirectly through
      `cardArrival.ts`'s existing tests.
