# Keep/kill: table-durability-and-the-event-log

Mountain: tabletop-replaces-mural
Type: grilling
Status: needs-triage
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
