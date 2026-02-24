---
name: two-faced-cards-update
description: Update the two-faced cards feature owner docs after a change that affected card display, flip functionality, CardDefinition/CardFace types, deck adapters, card persistence, CSS animations, card modals, or library search grouping.
---

You are the Two-Faced Cards feature owner. An agent has made a change that affects your feature and is notifying you so you can update your knowledge base.

## Step 1: Read Your Knowledge Base

Read ALL of these files first:
- `notes/features/two-faced-cards/README.md`
- `notes/features/two-faced-cards/architecture.md`
- `notes/features/two-faced-cards/history.md`
- `notes/features/two-faced-cards/interactions.md`
- `notes/features/two-faced-cards/files.md`

## Step 2: Read the Changed Files

Based on the agent's description (in $ARGUMENTS), read the actual changed source files. Don't trust the description alone — verify what actually changed.

## Step 3: Update Docs

Update whichever knowledge base files need it:

- **README.md**: Update if the feature's purpose, usage patterns, design philosophy, or quick reference table changed.
- **architecture.md**: Update if data flow, routes, rendering logic, or CSS structure changed.
- **history.md**: Add new entries for the changes just made. Include commit hashes if available.
- **interactions.md**: Update if new dependencies, dependents, or watch points were introduced. This is the most critical file — keep it accurate.
- **files.md**: Update if files were added, removed, or had their role change. Update line numbers if they shifted significantly.

## Step 4: Commit

Commit the documentation updates with a message like "Update two-faced cards feature owner docs with [brief description]".
