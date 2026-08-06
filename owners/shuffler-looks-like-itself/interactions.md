# Interactions

## Depends on

- **`styles.css` `:root`** — the token set. Everything downstream assumes these names
  exist and mean what they mean. Renaming or removing a token breaks silently (CSS just
  drops the declaration).
- **Google Fonts** — Orbitron, Ovo, Risque, loaded from `fonts.googleapis.com` by both
  heads. If a page forgets its `additionalFonts` entry, the text silently falls back to a
  system serif and looks wrong without erroring.
- **The two heads** — `views/partials/head.ejs` and `formatHtmlHead()` in
  `src/view/common/html-layout.ts`. A stylesheet only exists on the pages whose head
  lists it.
- **The `/design` gallery** — the only place the language is visible all at once.
- **`apps/shuffler/CLAUDE.md` → "UI Style"** — the short public statement of the rules.

## Depended on by

- **Every EJS view and every function in `src/view/`** that emits HTML — they name
  classes defined in these stylesheets.
- **HTMX fragment routes.** Fragments are swapped into pages that already loaded their
  CSS, so a fragment cannot bring its own stylesheet. Any new class a fragment uses must
  exist in a stylesheet the *host page* already loads.
- **The animations owner** (tight coupling — see "not related to" for the boundary). Both
  care about `game.css`, transitions, and card containers.
- **The two-faced-cards owner** — flip button styling and the `.flip-container-*` blocks.
- **The library-search owner** — modal and list styling.
- **`test/verification/verify-design-gallery.spec.ts`** — asserts specific computed
  values (200×278 card, `outset` border, black playmat buttons, and the global focus ring's
  3px / `rgb(221, 199, 221)` / 3px offset). Deliberate changes to those will fail this test;
  that's the test doing its job, not a bug. Update it in the same commit. **If you change the
  focus ring's color or width, that spec is the thing that will tell you** — it reads the
  computed style off specimens carrying no candidate classes.

## Watch points

Concrete, in rough order of how often they bite.

**Adding any new UI element**

- If you are about to write a raw hex value, stop. Use a token from `styles.css` `:root`.
  If no token fits, that is a design decision — surface it, don't invent a color.
  Material and Bootstrap defaults are specifically forbidden: `#4caf50`, `#2196f3`,
  `#ff9800`, `#e91e63`, `#9c27b0`, `#3f51b5`, `#673ab7`, `#607d8b`, `#f44336`, `#007bff`,
  `#28a745`, `#6c757d`, `#007acc`. These are the drift; grepping the CSS will find them
  and they are not precedent.
- New chrome gets **square corners** (`border-radius: 0`). Round corners are for cards,
  the playmat, `.page-container`, and count discs only.
- Button labels are **Orbitron**. Card names are **Ovo**. No fourth typeface.
- **The focus state is already written for you** (choice 5, 2026-08-06). One global
  `:focus-visible` rule in `styles.css:200-209` draws `3px solid var(--light-pink)` at
  `outline-offset: 3px` on `a, button, input, select, textarea, summary, [tabindex]`. So a
  new element that is one of those tags inherits it and needs nothing. **Don't write a
  per-component focus rule**, and **never write `outline: none`** — that's what three
  now-deleted rules did (`deck-selection.css` ×2 plus `.json-summary` in
  `src/view/debug/state-copy.ts`; it was **three**, not two as this file used to say).
  Two things that do need care:
  - If your new element is focusable but **not** one of those tags (a `div` with a click
    handler, say), give it a real tag or a `tabindex` so the global rule reaches it.
  - **`outline` is globally spoken for.** Three rules still use it decoratively —
    `site.css:422` (`.main-footer`), `prepare.css:25` (`.playmat`), `game.css:458`
    (`.hand-drop-zone.drag-over`). None is focusable today, so nothing conflicts; but a
    decorative `outline` on anything focusable **will be clobbered on focus**. Use `border`
    or `box-shadow` for decoration on anything a keyboard can reach.
  - If the ring looks wrong on a pale surface, that's a **known open risk**, not a bug to
    patch locally — `--light-pink` on white is ~1.35:1, and the fix is a decision for Jess
    (it collides with the press bevel). See [open-choices.md](open-choices.md) choice 5.
- Neighbouring drift is not permission. Jess's call: pull toward the standard.

**Adding a stylesheet**

- Add it to the right head — `head.ejs` `additionalStyles` for an EJS view,
  `additionalStylesheets` for a TS page. They are separate lists.
- Add it to `design.ejs` and to `APP_STYLESHEETS` in
  `test/verification/verify-design-gallery.spec.ts`, or the gallery silently stops
  representing the app.

**Editing a duplicated block** (see [architecture.md](architecture.md) for the list)

- Modal styles: `playmat.css` **and** `prepare.css`.
- Flip *container* styles: `game.css` **and** `prepare.css` (still identical).
- Flip *button* styles: `playmat.css:518` **and** `prepare.css:246` — **already
  diverged**; fixing one will not fix the other, and they no longer look alike.
- Library-list styles: `playmat.css` **and** `prepare.css`.
- Prefer deleting the duplicate over editing one copy. If you must edit one, edit both and
  say so.

**Adding or renaming a token**

- New tokens go in the `:root` in `styles.css`. Do not create a third `:root` — `docs.css`
  already has a second one that re-declares three tokens.
- Add the swatch to the "Named tokens" grid in `design.ejs` in the same commit.

**Adding a component**

- Add a specimen to `/design` in the same commit. A component that isn't on the gallery is
  invisible to the next person designing something next to it.
- If it introduces a *second* way to do something that already exists, don't silently
  pick — add it to `/design` as a `.choice` block with both options and ask Jess.

**Resolving an open choice** (button press behaviour, focus ring, etc.)

- Move the winning CSS out of `design-candidates.css` into the stylesheet that owns the
  component, delete the losing candidates, and convert the `.choice` block in `design.ejs`
  into a plain specimen with a `badge-standard` tag.
- Update the "Open choices" table in [README.md](README.md) and the house-rules list at
  the bottom of `design.ejs`.
- If option B (Comeau `.pushable`) wins for buttons, note that **every** button-emitting
  template and HTMX fragment needs three nested spans — that's a large, mechanical change
  across `views/` and `src/view/`. Option C was written specifically to avoid it.

**Touching `game.css`**

- Consult the **animations** owner too. Its charge lives in the same file.

## Not related to

- **Card movement choreography** — slide/grow/shuffle keyframes, HTMX swap timing,
  drag-and-drop, `WhatHappened`. That's the **animations** owner. The boundary: animations
  owns *how a card gets from A to B*; this owner owns *what the controls and surfaces look
  like*. A hover-lift on a button is this owner's; a card sliding into the hand is theirs.
  They overlap on `game.css` and on transition easing — consult both.
- **Which cards render and when** — game state, zones, deck adapters. Not a design concern.
- **The Tabletop's appearance** (`apps/tabletop`). Different ship, tldraw-based, and not
  far enough along to have standards. This owner is scoped to the Shuffler.
- **Telemetry, persistence, the event contract.** No overlap.
- **`notes/DESIGN-interface.md`** — that's wireframes and information architecture (what
  goes on which screen), not visual language. It's stale in places; don't treat its ASCII
  layouts as current.
