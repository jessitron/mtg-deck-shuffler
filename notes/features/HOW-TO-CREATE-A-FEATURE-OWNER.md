# How to Create a Feature Owner

A feature owner is an agent role that maintains deep knowledge about one feature. Other agents consult it before making changes that might interact with the feature, and notify it after changes land.

## Step 1: Research the Feature

Dig into the codebase to understand the feature thoroughly. Use multiple angles:

### Git history

```
git log --all --oneline --grep="<feature keyword>"
git log --all --oneline -- '<key file path>'
```

This tells you how the feature evolved, what problems were solved, and what was tried and abandoned.

### Code

Read the actual implementation files - routes, templates, client-side JS, styles, tests. Don't just find them; read them and understand the data flow end to end.

### Documentation

Check `notes/` for existing design docs, feature notes, and the glossary. These give you vocabulary and design intent.

Also check the git history of the notes directory, for historical implementation plans.

### Ask the user

The codebase can't tell you everything. Ask about:

- **What design decisions were intentional?** (e.g., "no auto-shuffle" was a deliberate choice for library search)
- **What's the full user flow?** (Features often span multiple components in ways that aren't obvious from code alone)

Ask one question at a time so the user can answer well.

## Step 2: Create the Knowledge Base

Create a directory: `notes/features/<feature-name>/`

Write these files:

### README.md

Start here. Contains:

- **Why the feature exists** (not just what it does)
- **Who uses it and how** (real usage context)
- **Design philosophy** (intentional non-features, rules the app doesn't enforce)
- **Quick reference table** (entry points, routes, key files, important behaviors)
- **Links to the other files** (so readers know what's available)

### architecture.md

How the feature works technically:

- **Data flow diagram** (text/ASCII is fine - from user action through to rendered response)
- **Routes** with file paths and line numbers
- **Template/view details** (parameters, rendering logic)
- **Client-side behavior** (JS, HTMX patterns)
- **Key model methods** used

### history.md

How the feature evolved:

- **Timeline of commits** (grouped by theme, oldest first)
- **Design decisions** and why they were made
- **Past problems** (things that blocked progress, data migration issues, etc.)
- **What was tried and abandoned** (saves future agents from repeating mistakes)

### interactions.md

This is the most important file for the review skill. Contains:

- **Depends on**: What this feature needs from other parts of the system
- **Depended on by**: What other features use this one (flag tight couplings)
- **Watch points**: Specific things that could break this feature if changed elsewhere. Be concrete: "if CardDefinition.types changes, update the mapping in src/app.ts lines 522-527"
- **Not related to**: Features with confusingly similar names or concepts (prevents false alarms)

### files.md

Every file involved, grouped by role (core implementation, UI entry points, styling, assets, tests, docs). Include line numbers for files where the feature lives alongside other code (like routes in app.ts).

## Step 3: Create the Skills

Write three skill files in the same directory:

### skill-review.md

Other agents invoke this with their plan to check for interactions.

Key elements:

- Load the knowledge base (especially interactions.md and files.md)
- Check for: direct file conflicts, data model impacts, shared infrastructure impacts (modals, routes, CSS), adapter/data source impacts
- Respond concisely: no interactions found (with what you checked), or specific interactions with actionable suggestions

### skill-update.md

Other agents invoke this after making a change that affected the feature.

Key elements:

- Read ALL knowledge base files first
- Read the actual changed source files (don't trust the description alone)
- Update whichever docs need it
- Commit the updates

### skill-context.md

Other agents invoke this to get background before starting related work.

Key elements:

- Answer the specific question, don't dump everything
- Read source files if the knowledge base doesn't have enough detail
- Flag knowledge gaps so they can be filled later

## Skill File Format

Each skill file needs YAML frontmatter:

```yaml
---
name: <feature-name>-review
description: <When to use this - be specific so agents know when to invoke it>
---
```

The description should mention concrete triggers: which parts of the codebase, which concepts. Agents use the description to decide whether to invoke the skill.

## Step 4: Link and Commit

Ask the user to link the skill files from `.claude/skills/`. Commit the knowledge base and skills together or in logical chunks (knowledge base first, then skills).

## Maintenance

The knowledge base rots if it isn't updated. The `-update` skill handles this, but it only works if agents actually invoke it. Remind agents in your review responses: "after you implement this, run `/feature-name-update` with a summary of what changed."

## Example

See `notes/features/library-search/` for a complete example of this pattern in action.
