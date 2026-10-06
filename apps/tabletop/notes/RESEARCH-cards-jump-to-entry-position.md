# Research: cards-jump-to-entry-position

Scope: `apps/tabletop`. Open bug, unsolved — this file exists to hold what's been
ruled out and what's instrumented, so the next session (or the next occurrence)
doesn't repeat the same dead ends.

**Bottom line up front:** occasionally, with no discernible trigger, a batch of
one player's card shapes reset to their Stack entry position — as if the cards
had just been freshly played. Still happening post-tldraw-upgrade (the upgrade
was tried as a possible fix; it wasn't one). Root cause is still unknown as of
2026-09-01. Two hypotheses ruled out; the instrumentation added 2026-08-25 was
checked against two real incidents and came back clean (no signal) on one of
them, ruling out both instrumented store-listener paths for that occurrence;
`TLSyncClient.didReconnect()` is a real candidate mechanism but doesn't fully
match the observed silence — see below.

## Symptom

Jess, verbatim (TODO.md, filed before 2026-08-25):

> weird bug: `cards-jump-to-entry-position` occasionally, for no discernable
> reason, a bunch of Evelyn's cards return to the stack as if they were just
> played 😭

## Ruled out

**1. tldraw undo/redo.** `TablePage.tsx`'s `uiOverrides.actions` wraps both
`actions.undo.onSelect` and `actions.redo.onSelect` in an `inSpan("undo"/"redo",
...)` — added specifically because tldraw's undo/redo run against the *shared
synced store*, not a local-only history, so one player hitting ctrl-Z could in
principle revert other players' card moves back to their creation position.
Confirmed (2026-08-25, Jess): this span does not fire when the bug occurs. Not
the cause.

**2. A server-side write to an existing card's x/y.** Full inventory of every
server-side write to `mtg-card` shapes, via the `tabletop-shape-mechanics` owner
(2026-08-25):

- `cardArrival.ts`'s `placeArrivedCard` (shared by `applyCardArrival` and
  `applyCardDiscard`) — mints a **brand-new** shape via `store.put`, position
  from `stackCardPosition`/`graveyardCardPosition`. Never updates an existing
  shape's x/y. The `hasInstance` dedup check blocks a second `card.played` for
  the same instance from ever reaching `store.put` again.
- `cardRemoval.ts`'s `applyCardRemoval` — deletes the card shape; the only x/y
  math here is repositioning **passenger** shapes (counters/notes) to hold their
  place, never the card itself.
- `seatJoined.ts` — mints commander + ghost cards, only at creation.
- `rooms.ts`'s `RoomEntry.stackCardCount` — read-only snapshot read, never
  writes.

So no known server code path finds an existing card shape by id and overwrites
its x/y. If this is a server-caused reset, it isn't coming through any of the
paths this ship's own code controls.

## Real incident checked against the instrumentation (2026-09-01)

Jess built a Honeycomb board ("Collection of Evil Glitches") pinning two times
Evelyn reported the glitch. Checked both against `mtg-tabletop-web` (only one
table ever runs at a time, so no cross-table dilution to worry about):

- **Incident 1** ("1:27 am", 2026-08-31 ~06:25-06:29 UTC): 43 "card moved by
  remote change" spans fired, but the before/after deltas (~150-350px) read as
  ordinary drags spread across the whole window — no burst, nothing that looks
  like a batch snap-back.
- **Incident 2** ("reported at 3:49", 2026-08-29 ~20:47-20:51 UTC): **zero**
  "card moved by remote change" spans, and only 2 "card arrived on canvas"
  spans (both ordinary new lands being played, not a batch reset). Neither
  instrumented path — the `updated` listener or the `added` listener — saw
  anything during this occurrence.

Incident 2 is the clean result: it confirms the reset is not reaching the
client's tldraw store as an `updated` or `added` event on the affected tab.
Whatever moves the card back, it bypasses `store.listen` entirely.

## `TLSyncClient.didReconnect()` — a mechanism that would bypass the store listeners

Read `@tldraw/sync-core`'s `TLSyncClient.js` (`didReconnect()`, lines
333-385) — this is a real candidate that would explain the zero-telemetry
result, though not perfectly.

On every socket reconnect (soft or hard), the client:

