# Linear wind-down

Mountain: safe-harbor
Type: wayfinder:map

## Destination

The Linear project is archived and nothing in this repo writes to Linear anymore, with every
one of the **40 live issues** (39 Backlog + 1 Todo, of the 68 in `notes/linear-archive.md`)
either carried across as a `TODO.md` inbox line or consciously dead. Done means *moved*, not
*planned*.

## Notes

- **This effort executes.** Wayfinder's plan-don't-do default is overridden: the destination is
  the migration itself, so `task` tickets carry out the move, the archive, and the doc edits.
- **Survivors land in `TODO.md`, not `.scratch/`.** Decided while charting (2026-08-06): the 40
  are a scattered pile, not a feature, and Linear's Backlog *was* an inbox. Re-triage happens
  later, per item, when it surfaces. `.scratch/` stays reserved for work actually decided on.
- **Keep/kill is HITL, cluster by cluster.** Decided while charting: Jess calls keep/kill herself,
  walking themed clusters rather than 40 individual issues or one blanket rule. Expect several
  sessions.
- Source of truth for issue content is `notes/linear-archive.md` (68 issues, snapshotted
  2026-08-06). Re-runnable read-only via
  `scripts/snapshot-linear.sh --repo jessitron "MTG Deck Shuffler"` — **always `--repo`**, since 9
  Tabletop issues have no Linear project and a project-scoped run misses them silently.
- Skills every session should consult: `/grilling`, `/domain-modeling`. Read
  `docs/agents/issue-tracker.md` before writing anything into the tracker or the inbox.

## Decisions so far

<!-- one line per resolved ticket -->

## Not yet specified

- **One keep/kill session per cluster.** Can't be ticketed until [Cluster the 40 live issues into
  themed groups](issues/01-cluster-the-live-issues.md) names the clusters. Each will be a HITL
  grilling ticket: walk that cluster's issues, Jess calls keep or kill on each, record the call
  and its reason.
- **Writing the survivors into `TODO.md`.** A task ticket, once the format is settled and at
  least one cluster is decided. Might be one write per cluster or one big write at the end —
  depends how many survive.
- **The endgame in Linear.** Re-run the snapshot, diff against the 2026-08-06 archive to confirm
  nothing moved, then archive the project and dispose of whatever [the 9 project-less Tabletop
  issues](issues/03-fate-of-the-project-less-nine.md) decides. Blocked on every cluster being
  decided — it's the point of no return.
- **Whether `notes/linear-archive.md` needs a closing preamble** once Linear is gone: it stops
  being a snapshot of a live system and becomes the only record. Small, but it changes what the
  file's opening lines should claim.

## Out of scope

- **Actually building any of the surviving work.** A survivor becomes an inbox line; what happens
  after that is a separate voyage.
- **The 28 Canceled and Done issues.** 16 Canceled + 12 Done need no decision — they're finished
  or abandoned, and `notes/linear-archive.md` already holds their content. They ride along when
  the project is archived.
- **Migrating anything into `.scratch/` as a spec or ticket.** Ruled out while charting: survivors
  go to the inbox. If one turns out to deserve a spec, that's a later `/to-spec` run, not this
  effort.
