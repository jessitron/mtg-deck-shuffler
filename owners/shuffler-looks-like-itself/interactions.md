# Interactions

**Citations here are file + selector, never `file:NNN`** — see
[README.md → How to cite code in this KB](README.md#how-to-cite-code-in-this-kb-standing-convention-2026-08-07).

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
- **`.scratch/tabletop-physics/`** — the Tabletop's shape-architecture maps lean on this KB by
  name. `issues/03-what-furniture-is.md` (resolved 2026-08-07) deferred *all* appearance to this
  owner and to `/design`, and `issues/11-what-a-zone-looks-like.md` is the ticket that will spend
  it. Two consequences: **the design language now gates a Tabletop implementation ticket**, and
  the stock tldraw look 03's implementer reproduces as scaffolding is **explicitly exempt from
  the Layer-1 token rule** — it's a knowingly-untokenized placeholder with a comment saying so,
  so a design-lint sweep must not "fix" it into a decision.
- **The two-faced-cards owner** — flip button styling and the `.flip-container-*` blocks.
- **The library-search owner** — modal and list styling.
- **`test/verification/verify-deck-title-placement.spec.ts`** (added 2026-08-07) — pins the
  deck-title plaque's *structure*, not its looks: `.playmat > .game-title` on `/prepare`,
  `.game-header-row > .game-title` on `/game`, zero matches for
  `.cool-command-zone-surround .game-title` on either, the title never inside `#game-menu`,
  and clicking the title dismisses an open menu. Restyling `.game-title` won't touch it;
  **re-parenting it will**, which is the point.
- **`test/verification/verify-design-gallery.spec.ts`** — asserts specific computed
  values (200×278 card, `.button-base.begin-button`'s border-style — **`solid`**, since
  choice 1 retired the `outset` bevel; this KB called it `outset` until 2026-08-07, black
  playmat buttons, and the global focus ring's
  3px / `rgb(221, 199, 221)` / 3px offset). It asserts **nothing** about `.game-title`, so
  the choice-7 border change needed no update to it. Deliberate changes to those will fail this test;
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
  the playmat (`.playmat-prepare` 20px, `.playmat-game` 80px — one object at two scales;
  settled 2026-08-07, not drift), and count discs only.
- **Don't add a `groove`/`outset`/`inset` border.** As of choice 7 (2026-08-07) exactly one
  survives in the whole app — `playmat.css` → `.cool-command-zone-surround`, `5px outset
  black`. Borders are flat (`solid`); press feedback is `.pushable-flat`'s box-shadow bevel,
  not a border switch. Conversely, **don't strip the surround's `outset` as tidying** —
  it's the last of its kind, and ending that language is Jess's call.
- Button labels are **Orbitron**. Card names are **Ovo**. No fourth typeface.
- **The focus state is already written for you** (choice 5, 2026-08-06). One global
  `:focus-visible` rule in `styles.css` (grep `:focus-visible`) draws `3px solid var(--light-pink)` at
  `outline-offset: 3px` on `a, button, input, select, textarea, summary, [tabindex]`. So a
  new element that is one of those tags inherits it and needs nothing. **Don't write a
  per-component focus rule**, and **never write `outline: none`** — that's what three
  now-deleted rules did (`deck-selection.css` ×2 plus `.json-summary` in
  `src/view/debug/state-copy.ts`; it was **three**, not two as this file used to say).
  Two things that do need care:
  - If your new element is focusable but **not** one of those tags (a `div` with a click
    handler, say), give it a real tag or a `tabindex` so the global rule reaches it.
  - **`outline` is globally spoken for.** **Two** rules still use it decoratively —
    `site.css` → `.main-footer` and `game.css` → `.hand-drop-zone.drag-over`. It was three
    until `a4991f3` (2026-08-07) converged the playmat frame: `.playmat-prepare`'s
    `outline: 10px solid black` became the shared `.playmat` rule's `border: 10px solid
    black`. Neither survivor is focusable today, so nothing conflicts; but a decorative
    `outline` on anything focusable **will be clobbered on focus**. Use `border` or
    `box-shadow` for decoration on anything a keyboard can reach.
    - **The outline→border swap is not free** (learned the hard way, `a4991f3`): `outline`
      paints *outside* the border box and consumes no space, so swapping it for a `border`
      shrinks the visible element by twice the width in each dimension, and any
      `min-height` starts including the frame. On `/prepare` the mat lost 20px each way and
      the top inset went 40px → 50px, dropping the title plaque 10px. `box-sizing:
      border-box` does **not** save you here — it governs `border` vs `padding`, not
      `outline`. Budget for the geometry change; don't claim the footprint is unchanged.
  - If the ring looks wrong on a pale surface, that's a **known open risk**, not a bug to
    patch locally — `--light-pink` on white is ~1.35:1, and the fix is a decision for Jess
    (it collides with the press bevel). See [open-choices.md](open-choices.md) choice 5.
- Neighbouring drift is not permission. Jess's call: pull toward the standard.

**Moving an existing component to a new parent** (learned 2026-08-07, the deck-title plaque)

- **Check whether its appearance is written as a descendant rule first.**
  `grep -n '\.the-class' public/*.css` — if what you find is `.some-parent .the-class`,
  the move will silently unstyle it. Promote the rule to a bare class selector in the
  sheet that owns the *component*, and leave only placement behind in the page sheet.
- **`.game-title` is now such a bare rule** in `playmat.css`. If you re-parent it again,
  its looks travel with it; only the two placement rules (`prepare.css` → `.playmat >
  .game-title`, `game.css` → `.game-header-row`) need attention, plus
  `verify-deck-title-placement.spec.ts`.

**Styling either play page's mat** (learned 2026-08-07, `7487393` then `a4991f3`)

- **The shared appearance is the bare `.playmat` rule in `playmat.css`** — art,
  `background-size`/`-position`, `border: 10px solid black`. Put shared looks there. A bare
  `.playmat` rule in a *page* sheet would leak across `/design`, which co-loads both sheets;
  `playmat.css` is the only sanctioned home for it.
- **Load order is a trap here, and two owners have now hit it.** `.playmat`,
  `.playmat-game` and `.playmat-prepare` are equal specificity (one class each), and the
  pages load their sheets in opposite order: `/game` is `game.css` → `playmat.css`,
  `/prepare` is `playmat.css` → `prepare.css`. **A property added to the bare `.playmat`
  rule silently overrides `.playmat-game` on `/game` but loses to `.playmat-prepare` on
  `/prepare`** — same declaration, opposite outcome per page, no error either way. Keep
  each property in the shared rule *or* in a modifier, never both. The `CAREFUL` comment
  above the rule in `playmat.css` says this; keep it there. (Adding a `!important` or a
  second class to break the tie would just move the trap.)
- **What legitimately stays per-page:** `border-radius` (80px game / 20px prepare — scale,
  Jess 2026-08-07), each page's layout, and `.playmat-game`'s `box-shadow: 5px 5px black`.
  That shadow is the only difference with no stated reason; it's buoyed as
  `playmat-drop-shadow`, blocked on `design-playmat-specimen`. **Don't converge it as
  tidying** — it's a survivor of the "giant Magic card" reading and Jess hasn't ruled.
- **Placement keys off the bare `.playmat`, deliberately.** `prepare.css` →
  `.playmat > .game-title`, `.playmat .cool-command-zone-surround`,
  `.playmat .commander-placeholder`. Don't "tidy" these to `.playmat-prepare` — the mat as a
  domain object is the grid parent, and that's what these are relative to.
- **The mat art is one asset named in two places**, down from three: `playmat.css` → the
  bare `.playmat` rule, and `design-gallery.css` → `.stage-playmat` (which hand-copies the
  URL because the gallery renders a *lookalike*, not the real mat — see
  `design-playmat-specimen` in `TODO.md`). `site.css` uses the same file for its own
  purposes and is unrelated. Changing the art means editing both playmat sites, or fixing
  the gallery first. **No hotlink to `cards.scryfall.io` remains for the mat** — the game
  mat used one until `a4991f3`; don't reintroduce a third-party image host for chrome.
- **The mat art at scale is fine and was checked.** The asset is 1040×745, drawn at up to
  1800px on `/game`; it's painterly and abstract, which upscales forgivingly, and it was
  *already* being upscaled ~2.4× through the old Scryfall card. Verified at a 1900px
  viewport 2026-08-07. Don't re-derive this, and don't buoy a higher-res asset without a
  new reason.
- **Animations does not reach the mat** (checked 2026-08-07): no animation selector matches
  `.playmat*`, the mat sets no `overflow` so shuffle keyframes still spill past its edge,
  and `#revealed-cards-section { background-color: inherit }` inherits a computed *color*,
  not the art. Still consult the animations owner for `game.css` generally.
- **`.page-container` no longer exists.** If a doc, comment or plan names it, it's stale;
  it's `.playmat-game`. (`.error-page-container` in `src/view/common/html-layout.ts` is an
  unrelated class and was not touched.)
- **On `/game`, anything you put in the top strip must be a SIBLING of `#game-menu`, not a
  child.** `game.js` dismisses the open menu on `!evt.target.closest("#game-menu")`, and
  `#game-menu` is the dropdown panel's positioning ancestor — so nesting swallows the
  dismiss click *and* pushes the panel down by your element's height. `.game-header-row` is
  the sibling wrapper that exists for this; put new top-strip chrome there.
- **A fixed grid track will clip, not grow.** `prepare.css` `.playmat-prepare` row 1 had to become
  `minmax(50px, auto)` when the plaque landed in it, because a long deck name wraps. If you
  place text in a fixed-height track, make it `minmax`.
- **HTML that interpolates user-supplied text must escape it.** Deck names come from
  Archidekt. `escapeHtml` lives in `src/view/common/shared-components.ts` (moved there from
  `active-game-page.ts` on 2026-08-07, where it was module-private) — import it rather than
  writing a second copy.

**Adding a stylesheet**

- Add it to the right head — `head.ejs` `additionalStyles` for an EJS view,
  `additionalStylesheets` for a TS page. They are separate lists.
- Add it to `design.ejs` and to `APP_STYLESHEETS` in
  `test/verification/verify-design-gallery.spec.ts`, or the gallery silently stops
  representing the app.

**Editing a duplicated block** (see [architecture.md](architecture.md) for the list)

- Modal styles: `playmat.css` **and** `prepare.css`.
- Flip *container* styles: `game.css` **and** `prepare.css` (still identical).
- Flip *button* styles: `playmat.css` → `.modal-action-button.flip-button` **and**
  `prepare.css` → `.flip-button` — **already
  diverged**; fixing one will not fix the other, and they no longer look alike.
- Library-list styles: `playmat.css` **and** `prepare.css`.
- Prefer deleting the duplicate over editing one copy. If you must edit one, edit both and
  say so.

**Adding or renaming a token**

- New tokens go in the `:root` in `styles.css`. **Do not create a fifth `:root` — there are
  already four** (`styles.css`, `docs.css`, `game.css` `--playmat-*`, `playmat.css`
  `--mana-*`); see [architecture.md](architecture.md) for which are drift.
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

**Designing anything that lives inside the tldraw canvas** (added 2026-08-07)

- **Read [README.md](README.md) → "tldraw limits" first.** Four rules behave differently on the
  canvas, and three of them are hard limits rather than choices: no Orbitron in the `geo` `font`
  enum (so on-brand canvas text requires a self-rendering shape), the global `:focus-visible`
  rule can't reach a shape (tldraw owns selection indication), a locked shape can never be a
  drop target (so "reacts to what's over it" must be a derived render, not a hook), and an
  opaque `image` shape layered over a box hides that box's interior.
- **A self-rendering shape needs its own `toSvg`, or it vanishes from canvas exports.** The cost
  scales with the treatment — gradients, shadows and a webfont all have to be hand-written into
  the SVG. **Budget it inside the option comparison**, not after Jess has picked.
- **Size canvas things in card widths, and use the *right* card.** The Tabletop's card is
  **170 × 238** (`apps/tabletop/DESIGN.md`, 68 units/inch). The Shuffler's CSS card is 200 × 278.
  They are both "the card is the layout unit" and they are **not the same number** — don't cross
  them.
- **`apps/tabletop` has no stylesheet and no font link**, so a `var(--…)` there resolves to
  nothing and Orbitron silently becomes a system serif. See [open-choices.md](open-choices.md)
  → "Fleet gaps — the Tabletop side" before writing any Tabletop CSS.
- **Deciding a canvas treatment is not blocked by that plumbing; implementing it is.** Staging
  happens on `/design` in the Shuffler, which already has the tokens and the fonts. Stage first.

## Not related to

- **Card movement choreography** — slide/grow/shuffle keyframes, HTMX swap timing,
  drag-and-drop, `WhatHappened`. That's the **animations** owner. The boundary: animations
  owns *how a card gets from A to B*; this owner owns *what the controls and surfaces look
  like*. A hover-lift on a button is this owner's; a card sliding into the hand is theirs.
  They overlap on `game.css` and on transition easing — consult both.
- **Which cards render and when** — game state, zones, deck adapters. Not a design concern.
- ~~**The Tabletop's appearance**~~ — **no longer true.** This owner went fleet-wide on
  2026-08-06 (see [README.md](README.md), "Two layers"): Layer 1 craft rules apply to
  `apps/tabletop` today, and Layer 2 identity is meant to be shared. What *is* still true
  is that tldraw owns much of the Tabletop's chrome — record those limits in the README
  rather than fighting them.
- **Telemetry, persistence, the event contract.** No overlap.
- **`notes/DESIGN-interface.md`** — that's wireframes and information architecture (what
  goes on which screen), not visual language. It's stale in places; don't treat its ASCII
  layouts as current.
