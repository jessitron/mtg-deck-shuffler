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
- **Lossy is fine, and the keep/kill calls are delegated.** Jess, 2026-08-06, part-way through the
  clusters: *"dude I don't care, what will help you get it done? My objective is to get this repo
  into a state where I can move forward without using linear"* and *"it's ok if this process is a
  little lossy."* This supersedes the HITL rule below for clusters 06–12 — the agent decides, bias
  toward killing, and losing a marginal item costs less than another round-trip. What's actually
  worth doing will resurface the next time Jess hits it.
- ~~**Keep/kill is HITL, cluster by cluster.**~~ Jess calls it herself, walking themed clusters rather
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
- [Choose the inbox line format for a migrated issue](issues/02-inbox-line-format.md) — a migrated
  line is an **ordinary inbox line**, indistinguishable from a fresh capture, with a dead
  `← was: JES-NNN` label that dies when the line is promoted or deleted. **The line stands alone** —
  no pointer back to the archive, since the cluster tickets' verified detail beats the months-old
  Linear bodies. `← mountain:` only for the active Mountain; no priority, no Linear URL. Active-
  Mountain survivors to `## Next`, the rest to `## Backlog`. Survivors overlapping the four existing
  inbox items merge into those lines rather than sitting beside them.
- [Keep/kill: tabletop-custom-card-shape](issues/06-cluster-tabletop-custom-card-shape.md) — **written
  into `TODO.md` § Next, three lines.** JES-149 is a new line, `tabletop-card-shape`, the spike
  everything else waits on. JES-144 split in half — rotate into `animate-tap`, menu curation and
  MDFC flip into `no-doubleclick-crop`. JES-143 killed as superseded, its real-user provenance moved
  onto `animate-tap`. JES-132 deferred to [ticket 12](issues/12-cluster-shuffler-look-and-feel.md)
  so both halves of the sleeves idea are called at once. Jess delegated the keep/kill judgment to
  the agent here: *"I don't care, what will help you get it done?"*
- [Keep/kill: tabletop-table-furniture](issues/07-cluster-tabletop-table-furniture.md) — **six issues'
  live content survives as three `## Next` lines instead of six.** JES-150/147/146 and JES-148's
  library half collapse into `player-area-polish` — four prop nudges in the same two files, one
  sitting's work, with rounded corners flagged as the one item tldraw's `geo` can't do. JES-148's
  exile half killed as pre-empted: `playmat-command-zone` moves exile out from beside the library
  anyway. JES-141 merged into `playmat-command-zone`, carrying its real content — growing one mat
  re-derives that seat's whole column and shifts every seat to its right. JES-145 stands alone as
  `library-links-to-shuffler`. Cluster 6's block was advice about not over-investing in cosmetics,
  not a prerequisite.
- [Keep/kill: table-durability-and-the-event-log](issues/08-cluster-table-durability-and-event-log.md)
  — **four issues become one `## Next` line**, `tabletop-survives-restart`. JES-151/154/131 are one
  job seen three ways; two lines would both have said "build Tabletop→Spine `card.moved`". Every
  claim re-verified — `rooms.ts` still in-memory, three payloads in `contracts/`, no Spine client in
  the Tabletop — plus one thing the archive didn't know: the Spine's `POST /tables/:table_id/events`
  already exists, so only the sending half is missing. JES-92 (spectator mode) killed as a category
  error: `SEAMAP.md` and `notes/DESIGN-the-table-vision.md` already say it better, as a constraint
  on every Mountain rather than a checkbox that can never be checked.
- [Keep/kill: card-actions-and-undo](issues/10-cluster-card-actions-and-undo.md) — **six issues become
  four `## Backlog` lines.** JES-82 killed as shipped (cmd-Z verified in `game.js`, guarded against
  inputs and modals). JES-83 and JES-99 merged into `finish-undo`, which carries a task and a decision
  together — neither stands alone, and a reflex key with no redo is where people get hurt. JES-85
  rescoped: discard already landed, so the survivor is exile plus provenance in the Cards-on-Table
  modal. JES-84 survives **stronger than filed** — the `animations` owner's history shows the exit
  animation was removed as broken in `943ece6` and the client-driven pattern abandoned, making its
  server-computes-destination sketch the untried replacement rather than a loose idea. JES-81 kept.
