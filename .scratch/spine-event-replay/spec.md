# Spine event replay — no more silently lost events on reconnect

Mountain: spine-gathers-data
Ship: fleet
Status: ready-for-agent

Produced from a live Honeycomb investigation (2026-09-01): 3 of 8 `card.returned` events
in a short window never reached the Shuffler, coinciding with a dip/recovery in
`spine.open_streams`. Root cause confirmed in code and comments on both subscribers:
neither has any catch-up on reconnect, and the Spine's stream has nothing to replay even
if asked.

## Problem Statement

Both the Shuffler and the Tabletop keep a long-lived SSE subscription open against the
Spine's per-table event stream. That connection drops sometimes — a pod restart, a
network blip, a Spine deploy — and both subscribers already reconnect on their own with
backoff. But neither asks for what it missed, and the Spine has nothing to hand back if
they did: every event broadcast while a subscriber was between connections is gone for
good, silently. No error, no warning surfaced to a player, no sign in the log beyond a
generic "reconnecting" line. A card returned to the library while the Shuffler happened
to be reconnecting simply never shows up there — the player has no way to know why, and
no recourse but to notice something's missing and fix it by hand.

This is a correctness gap in Mountain 2's core promise: "every physical event... crosses
the Spine's one append-only log per table" and reaches both apps. The log already has
every event, in order — the gap is purely in delivery across a reconnect.

## Solution

The Spine's per-table event stream supports replay-on-connect, using the ordering it
already keeps: `seq`, the per-table monotonic integer the Spine assigns to every event on
append (already in the persisted `Event`, already in the contract envelope, already sent
on every broadcast frame — no contract change). A subscriber that has applied event `seq`
N sends that back on its *next* connect attempt (the same request that already opens the
stream, not a separate call — the standard SSE `Last-Event-ID` mechanism). The Spine
replays every stored event after N, in order, over that same connection, then continues
into the ordinary live broadcast. A subscriber that has never connected before sends
nothing and gets the ordinary live-only stream, unchanged.

Both the Shuffler's and the Tabletop's subscribers already dedup incoming events by event
id before acting on them (`cardReturnedDispatch.ts`/`spineEventDispatch.ts`) — replayed
events run through that same path unchanged, so there's no new "have I already applied
this" logic to write. A replayed event that arrived out of order relative to something the
subscriber picked up some other way is not a case that exists today: each subscriber has
exactly one source for this table's events (the SSE stream), so replay-then-live is a
strict order.

## User Stories

1. As a player, I want a card I return to the library to show up in the Shuffler even if
   the Shuffler's connection to the Spine dropped right when I returned it, so that I never
   lose track of where a card actually is.
2. As a player, I want the Tabletop to reflect every card played even across a brief
   Tabletop-server hiccup, so that the shared board stays trustworthy.
3. As the developer, I want a subscriber's reconnect to be indistinguishable from "nothing
   ever dropped" from the application's point of view, so neither ship needs bespoke
   missed-event recovery logic beyond what dedup already provides.
4. As the developer, I want to see in Honeycomb whether a reconnect replayed anything, and
   how much, so a real gap (more replayed events than expected, or a replay that itself
   fails) is visible rather than assumed-fine.
5. As the developer, I want a subscriber's very first connection (never having applied any
   event yet) to behave exactly as it does today — full live stream, no replay — since
   there is nothing yet to catch up on.
6. As the developer, I want the Spine's replay to cost nothing when a subscriber reconnects
   with nothing missed (immediate drop, nothing published in the gap), so the common case
   stays as cheap as it is today.
7. As the developer, I want the existing dedup-by-event-id behavior in both subscribers to
   be the only thing standing between "replay" and "double-application" — no second dedup
   mechanism introduced.
8. As the developer, I want the Spine's replay to be scoped per table, matching the
   existing per-table stream and per-table `seq` numbering, so replay for one table can
   never leak events from another.
