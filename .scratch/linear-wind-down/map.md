# Linear wind-down

Mountain: safe-harbor
Type: wayfinder:map

## Destination

**Jess can work on this project again.** Everything worth doing is a live `TODO.md` line she can
pick up; everything already done or not worth doing is gone without a trace; and nothing in the
repo points a future session at Linear.

What happens *inside* Linear is not part of this — see Out of scope.

## Notes

- **This effort executes.** Wayfinder's plan-don't-do default is overridden: the destination is
  the cleanup itself, so `task` tickets carry out the move and the deletions.
- **Survivors land in `TODO.md`, not `.scratch/`.** Decided while charting (2026-08-06): the live
  issues are a scattered pile, not a feature, and Linear's Backlog *was* an inbox. `.scratch/`
  stays reserved for work actually decided on.
- **Done work leaves no trace.** Decided 2026-08-06: anything already done or ruled dead is simply
  deleted — no tombstone, no "killed because…" line, no `## Done` section. Don't spend a sentence
  recording that something isn't happening. This is why the ticket count keeps shrinking rather
  than growing; that's the effort working, not scope loss.
- **Keep/kill is HITL, cluster by cluster.** Jess calls it herself, walking themed clusters rather
  than 40 individual issues or one blanket rule.
- Source of truth for issue content is `notes/linear-archive.md` (68 issues, snapshotted
  2026-08-06). It is a point-in-time snapshot and stays intact — pruning it would make its own
  opening claim false. The "no trace" rule governs `TODO.md` and this map, not the archive.
- Skills every session should consult: `/grilling`, `/domain-modeling`. Read
  `docs/agents/issue-tracker.md` before writing into the tracker or the inbox.

## Decisions so far

<!-- one line per resolved ticket -->

## Not yet specified

- **One keep/kill session per cluster.** Can't be ticketed until [Cluster the 40 live issues into
  themed groups](issues/01-cluster-the-live-issues.md) names the clusters. Each is a HITL grilling
  ticket: walk the cluster, Jess says keep or gone. Clusters serving the active Mountain
  (Tabletop replaces Mural) go first — those are the ones standing between her and working.
- **Writing the survivors into `TODO.md`.** A task ticket, once the format is settled and at least
  one cluster is decided. Probably one write per cluster, so the inbox becomes usable
  incrementally rather than in one big-bang commit at the end.
- **Deleting what's already done.** Falls out of clustering: any issue the codebase has moved past
  is deleted on sight, no session needed. May not need a ticket at all.

## Out of scope

- **Anything that happens inside Linear.** Ruled out 2026-08-06: Jess doesn't care about the state
  of the Linear service. The project is not archived, issues are not cancelled, the 9 project-less
  Tabletop issues are not dealt with. Linear is simply abandoned in place. This closed
  [Decide the fate of the 9 project-less Tabletop
  issues](issues/03-fate-of-the-project-less-nine.md).
- **Actually building any of the surviving work.** A survivor becomes an inbox line; what happens
  after that is a separate voyage.
- **The 28 Canceled and Done issues.** 16 Canceled + 12 Done need no decision and get no record.
- **Migrating anything into `.scratch/` as a spec or ticket.** Survivors go to the inbox. If one
  deserves a spec, that's a later `/to-spec` run.
