# 04 — Shuffler: port-adapter-gateway boundary for the Spine SSE subscriber, with lifecycle conditions reified for faking

Mountain: spine-gathers-data
Ship: shuffler
Status: ready-for-agent

**What to build:** `spineSubscriber.ts` currently does transport (raw `fetch`/SSE framing),
reconnect orchestration (backoff, `Last-Event-ID` tracking), and replay-visibility logging
all inside one function, tested only by pointing `baseUrl` at a real fake HTTP server
(`test/port-spine/fakeSpineServer.ts`). That makes the conditions we actually care about —
a connection dropping mid-stream, a fresh subscription resuming an existing game — hard to
set up and assert on directly. Restructure this into the fleet's existing
port/adapter/gateway shape (see `SpinePort`/`HttpSpineGateway`/`FakeSpineGateway` in
`src/port-spine/types.ts` for the pattern this ship already uses for the outbound leg), so
each lifecycle condition below has a place to be triggered and observed in a test without a
real server.

**Design direction from discussion:**

- The port should model **one connection attempt**, not the whole reconnecting
  subscription — something like "open a stream for this table, optionally resuming after
  `seq` N, and yield frames until it ends (cleanly or by dropping)". A real adapter
  (`HttpSpineConnection` or similar) implements this over `fetch`/undici, same as today's
  `connectOnce`. A fake adapter (`FakeSpineConnection`) is scriptable directly in tests:
  emit a frame, end the stream, or simulate a drop — no real socket involved.
- **Reconnect/backoff/seq-tracking logic stays out of the adapter**, as plain orchestration
  code sitting above the port. That's what makes it unit-testable on its own terms: drive it
  against `FakeSpineConnection` and assert *it* reconnects with the right `Last-Event-ID`,
  rather than testing "does the whole gateway recover" against a fake that would have to
  reimplement the same backoff/tracking logic to be a faithful double.
- Naming and shape are not fixed by this ticket — the point is a clearer, more expressive
  boundary than the current one, not a specific interface. Whatever lands should be portable
  to the Tabletop's parallel `spineSubscriber.ts` afterward (this ship first, then port the
  pattern there — not the other way around, since the Shuffler's version is where this
  design work is happening).

**Conditions to reify for faking** (each needs to be independently triggerable in a test,
not just implied by fake-server plumbing):

1. **Start → connect → receive events → disconnect.** Today "disconnect" is
   `subscription.close()`, driven by `gameSubscriptionRegistry.ts` when the last open
   browser tab for a game closes — not a game-lifecycle event (there is no "end game" flow
   yet; this is closer to "end session"). The port/adapter split shouldn't need to know or
   care why close was called — just that a clean close is a distinct, assertable outcome
   from a drop.
2. **Connect → mid-stream drop → reconnect with `Last-Event-ID` → replay → resume live.**
   The path tickets 01-03 already built. This ticket doesn't change that behavior — it
   moves the *test* of it from "run a real fake HTTP server and pull the connection" to
   "tell `FakeSpineConnection` to drop, assert the next `connect()` call carries the
   right `Last-Event-ID`."
3. **Resume an existing game → connect (with replay).** Investigate during this ticket
   whether this path is actually wired today: `ensureGameSpineSubscription`
   (`gameSubscriptionRegistry.ts`) calls `subscribeToSpine` fresh whenever a torn-down
   registry entry is re-created (server restart, or every browser tab having closed and a
   new one opening) — and a fresh call starts with `lastAppliedSeq: undefined`, in-memory,
   scoped to that one subscription's lifetime. If confirmed, this means a game resumed
   after its subscription was fully torn down currently sends **no** `Last-Event-ID` on
   that first connect, silently missing anything published in the gap — not a duplicate
   (dedup would catch that), a genuine loss. Reifying this ticket's boundary should make
   that gap visible as a failing test; **fixing it is out of scope here** (needs a durable
   seed value — see Further Notes) but write the failing test and file a follow-up ticket
   for the fix rather than leaving it undiscovered again.

**Status:** ready-for-agent

- [ ] A port interface exists representing one Spine SSE connection attempt (open, yield
      frames, end/drop), separate from reconnect orchestration.
- [ ] A real adapter implements it over the existing `fetch`/undici transport, preserving
      current behavior exactly (heartbeat-aware dispatcher, timeouts, frame parsing).
- [ ] A fake adapter implements it as a scriptable in-memory double — no real HTTP/socket —
      supporting: emit a frame, end the stream, simulate a drop.
- [ ] Reconnect/backoff/`Last-Event-ID`-tracking logic is plain code, testable directly
      against the fake adapter's condition (1) and (2) above, without a real fake HTTP
      server.
- [ ] A new or rewritten unit test drives condition (2) — drop mid-stream, reconnect,
      assert `Last-Event-ID` sent — through the fake adapter rather than
      `fakeSpineServer.ts`'s connection-dropping helper.
- [ ] Condition (3) above is investigated and the finding (wired vs. gap) is written up as
      a test — a failing one if the gap is confirmed, with a follow-up ticket filed for the
      fix, not silently patched as a side effect of this refactor.
- [ ] `apps/shuffler/test/port-spine/spineSubscriber.test.ts` and its existing
      `fakeSpineServer.ts`-based tests still pass, or are deliberately superseded by
      equivalent tests against the new fake adapter (not just duplicated).
- [ ] `HttpSpineGateway`/`FakeSpineGateway`/`SpinePort` (`types.ts`) are left untouched —
      this ticket only touches the inbound subscriber side.

## Further Notes

- The in-memory `lastAppliedSeq` gap (condition 3) points at a real design question for a
  later ticket: where does a resumed subscription's starting `seq` come from, if not the
  torn-down closure? Jess noted the Shuffler already keeps its own persistent event log, and
  any Spine event that does something in the Shuffler should be recorded there carrying the
  Spine event's own key — that log, not an in-memory variable, is the natural durable source
  for "what's the last Spine event this game has applied." Don't build that here; just make
  sure this ticket's refactor doesn't make it harder to wire in later (e.g. don't hardcode
  "seed comes from nothing" in a way that would need re-plumbing).
- This ticket is scoped to the Shuffler only. Porting the resulting pattern to the
  Tabletop's `spineSubscriber.ts` is a follow-up ticket, once this shape has proven itself
  here.