9. As the developer, I want a subscriber that reconnects after being gone long enough that
   its last-known `seq` no longer identifies a meaningful position (e.g. the table's log
   was somehow pruned, which doesn't happen today but shouldn't be assumed impossible
   forever) to fail loudly rather than silently resume from the wrong place — though this
   is out of scope to actually build against, since nothing prunes the log today.
10. As the developer, I want both ships' subscribers to change in lockstep (same header,
    same tracked-position semantics), since they're the same hand-rolled client shape by
    design, and a divergence here would undo that.

## Implementation Decisions

- **Ordering key**: `seq`, the existing per-table monotonic integer on `Event`
  (`(table_id, seq)` already unique-indexed), already present on every persisted event and
  every broadcast envelope. No new field, no contract version bump.
- **Wire mechanism**: standard SSE `Last-Event-ID`. The subscriber sends it as a request
  header on the stream-opening request — the same request the connect loop already makes,
  every time it connects, not a distinct endpoint or call. Absent on a subscriber's first-
  ever connection.
- **Spine, model level (`SseStream`)**: accepts an optional last-seen `seq`. When present,
  before entering its live `heartbeat`/`queue.pop` loop, it first reads and yields every
  stored event for the table with `seq` greater than that value, in `seq` order, formatted
  as the same `data: <json>\n\n` frames it already emits — then proceeds exactly as it does
  today (immediate heartbeat behavior only applies to the live phase; replayed frames are
  written as fast as they can be read). When absent, behavior is unchanged.
- **Spine, route level**: the stream route reads the `Last-Event-ID` request header (if
  present) and passes it through to `SseStream`. Malformed/non-numeric values are treated
  as absent (full live stream, no replay) rather than an error — a subscriber sending
  garbage shouldn't be refused service.
- **Spine, replay query**: existing `Event`/`Table` associations already support "events
  for this table after this seq" (`events_dataset` ordered by `seq`) — no new query shape,
  just a `where(seq: (last_seen_seq+1)..)` (or equivalent) added to what `next_seq` already
  demonstrates is available.
