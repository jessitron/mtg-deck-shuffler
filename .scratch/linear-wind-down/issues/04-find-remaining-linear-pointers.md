# Find every remaining pointer at Linear

Mountain: safe-harbor
Type: research
Status: resolved

## Question

Where does this repo — and the agent configuration around it — still point at Linear, and
which of those pointers must change for "nothing writes to Linear" to be true?

AFK. Sweep for:

- Docs and notes: `CLAUDE.md` (fleet and per-ship), `SEAMAP.md` (fleet and per-ship),
  `TODO.md`, `docs/agents/*`, `notes/*`, ship `README.md`s.
- Config: `.claude/settings.json` and `.claude/settings.local.json` (MCP servers,
  permissions, allowlists), `.mcp.json` if present, `.be` (`LINEAR_API_KEY`).
- Skills and owners: anything under `.claude/skills/` or `owners/` naming Linear or `JES-`.
- Scripts: `scripts/snapshot-linear.sh` and anything calling it.
- Loose `JES-` references in code comments or commit-adjacent docs.

For each hit, classify it: **must change** (it tells a future agent to file work in Linear),
**keep deliberately** (the archive, the snapshot script, the history in `TODO.md` § Done —
these are correct records of a thing that happened), or **dead weight** (delete).

The answer is that classified list with `file:line` for each hit. Distinguish carefully
between a pointer that *directs* future work to Linear and one that merely *records* that
Linear was once the tracker — the second kind mostly stays. Don't edit anything; the edits
are a later task ticket.

## Answer

Swept 2026-08-06. **Scope narrowed by Jess:** anything happening *inside* Linear (archiving the
project, cancelling issues) is out of scope. The only question that matters: would anything here
cause a future agent or a future Jess to **file work in Linear**, or **go looking in Linear for
work that is no longer there**?

The sweep covered `CLAUDE.md` (fleet + all three ships), `SEAMAP.md` (fleet + all three ships),
`TODO.md`, `docs/agents/*`, `notes/*`, all ship `README.md`s, `.claude/settings.json`,
`.claude/settings.local.json`, `.mcp.json`, `.be`, `.claude/skills/` (symlinks into `owners/`),
`owners/**`, `scripts/**`, and every `JES-` occurrence in code and docs.

### MISDIRECTS — 6 hits, all must change

1. `owners/fleet-is-observable/README.md:246` — "put them in the commit message, **the Linear
   issue**, or here" — a standing *instruction* to record permanent Honeycomb citations in a
   Linear issue. The only place in the repo that actively tells an agent to write into Linear.
