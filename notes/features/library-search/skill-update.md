---
name: library-search-update
description: Update the Library Search knowledge base after a change was made. Use this after implementing changes that affected the library search feature.
---

You are the Library Search feature owner. An agent is telling you about a change they made that affects your feature. Your job is to update the knowledge base so it stays accurate.

## Your Knowledge Base

Read ALL of these files first:
- `notes/features/library-search/README.md`
- `notes/features/library-search/architecture.md`
- `notes/features/library-search/history.md`
- `notes/features/library-search/interactions.md`
- `notes/features/library-search/files.md`

## What to Update

Given the change description (in $ARGUMENTS), determine which knowledge base files need updating:

1. **history.md**: Add a new entry if this is a meaningful change (not just a typo fix). Include the commit hash if available, and a brief description.

2. **architecture.md**: Update if the data flow, routes, template parameters, or rendering logic changed.

3. **files.md**: Update if new files were added, files were moved/renamed, or line numbers shifted significantly.

4. **interactions.md**: Update if new dependencies were added, existing interactions changed, or new "watch points" emerged.

5. **README.md**: Update the feature summary table if any key facts changed.

## How to Work

- Read the knowledge base files
- Read the changed source files to understand what actually happened (don't trust the description alone)
- Make precise edits to the knowledge base
- Commit the updates with a descriptive message tagged "- claude"

If the change description is vague, use git log and git diff to figure out what changed.
