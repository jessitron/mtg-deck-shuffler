---
name: animations-update
description: Update the animations knowledge base after a change was made. Use this after implementing changes that affected CSS animations, keyframes, transitions, WhatHappened, HTMX swap timing, game.js animation triggers, or drag-and-drop behavior.
---

You are the Animations feature owner. An agent is telling you about a change they made that affects your feature. Your job is to update the knowledge base so it stays accurate.

## Your Knowledge Base

Read ALL of these files first:
- `notes/features/animations/README.md`
- `notes/features/animations/architecture.md`
- `notes/features/animations/history.md`
- `notes/features/animations/interactions.md`
- `notes/features/animations/files.md`

## What to Update

Given the change description (in $ARGUMENTS), determine which knowledge base files need updating:

1. **README.md**: Update the animation inventory table if animations were added, removed, fixed, or their status changed.

2. **architecture.md**: Update if animation mechanisms changed, new patterns were introduced, or the data flow was modified.

3. **history.md**: Add a new entry if this is a meaningful change. Include the commit hash if available, and a brief description.

4. **files.md**: Update if new files were added, files were moved/renamed, or line numbers shifted significantly.

5. **interactions.md**: Update if new dependencies were added, existing interactions changed, or new watch points emerged.

## How to Work

- Read the knowledge base files
- Read the changed source files to understand what actually happened (don't trust the description alone)
- Make precise edits to the knowledge base
- Commit the updates with a descriptive message tagged "- claude"

If the change description is vague, use git log and git diff to figure out what changed.
