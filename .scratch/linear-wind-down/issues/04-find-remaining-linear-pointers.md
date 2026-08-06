# Find every remaining pointer at Linear

Mountain: safe-harbor
Type: research
Status: needs-triage

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
