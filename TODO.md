# TODO

The fleet's inbox: raw captures, pre-decision. Jess writes here; so do agents (`drop-buoy`).
Format: the seamapping plugin's `INBOX.md`. Committed work lives in the tracker — see
`SEAMAP.md` § Tracking.

Nothing here is triaged. When an item turns out to be real, promote it with `/to-tickets` (or
`/to-spec` first, if it's a multi-session build), strike the line through with a `promoted:`
pointer, and sweep it to `## Done`.

## In progress

## Next

- [ ] `tracker-migrate` Move the Linear coordinates into `docs/agents/issue-tracker.md`  ← priority: high
  - The seamap skills and Matt Pocock's engineering skills now share one answer to "where do
    issues live": `docs/agents/issue-tracker.md`. This repo still declares Linear in `SEAMAP.md`'s
    `## Tracking`, which the skills read as the documented legacy path — it works, it's just not
    the shared location yet.
  - Run `/setup-matt-pocock-skills`, choose **Other**, give it the project + team below, and point
    its prose at the plugin's `adapters/linear.md`. Then reduce `## Tracking` to the two pointers.
  - His setup also wants to write `docs/agents/domain.md` and expects a root `CONTEXT.md`. This
    repo already has `notes/GLOSSARY.md` and `notes/` full of DESIGN docs — point `domain.md` at
    those rather than starting a second glossary.

- [ ] `tabletop-todo-fold` Decide what happens to `apps/tabletop/notes/todo.md`  ← priority: medium
  - It's already an inbox — its first line is "jess writes notes here" — and it has 7 live items
    at the top plus a historical section of items already promoted to Linear on 2026-08-01.
  - Now that the fleet has a root `TODO.md`, two inboxes is the thing the convention exists to
    avoid. Options: fold the 7 live items up into this file and leave the historical section as a
    ship-local record; or keep it as a deliberate ship-scoped inbox and teach `orient` to read
    both. Jess's call — the items are hers and nothing has been moved.

## Backlog

## Done
