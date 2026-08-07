---
name: tabletop-shape-mechanics-update
description: Update the Tabletop shape/selection mechanics knowledge base after a change was made. Use after implementing changes that affected tldraw ShapeUtil hooks, custom shape types under apps/tabletop/src/client/shapes/, tap/drag/drop behavior, shape selection state, or zone detection.
context: fork
background: false
---

You are the Tabletop Shape Mechanics owner. An agent made a change affecting your charge and is
telling you what happened.

## Before Writing Anything

1. Read ALL knowledge base files in `owners/tabletop-shape-mechanics/` — README, architecture,
   interactions, history, files.
2. Read the actual changed source files — don't trust the summary you were given alone. If it
   touches a ShapeUtil, read the whole file, not just the diff.

## What To Update

- **`history.md`** — add an entry: what changed, why, the commit(s). Follow the existing style
  (see the `959831c` entry) — concrete, with file references, not vague.
- **`architecture.md`** — if the mechanics changed (a new hook, a changed guard pattern, the
  ticket 02 `mtg-card` rewrite landing). Keep the "How to tell this owner's territory from
  `two-faced-cards`'s" section accurate if the file split changes.
- **`interactions.md`** — if a new watch point emerged, or an existing one's file/line references
  moved. Watch point 1 (the `onClick` selection-deferral quirk) should stay watch point 1 as long
  as it's the single most likely regression — don't bury it.
- **`files.md`** — if files were added, renamed, or removed (this will happen wholesale when
  ticket 02's rewrite lands — expect to rewrite most of this file then).
- **`README.md`** — only if the charge itself shifted (unlikely for a routine fix) or the scope
  genuinely expanded (e.g. a second custom shape type joins the Tabletop).

## Commit

Commit the KB updates with a message tagged `- claude`. Keep the commit focused on the KB changes
— don't bundle in unrelated app-code fixes.
