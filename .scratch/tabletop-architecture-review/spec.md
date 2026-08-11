# tabletop-architecture-review

Mountain: overhead
Ship: tabletop
Status: needs-triage

## Overview

Source: `apps/tabletop/notes/ARCHITECTURE-REVIEW-2026-08-10.html`, a deepening-opportunities
survey of `apps/tabletop/` (per `/improve-codebase-architecture`'s pattern — see fleet
`CLAUDE.md` § Codebase health). This isn't one feature with one Problem Statement; it's six
independent candidates from that review, each promoted here to its own ticket so none of them
stay invisible to the tracker. (Before this, none of the six existed anywhere outside the
review HTML — no `SEAMAP.md`, `TODO.md`, or `.scratch/` presence at all.)

None of these serve one of `SEAMAP.md`'s Mountains directly — they're codebase-health work on
code that itself serves Mountain 1 (`tabletop-replaces-mural`), which is why every ticket here
is `Mountain: overhead` rather than a feature Mountain.

## Candidates

| # | Ticket | Review verdict | Status | Notes |
|---|--------|-----------------|--------|-------|
| 1 | [01-split-cardshapeutil-interop-from-physics](issues/01-split-cardshapeutil-interop-from-physics.md) | Strong | `needs-triage` | Grilled 2026-08-10; the review's proposed seam doesn't hold cleanly — see ticket for the corrected framing and the still-open question for Jess |
| 2 | [02-furniture-builder-domain-interface](issues/02-furniture-builder-domain-interface.md) | Worth exploring | `ready-for-agent` | |
| 3 | [03-cardlayout-invariant-in-interface](issues/03-cardlayout-invariant-in-interface.md) | Worth exploring | `ready-for-agent` | |
| 4 | [04-gestures-announce-themselves](issues/04-gestures-announce-themselves.md) | Worth exploring | `needs-triage` | Tension with an already-shipped decision (tabletop-physics ticket 21) — flagged for Jess, not blindly actioned |
| 5 | [05-stale-selection-fix](issues/05-stale-selection-fix.md) | Speculative in the review, but Jess reports it's a live, unfixed bug | `done` | Centralized fix landed: `clearStaleSelectionOnPointerDown.ts`, replacing all five old workaround sites. Supersedes the `tabletop-stale-selection-fix` line in the repo-root `TODO.md` (removed) |
| 6 | [06-rooms-typed-instance-exists](issues/06-rooms-typed-instance-exists.md) | Speculative | `ready-for-agent` | |

## Cross-candidate notes

- The review's own "top recommendation" was candidate 1, on the reasoning that it's the hottest
  file in the ship and that candidates 2, 4, and 6 are "satellites" of the same
  physics-leaks-into-an-adapter pattern. That's a suggested *order*, not a hard dependency — no
  candidate's files actually block another's, so no `Blocked by:` edges are recorded between
  them. Do 1 first if you want the stated ripple effect; nothing breaks if you don't.
- Ticket 1's grilling (this session, 2026-08-10) found the review's "extract a plain, testable
  `CardPhysics` module" framing doesn't survive contact with the code — every hook in
  `MtgCardShapeUtil.tsx` mixes a genuine card rule with an inseparable tldraw-timing dependency
  (selection-clear ordering, undo-coalescing microtasks, drag-target plumbing). See the ticket
  for the corrected options put to Jess, which she hadn't yet answered when the session pivoted
  onto ticket 5.
- Ticket 5 is the most work-ready of the six: Jess reported the bug is live and asked for a
  proper fix, a background research agent investigated tldraw's source and GitHub history, and
  findings are committed at `apps/tabletop/notes/RESEARCH-stale-selection-bug.md`. Its ticket
  embeds that research directly as an acceptance checklist rather than leaving a design question
  open.

## Further Notes

- Every ticket here consults `tabletop-shape-mechanics-review` before implementation, per the
  fleet `CLAUDE.md`'s owner-consultation process — all six touch `ShapeUtil` hooks, custom shape
  types, or zone/selection detection.
- `Status: needs-triage` at the spec level (above) reflects tickets 1 and 4, which need a human
  decision before an agent should run with them; 2, 3, 5, and 6 are ready as written.

## Comments
