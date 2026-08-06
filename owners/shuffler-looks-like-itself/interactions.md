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
  values (200×278 card, `outset` border, black playmat buttons). Deliberate changes to
  those will fail this test; that's the test doing its job, not a bug. Update it in the
  same commit.

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
- Give it a **visible `:focus-visible` state**. **No shipped stylesheet uses
  `:focus-visible` at all** — it appears only in `design-candidates.css`, which nothing
  but `/design` loads. The app has exactly one focus *outline* today (`site.css:325`,
  `.button-base:focus`, a plain `:focus`) — and two rules that make things worse by
  setting `outline: none` (`deck-selection.css:59` and `:86`, whose replacement glows
  have themselves drifted apart: pink on one, Material green on the other). Don't add to
  the deficit, and never write `outline: none` without replacing it with something
  visible.
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
- Flip *button* styles: `playmat.css:506` **and** `prepare.css:246` — **already
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
