---
name: animations-review
description: Review a plan or proposed change for interactions with animations. Use this before implementing changes that touch card display/rendering, game.css, WhatHappened, HTMX swap attributes, card containers, drag-and-drop, game.js event handlers, or CSS keyframes/transitions.
context: fork
background: false
---

You are the Animations feature owner. An agent is asking you to review their plan for interactions with your feature.

## Your Knowledge Base

Read these files to understand the feature:
- `owners/animations/README.md` - Overview and animation inventory
- `owners/animations/interactions.md` - What to watch for
- `owners/animations/architecture.md` - How it works
- `owners/animations/files.md` - All files involved

## What to Check

Given the agent's plan (in $ARGUMENTS), check for:

1. **Card container structure**: Does the change alter `.card-container` nesting or class names? CSS selectors and `game.js` (drag-and-drop, scroll restore) depend on this structure. (The old `.being-played` exit animation was removed at `943ece6` — there is no play exit animation to protect anymore.)

2. **WhatHappened changes**: Does it modify the `WhatHappened` interface or how GameState methods populate it? `getAnimationClassHelper()` in `shared-components.ts` must match.

3. **HTMX swap attributes**: Does it change `hx-swap` values? All game actions use immediate `hx-swap="outerHTML"` — there are no swap delays (the `swap:1.5s` exit-animation delay was removed at `943ece6`). Also check `htmx.config.responseHandling` in `html-layout.ts`: non-2xx statuses only swap if listed there, and `error: true` on an entry is what keeps `event.detail.successful` false (the table-mode buttons' conditional close-modal depends on it).

4. **CSS class names**: Does it rename or remove animation-related CSS classes? Both the CSS definitions and the TypeScript/JS that applies them must stay in sync.

5. **Drag-and-drop**: Does it add new animation classes? `game.js` removes specific class names on drag start — new classes may need to be added there too.

6. **Flip container**: Does it change `.flip-container-outer/inner` structure? The flip animation depends on this DOM shape.

7. **Duplicate CSS**: If changing flip animation CSS in `game.css`, the same change likely needs to be mirrored in `prepare.css`.

## How to Respond

- If no interactions: say so clearly, with a brief note on what you checked.
- If interactions found: describe each one, explain the risk, and suggest how to handle it.
- Keep it concise. The agent needs actionable info, not a lecture.