1. Reverses `speculativeChanges` (the diff for local edits not yet
   server-confirmed) directly on the store **with `{ runCallbacks: false }`**
   — this snaps any shape with an in-flight, unacknowledged edit back to its
   last server-confirmed value with **no store listener firing at all**,
   invisible to `store.listen`, including this ship's `source: "remote"`
   instrumentation.
2. Applies the server's diff-since-last-clock (or, on a hard reset, the full
   document) via `applyNetworkDiff(..., true)` — this step *does* fire
   listeners.
3. Re-applies the original speculative diff on top and re-pushes it as a
   fresh request, restoring the local edit — this time observed.

All three run inside one `transact()`, so normally this collapses into one
invisible frame with no flicker: engineered specifically not to leave a
trace, and it self-heals via step 3's re-push. The failure mode that would
produce the bug: if step 3's re-push is dropped, rejected, or never re-fires
(e.g. an empty/squashed diff), the shape is left at step 2's "last-confirmed"
value — which, for a card whose first edit after being played is still
unconfirmed at disconnect time, **is its Stack entry position**. That matches
the bug's shape exactly (a batch of a player's cards reset "as if just
played").

**Doesn't fully match incident 2's silence**, though: step 2's
`applyNetworkDiff(..., true)` does fire store listeners, so this path
predicts *some* signal, not the observed zero. Two things weren't checked in
this pass and are the natural next step:

- `ClientWebSocketAdapter.js`'s reconnect/backoff triggers, and this ship's
  own `useSync`/`TLSocketRoom` wiring in `apps/tabletop/src` — what actually
  causes a reconnect in practice here (network blip, tab backgrounding,
  server restart)?
- Whether a **full page reload** is the closer match instead of a same-tab
  reconnect — a reload wouldn't go through `didReconnect()` at all, it'd go
  through this ship's own initial-load path, a third, still-uninstrumented
  code path distinct from both the `updated` and `added` listeners this
  session has been checking.

## Open hypotheses (not investigated)

- **`cardSwallow.ts:70`** has a defensive guard comment — `if
  (!editor.getShape(id)) return; // already gone (e.g. store reset mid-flight)`
  — that names a "store reset" as a possibility without anyone having traced
  what one actually is or when it fires. Speculative wording, not an observed
  mechanism, but the closest existing reference to this shape of bug.
- Server or client process restart wiping in-memory room state (`TLSocketRoom`
  has no persistence layer) is a bigger-blast-radius event than "a batch of one
  player's cards" and probably doesn't match the symptom, but hasn't been
  formally excluded.

## What's instrumented now (2026-08-25)

The gap: `usePhysicsAnnouncements.ts` (the hook that announces card taps,
transforms, zone moves, etc. as spans) only listens with `store.listen(callback,
{ source: "user", scope: "document" })` — tldraw's `source: "user"` filter
means "changes this tab's own actions made." It **never sees a position change
that arrives via the sync protocol** from the server or another client's tab
(`source: "remote"`). Combined with the server-side inventory above, a reset
caused by anything other than a local drag in the affected tab would have
produced **zero telemetry** anywhere in the fleet — client or server.

