# 03 — Tabletop subscriber: send Last-Event-ID, resume from last-applied seq

Mountain: spine-gathers-data
Ship: tabletop
Status: ready-for-agent

**What to build:** The Tabletop reflects every card played even across a brief
Tabletop-server hiccup. `spineSubscriber.ts`'s connect loop tracks the highest `seq` it has
actually applied (not merely received) and sends it as the `Last-Event-ID` header on every
connect attempt, including the first, where the header is simply absent. Replayed events
flow through the existing dedup-by-event-id path in `spineEventDispatch.ts` unchanged, so
nothing double-applies. Same header, same tracked-position semantics as the Shuffler's
subscriber (ticket 02) — the two are the same hand-rolled client shape by design and must
not diverge, but neither ticket depends on the other. Requires ticket 01 deployed to the
Spine for a real reconnect to actually catch up; safe to write and test against a fake
before that.

**Blocked by:** 01 — Spine: replay-on-connect for the per-table SSE stream

**Status:** ready-for-agent

- [ ] The connect loop in `spineSubscriber.ts` tracks the highest `seq` confirmed applied
      via `onEvent`'s caller, and sends it as `Last-Event-ID` on every connect attempt.
- [ ] The very first connection (nothing applied yet) sends no `Last-Event-ID` and behaves
      exactly as today.
- [ ] An event published while the Tabletop was disconnected arrives once reconnected and
      is applied exactly once.
- [ ] The receiving span (`"sse subscription: <event.name>"`) carries a way to see whether
      an event arrived via replay or live (span attribute, or a distinct reconnect
      log/span with a replayed-count) — complements the existing `useReconnectSpans`
      instrumentation (commits `6765316a`/`81ed5c43`) rather than duplicating it. A
      reconnect that replays zero events is not itself noteworthy.
- [ ] The fake Spine standing in for `apps/tabletop/test/spineSubscriber.test.ts` records
      the `Last-Event-ID` header on each accepted connection and supports queuing
      already-published events for replay, mirroring the Shuffler's fake as closely as the
      two test setups allow.
- [ ] A test asserts: publish an event while disconnected, reconnect, the event *is*
      applied exactly once.
- [ ] The stale "no catch-up/replay, just resume listening" docstring/comments in
      `spineSubscriber.ts` are updated to describe the new behavior.
