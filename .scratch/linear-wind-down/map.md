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
  than 40 individual issues or one blanket rule. Tickets 06–12, one per cluster; each carries its
  issues inline so it stays walkable after the archive is deleted.
- **A dangling `JES-` reference follows the work.** Jess, 2026-08-06: if the issue survives, re-point
  the reference at its new home; only if it's killed or already done do you inline the prose and
  drop the id. This is why [ticket 05](issues/05-cut-the-linear-pointers.md) waits on the clusters.
- Source of truth for issue content is `notes/linear-archive.md` (68 issues, snapshotted
  2026-08-06). It is a point-in-time snapshot and stays intact — pruning it would make its own
  opening claim false. The "no trace" rule governs `TODO.md` and this map, not the archive.
- Skills every session should consult: `/grilling`, `/domain-modeling`. Read
  `docs/agents/issue-tracker.md` before writing into the tracker or the inbox.

## Decisions so far

- [Cluster the 40 live issues into themed groups](issues/01-cluster-the-live-issues.md) — seven
  clusters, no miscellaneous needed. Three serve the active Mountain and are walked first, in
  dependency order (custom card shape → table furniture → durability). **8 already done or
  superseded, 2 too vague** — those get deleted, not walked. Four `TODO.md` items already overlap
  clusters 1/2/6, so survivors merge into those lines rather than sitting beside them.
- [Find every remaining pointer at Linear](issues/04-find-remaining-linear-pointers.md) — six
  misdirects, no dead weight, `CLAUDE.md`/`SEAMAP.md` verified clean and no ship mentions Linear
  at all. The three `mcp__claude_ai_Linear__save_*` permissions are already deleted from
  `.claude/settings.local.json`; the rest is [ticket 05](issues/05-cut-the-linear-pointers.md).

## Not yet specified

- **Writing the survivors into `TODO.md`.** A task ticket, once the format is settled and at least
  one cluster is decided. Probably one write per cluster, so the inbox becomes usable
  incrementally rather than in one big-bang commit at the end.
- **Deleting `notes/linear-archive.md`.** Jess wants it gone (2026-08-06); it's already committed
  in `944a111`, so `git show 944a111:notes/linear-archive.md` recovers it. Sequenced **last** —
  every cluster ticket and ticket 05's inline expansions read from it. Its opening paragraph also
  claims to be a live snapshot, which stops being true either way.

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