- [Keep/kill: knowing-the-fleet-works](issues/09-cluster-knowing-the-fleet-works.md) — **six survive,
  two die; six new `## Backlog` lines, no merges.** JES-133 killed as an umbrella whose every child is
  done or has its own line — its two unique ideas are already permanent in the `fleet-is-observable`
  README and `notes/AGENT-NOTES.md`. JES-98 killed as done: `tracing_util.ts` *is* the library it
  asked for, and "crucial fields" is now Invariant 1, stated more strongly than the issue asked.
  Survivors all re-verified against today's code: `shuffler-logs-not-console` (53 sites),
  `spine-logs-in-traces` (kept mainly for its undecided gem-vs-lograge fork), `build-sha-on-every-span`
  (zero hits fleet-wide), `spine-probe-sampling` (no sampler at all in the initializer), `set-up-ci`
  (no `.github/`, three real suites), and `logs-docs-catch-up` — JES-138 shrunk from a five-part
  closeout to the two parts still false today.
- [Keep/kill: game-screen-layout-and-finding-cards](issues/11-cluster-game-screen-layout.md) — **four
  `## Backlog` lines.** JES-78 kept as `game-page-to-ejs`, the rendering substrate the rest of the
  game-screen work edits. JES-89 + JES-87 merged into `game-screen-table-layout` — thin alone, one ask
  together. JES-88 killed: superseded by `deck-title-placement`, and its premise has drifted. JES-142
  killed as too vague, its real-user provenance moved onto the library line. JES-152 kept but
  **reframed**, because this cluster found **JES-153 never landed on `main`** — it's on branch
  `library-alphabet` in `../mtg-deck-shuffler-worktree1`, 19 commits behind, carrying `owners/library-search/`
  edits that describe work `main` doesn't have. Landing or dropping that branch is now the line's first
  sub-bullet. JES-96 kept and upgraded by reading the adapter: `displayName` and `card.uid` are both the
  localized printing, so name and image go foreign together.
- [Keep/kill: shuffler-look-and-feel](issues/12-cluster-shuffler-look-and-feel.md) — **nothing killed;
  six issues become four `## Backlog` lines.** JES-79 + JES-86 + JES-132 collapse into
  `personal-play-space`: `seat.joined` already carries `playmatImageUrl` *and* `cardBackImageUrl` end to
  end, hardcoded, each with a comment naming the missing picker — never three features, just one
  prep-screen picker nobody wrote. JES-155 survives as a *decision* line pointing at the live
  `open-choices.md` rather than copying it, with JES-80's sad flip button riding along as one more piece
  of the same drift. **Choice 5 split onto its own line, `keyboard-focus-visible`** — burying an
  accessibility regression inside "design choices" would have killed it just as surely, and deleting
  `outline: none` needs no decision from Jess. JES-97 stands alone: a privacy change wearing a
  cosmetic hat.
- [Cut the Linear pointers](issues/05-cut-the-linear-pointers.md) — **every `linear.app` URL is gone
  from the repo.** Thirteen files re-pointed or inlined, including two live citations in
  `owners/two-faced-cards/tabletop.md` that ticket 04's search missed. The observability tension was
  real: re-pointing the "browser has no logger" sentences would have restated a falsehood in a new
  place, so each now names only the Spine as the real gap and marks the browser clause stale against
  `logs-docs-catch-up`. Every surviving `JES-` is a `← was:` label or provenance for finished work.

## Not yet specified

**Nothing. The way to the destination is clear and the voyage is complete** (2026-08-06). The two
remaining patches were resolved in the closing session rather than ticketed:

- **The archive is deleted**, along with `scripts/snapshot-linear.sh` — a re-runnable snapshot
  script is an instruction to go back to Linear, which the destination forbids. Both are in
  `944a111`; `git show 944a111:notes/linear-archive.md` recovers the content if it's ever wanted.
- **This effort's own working files stay, `JES-` ids and all.** The destination says nothing may
  *point a future session at* Linear. A resolved ticket in a finished effort's records points
  nowhere — it's the reasoning behind eleven kills, and it's the only place that reasoning exists,
  since `TODO.md` by design carries no tombstones. Keeping it costs a directory nobody has to read.

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
