# 10 — Some way to replay events from the Spine

Mountain: spine-gathers-data
Ship: fleet
Status: needs-triage

**What to build:** The Shuffler already knows how to replay a table's event history back
out of the Spine's log — that capability was never ported to the Tabletop. Ticket 03 (the
diagnostic button) needs to get a table's full event history into `projectEvents`, and
right now there is no way to do that: the Spine's only existing read path for a table's
events is the HTML admin page, and the Tabletop server doesn't accumulate events anywhere
of its own. Port the Shuffler's replay capability over so the Tabletop (and anything else
that needs it) can ask "what has happened on this table?" and get back the event log.

Deliberately not detailed here — an agent should look at how the Shuffler does it today
and figure out the right shape for the Tabletop/Spine side, rather than follow a
prescribed design.

**Blocked by:** None.

**Blocks:** 03 (the diagnostic button needs this to fetch real event history instead of a
stub).

- [ ] Find and understand the Shuffler's existing event-replay capability.
- [ ] Port an equivalent capability to the Tabletop side (client, server, and/or Spine, as
      the investigation determines).
- [ ] `projectEvents` (ticket 02) can be handed a real table's event history, not just
      hand-built test data.