- **Subscriber (both ships, same shape)**: `subscribeToSpine` tracks the highest `seq` it
  has handed to `onEvent` (not merely received — the value must reflect what's actually
  been applied, so a crash mid-apply doesn't advance past an event that never landed).
  Every connect attempt in the loop — including the very first — sends `Last-Event-ID`
  with that tracked value when one exists. `onEvent`'s caller is responsible for reading
  `seq` off the envelope; `subscribeToSpine` itself only needs to remember whatever value
  the caller confirms was applied, so this may be threaded through as the return value or
  callback contract of `onEvent` rather than `subscribeToSpine` parsing envelopes itself —
  implementer's call, matching whichever is the smaller diff against the existing
  dedup-then-apply flow in `cardReturnedDispatch.ts`/`spineEventDispatch.ts`.
- **Observability**: the receiving span each ship already writes for every incoming event
  (`"sse subscription: <event.name>"`) gets a way to see whether a given event arrived via
  replay or live — either a span attribute on that span, or a distinct log/span marking the
  reconnect itself with a count of events replayed. Follow each ship's existing "span
  attribute first, log only when there's no span to hang it on" rule
  (`apps/shuffler/CLAUDE.md`, `apps/tabletop/CLAUDE.md` Observability sections). A reconnect
  that replays zero events is not itself noteworthy; a reconnect that replays a nonzero
  count is exactly the signal this whole feature exists to make visible.
- **Scope of "subscriber"**: this applies to each ship's Spine SSE subscription
  (`spineSubscriber.ts` on both ships) — not the Shuffler's separate browser-facing
  `GET /game-events/:gameId` `EventSource` route, which has no Spine connection of its own
  and is refreshed by `broadcastGameStateUpdated` after the Shuffler's own subscriber
  already applied an event; that route is unaffected.

## Testing Decisions

- Good tests here exercise external behavior — "an event published while disconnected
  arrives once reconnected, and is applied exactly once" — not the internals of how `seq`
  is threaded through.
- **Spine, model level**: extend `services/spine/test/models/sse_stream_test.rb`'s existing
  Minitest style (`Spine::SseStream.new(...)`, `Spine.broadcaster.publish`, no HTTP) with
  cases for: events published before the stream ever opens with a last-seen `seq` arrive as
  replay frames in order; a last-seen `seq` equal to the table's latest yields no replay
  frames, straight into heartbeat/live behavior; no last-seen `seq` behaves exactly as
  today's tests already prove.
- **Spine, route level**: `services/spine/test/integration/sse_stream_test.rb` is the
  existing seam for a real HTTP request against the stream route — add a case sending
  `Last-Event-ID` and asserting the replayed events arrive before whatever's published
  live afterward.
- **Shuffler subscriber**: `apps/shuffler/test/port-spine/spineSubscriber.test.ts`'s
  existing `fakeSpineServer.ts` already has `dropConnections()` and tracks
  `connectionCount`/`connectionsAcceptedCount` — extend it to record the `Last-Event-ID`
  header on each accepted connection and to support queuing "already-published" events for
  replay, so the existing
  `"reconnects after a dropped connection and keeps applying events, with no catch-up of
  what was missed"` test can be rewritten to assert the opposite of its own name: publish
  an event while disconnected, reconnect, assert it *is* applied. Rename that test
  accordingly — its current name will be false once this ships.
- **Tabletop subscriber**: mirror the same change in whatever fake stands in for the Spine
  in `apps/tabletop/test/spineSubscriber.test.ts`, matching the Shuffler's fake as closely
  as the two test setups allow (they're already parallel by design).
- **Fleet-level**: `apps/shuffler/test/verification/verify-tabletop-integration.spec.ts`
  (real Spine + real Tabletop) is prior art for a cross-ship spec if one is warranted here,
  but a real reconnect-under-load scenario is expensive to drive reliably through three
  live processes — prefer the model/unit-level seams above unless a reviewer specifically
  wants end-to-end proof.

## Out of Scope

- Log pruning/retention on the Spine's event table, and any behavior for a `Last-Event-ID`
  that no longer identifies a real position in the log (story 9) — nothing prunes today, so
  there's nothing to defend against yet. Land the loud-failure behavior only if pruning is
  ever built.
- The Shuffler's browser-facing `GET /game-events/:gameId` `EventSource` (see Implementation
  Decisions) — out of scope, unaffected.
- Any change to the heartbeat mechanism, the reconnect backoff schedule, or the
  `headersTimeout`/`bodyTimeout` values on either subscriber's dispatcher — all already
  working as intended and untouched by this feature.
- A UI-visible indicator to the player that a catch-up happened — this spec makes the gap
  visible in Honeycomb only, not in the app.
- Replay across a Spine restart that lost in-memory state — `TableBroadcaster` is
  in-memory pub/sub, but `Event` rows are persisted (SQLite), so replay only ever needs the
  DB, never the broadcaster's live subscriber list. Worth stating explicitly since it's easy
  to assume replay depends on the broadcaster and it doesn't.

## Further Notes

- This closes the gap the Tabletop's subscriber comment already named directly: "since the
  Spine's stream has no catch-up/replay, a card played during the resulting reconnect gap
  was lost for good." Both ships' `spineSubscriber.ts` docstrings and `RECONNECT_DELAY_MS`
  comments ("no catch-up/replay, just resume listening") need updating once this lands —
  they'll be describing behavior that no longer exists.
- The recent Tabletop `useReconnectSpans` work (commits `6765316a`/`81ed5c43`) instruments
  *detecting* a reconnect; this spec is what makes a detected reconnect actually safe. The
  two are complementary, not overlapping — no rework of that instrumentation is expected,
  just a new attribute/value it can carry (replayed-event count).
- Dependency order for tickets: the Spine-side change (model + route) has no dependents and
  can land and deploy alone (an old subscriber simply never sends `Last-Event-ID`, so
  it's backward compatible). Each ship's subscriber change depends on the Spine change
  being deployed, but the two ships' subscriber changes don't depend on each other.
