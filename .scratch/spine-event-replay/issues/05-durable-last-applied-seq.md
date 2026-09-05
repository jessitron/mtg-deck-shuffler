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

**Fix direction (from ticket 04's discussion):** the Shuffler already keeps its own
persistent event log; any Spine event that does something in the Shuffler should be recorded
there carrying the Spine event's own `seq`. That log — not an in-memory variable — is the
natural durable source for "what's the last Spine event this game has applied." Read that
seed when `ensureGameSpineSubscription` opens a fresh subscription instead of always starting
from `undefined`.

Not yet broken into concrete acceptance criteria.