2. `owners/shuffler-looks-like-itself/open-choices.md:5` — "Tracked as
   **[JES-155](https://linear.app/honeycombio/issue/JES-155)**" on a file whose own status is
   *in progress* (choices 3–6 open). Sends a reader to Linear for live work.
3. `notes/DESIGN-event-contract-v0.md:3` — `Tracking: [JES-128](https://linear.app/...)` in the
   doc's header block. Declares Linear the tracker for this design's work.
4. `apps/tabletop/DESIGN.md:8` — the one un-built piece ("playmat grows taller") is "deferred as
   [JES-141](https://linear.app/...)". A live hyperlink to Linear for outstanding work.
5. `apps/tabletop/DESIGN.md:13` — "Tracked as [JES-140](https://linear.app/...)". Borderline —
   JES-140 is *done*, so it reads as a record — but the "Tracked as" framing plus a live link
   still says Linear is the tracker. Fix it in the same pass as line 8; don't leave it because
   it half-qualifies.
6. `.claude/settings.local.json:77-79` — `mcp__claude_ai_Linear__save_project`,
   `save_milestone`, `save_issue` are on the **permissions allowlist**. This is the one config
   that would let an agent create a Linear issue with no prompt to Jess — a pre-authorization to
   file work in the place work no longer lives. Delete all three lines.

Nothing else in the repo directs work to Linear. In particular, `CLAUDE.md:31-36` and
`SEAMAP.md:97` were **verified correct and complete** (not assumed): both state plainly that
Linear is no longer the tracker, `docs/agents/issue-tracker.md` names only `.scratch/` markdown
with no Linear mention anywhere, and **none of the three ships' `CLAUDE.md` or `SEAMAP.md`
mentions Linear at all** — their only Linear-adjacent content is bare `JES-NNN` provenance tags.
The commits `034d264` / `ddecc39` did the job.

### RECORDS — correct descriptions of a thing that was; these stay

- `notes/linear-archive.md` (whole file) — the archive. RECORDS by definition.
- `scripts/snapshot-linear.sh` (whole file) — the snapshot tool, read-only and re-runnable.
  RECORDS by definition. Note lines 5-6, 219, 252 explicitly frame themselves as *pre-archival*.
- `CLAUDE.md:31-36` — "Linear is no longer the tracker… archived to `notes/linear-archive.md`",
  plus the `--repo` gotcha. Exactly the right kind of record.
- `SEAMAP.md:97` — "Linear is no longer the tracker; see `CLAUDE.md` § Seamap."
- `TODO.md:13-24` — the `linear-wind-down` inbox item itself (points at `.scratch/`, not Linear).
- `TODO.md:31` — "None of these are in Linear — they postdate the 2026-08-01 promotion."
- `TODO.md:71`, `TODO.md:75-80` — § Done entries recording the migration. History, correct.
- `.claude/settings.json:8` — `Bash(scripts/snapshot-linear.sh *)`. Keep as long as the script
  is kept; it authorizes a read-only snapshot, not a write.
- `.be:11` — `LINEAR_API_KEY`. Required by the snapshot script; git-ignored (via
  `dotfiles/gitexcludes`). Keep while the script is kept.
- `notes/PLAN-tabletop-v0.md:1` — title carries `(JES-127)` as provenance for completed work.
- `.scratch/linear-wind-down/issues/01,03` — this effort's own tickets, which are *about* the
  Linear issues. Correct by construction.
- ~90 `JES-NNN` comments in source and tests (`apps/shuffler/src/**`, `apps/tabletop/src/**`,
  `test/**`, `scripts/preflight-aws.sh:10`) — provenance tags on landed code. Each sentence
  stands on its own; nobody needs the issue body. Leave them.

### DEAD WEIGHT

None found. Every hit is either actionable (the six above) or a legitimate record.

### `JES-` references that go dangling — 10 lines in 7 files

These name a `JES-NNN` as the handle for **work that is not done**, or in a sentence whose
meaning depends on the issue body. Once Linear is unreachable they resolve to nothing. Each
needs either an inline expansion or a pointer to `notes/linear-archive.md` (which holds all 68
bodies, so no content is actually lost — only the path to it).

- `CLAUDE.md:112` — "The Spine has no logs pipeline yet (JES-137)." Pending work, Linear-only handle.
- `owners/fleet-is-observable/README.md:80` — "Spine and the browser do **not** yet (JES-137, JES-136)."
- `owners/fleet-is-observable/README.md:111` — Invariant 5 marked _(FUTURE — not true yet; JES-139)_.
  The invariant's whole future hangs off an issue id.
- `owners/fleet-is-observable/README.md:139` — "The Spine (JES-137) and the browser (JES-136) still have none."
- `owners/fleet-is-observable/interactions.md:28` — "once JES-139 lands, it must carry the deployed version…"
- `notes/DESIGN-event-contract-v0.md:28` — "(Scoped into JES-129.)" **Worst of the set**: a bare
  id with no gloss — you cannot tell what was scoped in without reading the issue.
- `apps/tabletop/CLAUDE.md:23` — "taller when lands overflow its bottom half (JES-141)." Pending work.
- `apps/tabletop/DESIGN.md:8` — JES-141, the deferred edge case (also MISDIRECT #4).
- `owners/shuffler-looks-like-itself/open-choices.md:5` — JES-155, live work (also MISDIRECT #2).
- `TODO.md:49-50, 55` — JES-143/144/149 cited as adjacent live work for three inbox items. These
  three are themselves among the 40 live issues this effort is deciding, so they'll resolve
  naturally when those items land in `TODO.md` — re-point them at their new inbox lines rather
  than at the archive.

Not dangling, despite naming an issue: the `JES-155 choice N` citations in
`owners/shuffler-looks-like-itself/README.md:52,57,74,112` and `history.md:92,164,171` — the
choices themselves live in `open-choices.md`, so the body adds nothing.