Fix (instrumentation only, not a resolution): `useCardArrivalSpans.ts` already
had a second, `source: "remote"` listener (previously only used to emit "card
arrived on canvas" for brand-new shapes). Extended it to also watch
`change.changes.updated` for an existing `mtg-card` shape's x/y changing,
emitting a new span **"card moved by remote change"** — `card.instance_id`,
`card.definition_id`, `card.name`, `shape.id`, `position.before.x/y`,
`position.after.x/y`. Debounced 300ms per `shape.id` (mirroring
`usePhysicsAnnouncements`'s `GENERIC_SETTLE_MS` pattern) — tldraw's
`Translating.ts` writes to the store on every pointer-move during a drag, not
just on drop, and a remote drag replicates that same per-frame volume over
sync-core, so without debouncing this would fire once per animation frame of
*every* remote drag on the table rather than once per completed move.

This is the one place in the codebase that would currently observe a
remote-origin position change on an existing card shape. It does not explain
the bug — it's there so that the *next* occurrence leaves a trace: whichever
client/session produced the "before" and "after" positions will show up in
Honeycomb (`mtg-tabletop-web`, span name `card moved by remote change`).

See also: `owners/tabletop-shape-mechanics/interactions.md` watch point 20 (the
per-pointer-move noise fact this debounce works around) and `history.md` for the
implementation record.

## What's instrumented now (2026-09-01): reconnect detection

Jess's own reconnect hypothesis was that a reconnect leaves zero trace anywhere in the
fleet — not even a "the socket dropped" fact. `useSync`'s returned store only exposes
`status: "loading" | "error" | "synced-remote"` at the top level, but while
`status === "synced-remote"` it also carries `connectionStatus: "offline" | "online"`
(`useSync.js`, backed by `ClientWebSocketAdapter`'s `connectionStatus` via
`onStatusChange`) — there is no separate "reconnecting" state exposed at this level, so
a transition to `"offline"` and back to `"online"` is the closest observable proxy for a
disconnect/reconnect cycle.

New hook `useReconnectSpans.ts` (`apps/tabletop/src/client/useReconnectSpans.ts`),
wired into `TablePage.tsx` alongside `useCardArrivalSpans`/`usePhysicsAnnouncements`,
watches that `connectionStatus` and emits two spans on transitions (following the same
`void inSpan("name", () => {}, {attrs})` idiom as "card arrived on canvas"/"card moved by
remote change" — a store-driven callback has no ambient span to hang attributes on):

- **"sync connection lost"** when `connectionStatus` changes to `"offline"`.
- **"sync connection reconnected"** when it returns to `"online"` — carries
  `reconnect.offline_duration_ms` (client-side timestamp diff between the two
  transitions) and `reconnect.card_count` (a one-shot `store.allRecords()` count of
  `mtg-card` shapes at that moment — a cheap summary, not a per-shape snapshot; not
  guaranteed complete the instant `connectionStatus` changes, since there's no confirmed
  guarantee the store has finished catching up on missed updates by then).

`table.name`/`table.slug` need no extra attribute — `setGlobalAttrs` already stamps them
on every span. The first observation after mount just establishes a baseline; only a real
transition fires a span, so a normal, uninterrupted session emits neither.

**Verified live** (2026-09-01): ran the fleet locally, joined a real table via the
Shuffler's "Join a table" flow, then killed and restarted the Tabletop server process to
force a real socket drop/reconnect. Queried Honeycomb (`local` env, `mtg-tabletop-web`)
afterward and confirmed both spans fired: "sync connection lost" at 14:05:31Z, "sync
connection reconnected" at 14:05:35Z with `reconnect.offline_duration_ms: 4000`,
`reconnect.card_count: 2`, `table.name`/`table.slug` correctly stamped. This also
reconfirmed the "Open hypotheses" bullet above about a server/process restart wiping
in-memory room state — the canvas came back empty of its original shapes after the
process restart (tldraw's own reconnected UI still rendered, so this was a real
reconnect, not a fresh page load).

This does not explain the bug — it's here so the *next* occurrence can be checked
against "did a reconnect happen around this time," the same way "card moved by remote
change" already lets an occurrence be checked against "did a remote store update happen
around this time."

## Next steps

1. Trace what actually triggers a client reconnect in this ship's real usage
   — read `ClientWebSocketAdapter.js`'s backoff/reconnect triggers and this
   ship's own `useSync`/`TLSocketRoom` wiring in `apps/tabletop/src`. Network
   blip, tab backgrounding, and server restart all plausibly happen during a
   multi-hour game night; which one is common enough to explain "occasionally"?
2. Check whether a full page reload (bypassing `didReconnect()` for this
   ship's own initial-load path) fits incident 2's silence better than a
   same-tab reconnect — that's a third, still-uninstrumented code path.
3. If reconnect/reload traffic is found near a reported time, look for
   `didReconnect()`'s step 3 (the speculative-diff re-push) failing to fire —
   that's the specific failure mode that would leave a card at its
   last-server-confirmed (i.e. Stack entry) position.
4. For any *future* occurrence: query Honeycomb (`mtg-tabletop-web`) for
   `card moved by remote change` spans around the reported time first (cheap,
   already wired up), and now also for "sync connection lost"/"sync connection
   reconnected" spans — a reconnect near the reported time is now directly
   visible instead of inferred.
