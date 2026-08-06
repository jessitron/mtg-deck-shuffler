# Keep/kill: table-durability-and-the-event-log

Mountain: tabletop-replaces-mural
Type: grilling
Status: resolved
Blocked by: 06

## Question

Which of these 4 survive into `TODO.md`?

*Theme: the table must survive a restart, and what happens on it must reach the Spine's log —
which is also what spectators consume.*

- **JES-151** — table state doesn't survive a restart (needs real persistence). The live version
  of this problem. Carries the 2026-08-01 decision (event-sourced, blocked on JES-149/144
  producing semantic events) and the confirmed current state: `rooms.ts`, in-memory
  `TLSocketRoom`, no snapshot anywhere.
- **JES-131** — reconstruct a table after restart. ⚠️ **Duplicate of JES-151**, older and thinner.
  One thing it has that JES-151 doesn't: *freeform doodles* aren't in the event log and need a
  tldraw snapshot store regardless. Carry that sentence over if you kill it.
- **JES-154** — wire card zone-entry events to the Spine. The follow-up JES-149 deliberately
  scoped itself out of. Needs a **new contract payload** (`card.moved`) and a **new direction of
  data flow** (Tabletop→Spine, which doesn't exist yet). Blocked on JES-149.
- **JES-92** — spectator mode. Re-charted 2026-07-27 as "a consumer of the public projection of
  the table's event log." ⚠️ But `SEAMAP.md` now calls spectator mode *a constraint on every
  mountain, not a mountain* — so this may not be a ticket at all. It might already be expressed
  correctly as a standing constraint, in which case keeping it as work is a category error.

Blocked on cluster 6: both JES-151 and JES-154 wait on JES-149 producing semantic events.

## Answer

**Four issues become one line.** Three of them are one piece of work seen from three angles; the
fourth isn't work at all. Keep/kill called by the agent under Jess's delegation (2026-08-06:
*"dude I don't care, what will help you get it done?"*).

### JES-151 + JES-154 + JES-131 — **one line**, `tabletop-survives-restart`

The theme sentence gave it away: *the table must survive a restart, and what happens on it must
reach the Spine's log.* Those are not two jobs. JES-151's own 2026-08-01 decision says persistence
**is** logging semantic events to the Spine's log and replaying them on room startup — which is
exactly JES-154's scope (a `card.moved` payload, a Tabletop→Spine sender, an event-log entry) plus
the replay half. Two lines would each have said "build Tabletop→Spine card.moved", which is the
near-duplicate [ticket 02](02-inbox-line-format.md) warned about. One rich line, three `← was:`
labels.

JES-131 is the older, thinner version of JES-151 and dies into the same line, carrying the one
thing it had that JES-151 didn't: **freeform doodles aren't game events and never will be in the
log — they need a tldraw snapshot store regardless.** That sentence is a real design constraint on
how the line gets built, so it's a sub-bullet, not a tombstone.

**Verified against today's codebase (2026-08-06)** — every claim on the line holds:

- `apps/tabletop/src/server/rooms.ts` (85 lines) holds each table as an in-memory `TLSocketRoom`.
  No snapshot, no load-on-boot anywhere in the server. Its own header comment says so.
- `contracts/payloads/` contains exactly `card.played.v1.json`, `seat.taken.v1.json`,
  `table.created.v1.json`. No zone-move payload.
- The Tabletop has **no** Spine client — nothing under `apps/tabletop/src` posts to the Spine; the
  only mentions are SCAFFOLDING comments in `cardArrival.ts`/`seatJoined.ts` describing the seam
  the Spine will absorb. The Tabletop→Spine direction genuinely does not exist yet.
- The Spine's ingestion endpoint does exist (`POST /tables/:table_id/events`,
  `services/spine/config/routes.rb`), so the receiving half is already there. That's a real
  simplification versus what JES-154's body assumed, and it's on the line.

Depends on `tabletop-card-shape` (cluster 6's keystone), whose inbox line already says the
persistence work waits on it — so the dependency is stated from both ends and needs no edit there.

### JES-92 — **killed as a category error**

Spectator mode is not a ticket; it's already recorded as a **constraint**, in better words than the
issue had, in two places:

- `SEAMAP.md` — *"Spectator mode is a constraint on every mountain, not a mountain: anyone can join
  a table to look — public events, commentary, hand counts but never hands."*
- `notes/DESIGN-the-table-vision.md` — the public-shadow projection, spectator chat, and the
  long-goal tutor-chat, in more depth than JES-92's body.

Everything JES-92 said is in the repo already. An inbox line would be a second, staler copy of a
standing constraint, and "spectator mode" as a checkbox can never be checked. No trace.

### Note for [ticket 05](05-cut-the-linear-pointers.md)

While verifying, a `grep -rn "JES-"` across `apps/`, `services/`, `contracts/`, `scripts/`, `docs/`
and `owners/` turned up **~19 bare `JES-NNN` mentions in Tabletop code, tests and docs** —
`src/server/server.ts:54`, `cardArrival.ts:18,43`, `cardLayout.ts:2,89`, `log.ts:14`,
`CLAUDE.md:20,23,50`, `SEAMAP.md:15`, `README.md:38`, and five test-file headers. Ticket 04 found
six *linked* pointers; these are unlinked ids, so they may have slipped the net. Most are
provenance-in-a-comment for **done** work (JES-140, JES-128, JES-136, JES-127) and want inlining
rather than re-pointing; `verify-card-rotate.spec.ts:4` (JES-144) and `CLAUDE.md:23` (JES-141) name
work that's still live.
