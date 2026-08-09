# Interactions

**Citations here are file + selector, never `file:NNN`** — see
[README.md → How to cite code in this KB](README.md#how-to-cite-code-in-this-kb-standing-convention-2026-08-07).

## Depends on

- **`packages/design-tokens/tokens.css` (`@fleet/design-tokens`)** — the fleet's token set,
  since `4396aea` (2026-08-07). Everything downstream on **both ships** assumes these names
  exist and mean what they mean. Renaming or removing one breaks silently (CSS just drops the
  declaration) — and now it breaks silently in two apps. Reaching each ship differently:
  `express.static` at `/fleet` in the Shuffler's `src/app.ts`, a Vite import in the Tabletop's
  `src/client/main.tsx`. **Also depends on the npm workspace plumbing**: `packages/*` in the
  root `workspaces` glob, and each Dockerfile copying `packages/` — see
  [architecture.md](architecture.md) for the three container facts.
- **`styles.css` `:root`** — now just `--background-color`. Shuffler-only.
- **Google Fonts** — Orbitron, Ovo, Risque, loaded from `fonts.googleapis.com` by **two**
  head sources (down from three since `b268414`, 2026-08-08): the Shuffler's one page shell
  (`formatHtmlHead` in `src/view/common/html-layout.ts` — `head.ejs` is just an adapter over
  it) and `apps/tabletop/index.html`. If a page forgets its
  `additionalFonts` entry, the text silently falls back to a system serif and looks wrong
  without erroring. **One delivery mechanism fleet-wide** — a `<link>` *or* `@font-face`,
  never both; self-hosting would be a change to both sources at once.
  **Two separate things, and don't conflate them (since `f79bc7d`, 2026-08-07):** the `<link>`
  *fetches* the face and still names it literally — a custom property cannot reach a `<link>
  href`. Every place that *applies* a face goes through `var(--font-chrome/-content/-display)`.
  So a new page needs **both**: the token in its CSS *and* its `additionalFonts` entry. The
  token resolving is not evidence the font arrived — that's the lazy-fetch trap below.
- **The one page shell** — `formatHtmlHead(options)` in `src/view/common/html-layout.ts`
  (since `b268414`, 2026-08-08; `views/partials/head.ejs` is now a thin adapter over it via
  `app.locals`, and the only spot that adds `site.css`). A stylesheet only exists on the
  pages whose call passes it — the shell unifies the skeleton, not the per-page lists.
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
  owner and to `/design`, and `issues/11-what-a-zone-looks-like.md` (resolved 2026-08-07,
  `a304c52` — the last open ticket on the map) spent it: zone at-rest/armed looks, playmat
  border and corner radius, and the Stack's treatment, all staged and picked on `/design` §
  Tabletop zones. Two consequences: **the design language now gates a Tabletop implementation
  ticket**, and the stock tldraw look 03's implementer reproduces as scaffolding is **explicitly
  exempt from the Layer-1 token rule** — it's a knowingly-untokenized placeholder with a comment
  saying so, so a design-lint sweep must not "fix" it into a decision. **Decided, not built** —
  ticket 11's picks have nowhere to land until the Tabletop has its own stylesheet
  (`tabletop-css-tokens` in the repo-root `TODO.md`).
  `issues/04-tap-is-state.md` (resolved 2026-08-07) is the second: it settled a card's handle
  set (see the canvas watch points below) and **handed this owner an open question**,
  `issues/05-rotate-to-tap.md` — the tap motion's duration and easing, to be decided *with*
  this owner. 04 deliberately decided no duration, easing, colour or literal. The calibration
  it recorded for 05: the Shuffler's vocabulary is **0.8s** (flip transition) and **0.5s**
  (card motion), and a tap is a flip-like *reorientation*, not a translation — so match one of
  those two rather than inventing a third tempo. **The tempo can be decided now but not
  implemented** — `tabletop-css-tokens` still blocks any Tabletop CSS.
- **`.scratch/tabletop-table-layout/`** — the Table-layout map's tickets also lean on this KB.
  `issues/10-the-square.md` (resolved 2026-08-08) added the fifth tldraw limit (no per-viewer
  rotation). `issues/12-life-totals-and-commander-damage.md` (resolved 2026-08-08) decided a
  **new player-visible surface**: life totals and commander damage as a locked custom
  `mtg-counter` shape in the name row, placement dictated verbatim by Jess, **appearance
  deliberately undecided** — the implementation ticket owes this owner a `-context` and
  `-review` before any font/size/color lands (see the canvas watch points below). It also made
  **sleeve color a player-identity signal fleet-wide** (opponent name + sleeve color identifies
  each commander-damage counter; no separate player-color concept; playmats rejected as the
  identity carrier) — so ticket 09's sleeve palette and ticket 11's color plumbing now carry
  identity weight beyond card backs.
  `issues/11-sleeve-color-to-card-back.md` (resolved 2026-08-08) settled that plumbing:
  `sleeveColor` is an optional raw hex on `seat.joined`'s player data, baked into `mtg-card`
  props at mint (a game constant, never changed mid-game — that immutability is what makes
  per-card baking legal), and decided the rendering *model* — solid rectangle slightly larger
  than the card; face-down cards and the library pile render as the bare sleeve rectangle; a
  face-up sleeved card shows its image centered inside it; unsleeved keeps the standard back.
  Appearance specifics (margin, radius, border/sheen, swatch palette) are explicitly reserved
  for this owner at implementation time — see [open-choices.md](open-choices.md) → "Fleet
  gaps — the Tabletop side".
  `issues/13-*` (**built** 2026-08-08, `1046b93` + `b18bd16`) is the map's first
  implementation ticket to land, and the design language held with zero new CSS: the new
  Command Zone furniture is a standard `mtg-zone` (dashed dark-pink at rest, armed glow,
  `--font-chrome` label — "Command Zone", Title Case, the two-word glossary term, matching
  its siblings). **No distinct "commander lives here" look was invented** — deliberately;
  if one is ever wanted it's a future decision (tickets 08/18/19 territory), not something
  to backfill as tidying. Everything else in the ticket is geometry (column 425→550, Exile
  under Graveyard, 20-unit gaps), recorded in `apps/tabletop/DESIGN.md`'s table, not here.
- **The two-faced-cards owner** — flip button styling and the `.flip-container-*` blocks.
- **The library-search owner** — modal and list styling.
- **`test/verification/verify-deck-title-placement.spec.ts`** (added 2026-08-07) — pins the
  deck-title plaque's *structure*, not its looks: `.playmat > .game-title` on `/prepare`,
  `.game-header-row > .game-title` on `/game`, zero matches for
  `.cool-command-zone-surround .game-title` on either, the title never inside `#game-menu`,
  and clicking the title dismisses an open menu. Restyling `.game-title` won't touch it;
  **re-parenting it will**, which is the point.
- **The fleet-token wiring specs** (added 2026-08-07): `apps/shuffler/test/verification/verify-fleet-tokens.spec.ts`,
  `apps/tabletop/test/verification/verify-fleet-tokens.spec.ts`,
  `apps/shuffler/test/html-layout-fleet-tokens.test.ts`, and `scripts/check-fleet-tokens.sh`.
  They assert the shared tokens **resolve** and Orbitron **fetches** — plumbing, not palette —
  plus that no shared token is re-declared in `styles.css`. **Both ships' `SHARED_TOKENS` lists
  grew by four on 2026-08-07 (`f79bc7d`): `--font-chrome`, `--font-content`, `--font-display`,
  `--radius-soft`. Add every new shared token to both lists** — the Tabletop's copy is the one
  that matters most, since nothing there uses these yet and a broken import would otherwise be
  invisible. Changing a colour must not break
  them; if it does, the test is asserting the wrong thing. See the testing watch point below.
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
- **Don't add a `groove`/`outset`/`inset` border.** None survives in the app as of
  2026-08-07: choice 7 flattened the deck-title plaque's `groove`, and later the same day
  Jess directly edited `.cool-command-zone-surround` (`playmat.css`) from `5px outset black`
  to `3px solid black`, unifying it with the plaque. Borders are flat (`solid`) everywhere
  now; press feedback is `.pushable-flat`'s box-shadow bevel, not a border switch. That
  surround edit ended the chunky-3D vocabulary this owner had been protecting as "the last
  one, don't strip it as tidying, ending it is Jess's call" — she made that call herself,
  directly, outside the `/design` staging process. Nothing left to protect here; if a new
  `outset`/`inset`/`groove` shows up, it's new drift, not a regression toward something the
  app used to have.
- Button labels are **Orbitron**, card names are **Ovo**, and **you write neither name**.
  `font-family: var(--font-chrome)` for chrome, `var(--font-content)` for content,
  `var(--font-display)` for site-page hero words. No fourth typeface, and no typeface literal:
  since `f79bc7d` (2026-08-07) the only `font-family` literals left in the Shuffler's CSS are
  `monospace` and `inherit`. If you write `"Orbitron", sans-serif` you have reintroduced the
  drift the sweep removed — grep `font-family` in `apps/shuffler/public/*.css` and you'll see
  what the file expects.
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
- **Load order used to be a trap here — RESOLVED 2026-08-07 (`63d4c08`), as a side effect
  of an unrelated appearance commit.** `.playmat`, `.playmat-game` and `.playmat-prepare`
  are equal specificity (one class each). The pages used to load their sheets in *opposite*
  order (`/game` was `game.css` → `playmat.css`, `/prepare` is `playmat.css` →
  `prepare.css`), so a property added to the bare `.playmat` rule silently overrode
  `.playmat-game` on `/game` but lost to `.playmat-prepare` on `/prepare` — same
  declaration, opposite outcome per page, no error either way. **`html-layout.ts`'s
  `formatHtmlHead()` now loads `playmat.css` before `game.css`**, matching `/prepare`'s
  order, so both pages now resolve a shared-property tie the same way (the modifier wins on
  both). The `CAREFUL` comment that used to sit above `.playmat` was deleted in the same
  commit — correctly, since the hazard it described is gone. **Still keep each property in
  the shared rule or in a modifier, never both** — that discipline doesn't depend on load
  order staying aligned, and if a future change makes the two pages diverge again, the trap
  is back.
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
- **`#hand-section`'s `min-height: 579px` (`game.css`, added `e930da8`, 2026-08-07) exists
  to protect the mat's crop, not the hand's layout.** `.playmat-game` sizes itself off its
  children's height, and the bare `.playmat` rule's `background-size: cover` recomputes its
  crop/zoom every time that height changes — so a hand growing from empty to 8 cards (7
  opening + a draw), which wraps from 1 row to 2, used to visibly shift the playmat art. The
  fixed `579px` (measured: 2-row height at both 1440px and 1900px viewport widths) reserves
  the 2-row height up front so the box height — and therefore the crop — stays constant
  across that range. **This did not touch the bare `.playmat` rule or
  `background-attachment`**; fixing the art in place at the `.playmat` level was raised and
  rejected the same session, because it would cut across "one appearance, two scales" between
  `/game` and `/prepare`. Instead it stabilizes what `background-size: cover` computes
  *against*, entirely inside `.playmat-game`'s (page-specific) box, via the shared
  `#command-zone, #library-section, #revealed-cards-section, #hand-section` selector's
  page-specific sibling — no siblings' `278px` value moved. **A hand past 8 cards still grows
  the mat and re-triggers the crop shift** — accepted, not fixed (measured stable 8–11 cards
  at 1189px mat height, jumping again only at 12 cards = 3rd row). If the hand's row height,
  gap, or the 7-card-opening-hand assumption ever changes, re-measure and update this number
  — it isn't derived from anything else in the CSS.
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
- **Library and command zone swapped sides (2026-08-07): library is now RIGHT, command zone
  LEFT, on both play pages — pure placement, no appearance change.** On `/game`,
  `.game-top-row` is a flex row with no `order` property, so DOM order **is** visual order;
  `formatActiveGameHtmlSection` (`active-game-page.ts`) now emits `commandZoneHtml`,
  `revealedCardsHtml`, `librarySectionHtml` in that sequence. On `/prepare`,
  `.playmat .cool-command-zone-surround` and `.section-that-is-horizontally-aligned-with-command-zone`
  (the library-side rule) swapped `grid-column` (surround 4→2, library 2→4) and the
  library's `justify-self` flipped `end`→`start` to keep it hugging the side nearer the
  command zone. **On `/prepare` only, that library-side selector was later renamed** to
  `.prepare-container .library-section` (2026-08-07, `f42a99a`) — `game.css` still uses the
  original name, so grepping for `.section-that-is-horizontally-aligned-with-command-zone`
  now finds only the `game.css` copy. **If you ever change this grid again, `.playmat .commander-placeholder`
  moved too** (`grid-column` 5→1, `justify-self: start`, so it overflows right into
  column 2) — it's the "no commander" alt-render of the *same* slot the surround occupies,
  and the two are safe to sit in different columns **only** because `commanders.length
  === 0` renders exactly one of them, never both. Don't "tidy" them back into alignment
  without re-checking that mutual exclusivity still holds.

**Testing that a token or a font actually arrived** (added 2026-08-07, `4396aea`)

The whole reason the token package carries tests is that **both halves fail silently** — CSS
drops an unknown `var()`, a missing webfont falls back to a system serif. Four things the
existing specs learned, in the order they'll bite you:

- **`document.fonts.check('16px Orbitron')` returns FALSE on a ship where nothing uses
  Orbitron yet, even when the `<link>` is perfectly correct.** Browsers fetch a webfont
  **lazily** — only once something on the page actually sets that family — and the Tabletop's
  only styled surface is the off-brand landing page. The Tabletop's spec therefore does
  `await document.fonts.load("16px Orbitron")` *then* `check(...)`, asserting **fetchability**
  rather than loadedness. The Shuffler's equivalent needs no explicit `load()` because plenty
  there is set in Orbitron. **Any future "is our font working" test on a ship with no on-brand
  surface will hit this**; swap back to a plain `check()` the day a real surface sets the
  family, which is the stronger assertion.
- **Assert non-empty, not a specific hex.** `verify-fleet-tokens.spec.ts` protects the
  *plumbing*; changing a colour is this owner's call and must not break wiring tests. The one
  concrete value asserted anywhere is `--deep-space` on the Tabletop, and only to prove the two
  ships share a dictionary.
- **Cover the `/game` path cheaply.** `test/html-layout-fleet-tokens.test.ts` is a jest test
  on `src/view/common/html-layout.ts` because reaching a play page in Playwright needs a
  whole game set up. The seam survived the shell unification (`b268414`, 2026-08-08 —
  retitled "the one page shell links the fleet palette", new object-options signature, plus
  assertions on page-sheet order, `additionalFonts`, and title escaping). "The two heads are
  the thing most likely to diverge" is retired: there is one shell now, and this test is
  what guards its skeleton.
- **A boot check is not a link check.** `import.meta.resolve` doesn't verify the file exists,
  so `verify-container-boot.sh` passes with a dangling workspace symlink — the server starts
  fine and only `/fleet/tokens.css` 404s. Curl the route, don't trust the boot.

**Adding a stylesheet**

- Get it into the one shell through the right door — `additionalStyles` in an EJS view's
  locals (the `head.ejs` adapter passes it through, after `/site.css`), or
  `additionalStylesheets` on `formatPageWrapper` for a TS page (lands after `/playmat.css`
  and `/game.css`). The shell's own parameter is named `stylesheets`; only the adapter and
  `formatPageWrapper` call it directly. The per-page lists are still separate — the shell
  unified the skeleton, not the manifests.
- Add it to `design.ejs` and to `APP_STYLESHEETS` in
  `test/verification/verify-design-gallery.spec.ts`, or the gallery silently stops
  representing the app.

**A shared class split across two files can carry a numeric coupling, not just a
duplicated block** (2026-08-07, `5c69aa3`) — **RESOLVED 2026-08-07 (`c19f49c`), by deletion,
not by recomputing new numbers.**

- `.section-that-is-horizontally-aligned-with-command-zone` used to exist in both
  `prepare.css` (`margin-top`) and `game.css` (`padding-top`) -- different properties, but
  both existed to push the library stack down until its card art meets the commander card's
  art, not the top of `.cool-command-zone-surround`'s metal frame. The real number was
  **22px**: 5px surround border + 10px surround padding + 7px `.multiple-cards` inset border
  (game.css's comment had this breakdown right). `prepare.css` had `margin-top: 7px` -- only
  the innermost inset -- silently undershooting by the outer 15px, for however long that
  went unnoticed.
- **This is a fixed-px inset, not a scaled one.** The surround's border/padding are literal
  pixels, unaffected by the playmat's own scale (`border-radius: 80px` game vs `20px`
  prepare). So `/prepare`'s smaller mat still needs the *same* number as `/game`'s larger one
  -- don't be tempted to scale it down.
- **The library/command-zone swap (`e7b393e`) didn't cause this bug** -- grid-column and
  flex-order changes can't affect cross-axis alignment. It just moved the two elements into
  a direct side-by-side comparison, which is what made a pre-existing 15px gap visible.
  Lesson: a layout reorder can *expose* a latent alignment bug it didn't create; check the
  actual rendered `<img>` rects (not just the outer container boxes) before assuming the
  reorder itself is the culprit.
- **The coupling broke again 2026-08-07 (`f42a99a`), and this time only one side was
  touched.** Jess renamed the prepare-side selector to `.prepare-container .library-section`
  and **deleted the whole 22px `margin-top` rule and its comment** — `/prepare`'s library
  stack now has no vertical-alignment offset against the commander card at all.
  `game.css`'s copy, `.section-that-is-horizontally-aligned-with-command-zone {
  padding-top: 22px; }`, was **not touched**, and the very next commit (`63d4c08`) changed
  every number that 22px was computed from: the surround's border went 5px → 3px, and
  `.multiple-cards` lost its border and inset entirely (was `border-width: 7px;
  border-style: inset`) — leaving `game.css`'s comment and value stale, describing arithmetic
  that matched no real dimension on the page.
- **Closed 2026-08-07 (`c19f49c`), directly by Jess, the same way she'd already closed the
  prepare side: delete, don't recompute.** She removed the whole
  `.section-that-is-horizontally-aligned-with-command-zone { padding-top: 22px; }` rule and
  its comment from `game.css`, and dropped the class itself from the markup
  (`library-components.ts`'s `#library-section`, `revealed-cards-components.ts`'s
  `#revealed-cards-section`). The selector no longer exists anywhere in the app — grep
  confirms it. `/game` no longer offsets the library stack against the commander card at
  all; both now sit at their natural position now that the surround shrank. **The numeric
  coupling didn't get fixed, it got retired** — there is no replacement number to keep in
  sync on either page anymore, so this watch point no longer applies. If a future change
  reintroduces a vertical-alignment need between the library stack and the command zone, it
  starts from zero, not from 22px.

**Editing a duplicated block** (see [architecture.md](architecture.md) for the list)

- Modal styles: `playmat.css` **and** `prepare.css`.
- Flip *container* styles: `game.css` **and** `prepare.css` (still identical).
- Flip *button* styles: `playmat.css` → `.modal-action-button.flip-button` **and**
  `prepare.css` → `.flip-button` — **already
  diverged**; fixing one will not fix the other, and they no longer look alike.
- Library-list styles: `playmat.css` **and** `prepare.css`.
- Prefer deleting the duplicate over editing one copy. If you must edit one, edit both and
  say so.

**Adding or renaming a token** (rewritten 2026-08-07, `4396aea`)

- **Ask first: is it fleet identity or ship chrome?** Fleet identity goes in
  `packages/design-tokens/tokens.css`; a genuinely Shuffler-only value goes in `styles.css`
  `:root`. If you can't tell, it's a design decision — surface it rather than defaulting.
  **A rule the fonts and `--radius-soft` both turned on: if a tldraw shape will need the value,
  it's fleet.** A self-rendering shape passes a *string* from TypeScript — no class, no rule —
  so the alternative to a shared token is the literal retyped into a `.tsx` file where no
  stylesheet convention reaches it.
- **Add and sweep in the same commit** (`f79bc7d`, 2026-08-07). A token nobody uses is just a
  second way to say the same thing — which is the strongest argument *against* adding one, so
  don't hand it to the next reviewer. The 39-literal font sweep was scripted
  (`scripts/sweep-font-literals.sh`) precisely so the substitutions stayed reviewable and a
  stray variant showed up as a leftover instead of being silently missed. **Grep for the literal
  afterwards and expect zero.** The one exception on record is `--radius-soft`, where naming the
  value and sweeping the ~13 sites were split deliberately — because the sweep is a visible
  change to 13 components and the name is not.
- **Never re-declare a shared token in a ship**, not even "as a fallback". A Playwright
  assertion fails if any of them reappears in `styles.css`.
- **Renaming or removing one now breaks two apps silently.** Grep both `apps/` trees, not
  just the Shuffler's CSS.
- **Adding a token to the shared package has a container cost**, and it's already paid — but
  adding a *new* `packages/` workspace does not: every Dockerfile running `npm ci` must COPY
  that workspace's `package.json` first, and any runtime stage needing the files must copy
  `packages/` too or the relative symlink dangles. Fails in the image only.
- Add the swatch to the "Named tokens" grid in `design.ejs` in the same commit. (The chips
  hard-code their hex today — see [architecture.md](architecture.md).)
- Don't create a new `:root` anywhere. There are three in the Shuffler and each has a reason;
  see [architecture.md](architecture.md).

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

- **Read [README.md](README.md) → "tldraw limits" first.** Five rules behave differently on the
  canvas, and four of them are hard limits rather than choices: no Orbitron in the `geo` `font`
  enum (so on-brand canvas text requires a self-rendering shape), the global `:focus-visible`
  rule can't reach a shape (tldraw owns selection indication), a locked shape can never be a
  drop target (so "reacts to what's over it" must be a derived render, not a hook), an
  opaque `image` shape layered over a box hides that box's interior, and (added 2026-08-08)
  **tldraw cannot rotate the view per viewer on a shared board** — every player area is
  upright for everyone, always, which is why the square/compass layout repositions player
  areas without ever rotating them.
- **A self-rendering shape needs its own `toSvg`, or it vanishes from canvas exports.** The cost
  scales with the treatment — gradients, shadows and a webfont all have to be hand-written into
  the SVG. **Budget it inside the option comparison**, not after Jess has picked.
- **Size canvas things in card widths, and use the *right* card.** The Tabletop's card is
  **170 × 238** (`apps/tabletop/DESIGN.md`, 68 units/inch). The Shuffler's CSS card is 200 × 278.
  They are both "the card is the layout unit" and they are **not the same number** — don't cross
  them. **170 is the *default* card, not every card**: players may resize cards
  (aspect-ratio locked), decided 2026-08-07. Derive layout from 170; don't assume every card
  on the board measures it.
- **Don't suppress a card's resize or free-rotate handles** (decided 2026-08-07, ticket 04,
  `3f14d02`). Both stay, deliberately; the board is non-uniform on handles because furniture
  is `isLocked` and cards are not. This owner argued for suppressing resize and was overruled
  — see [README.md](README.md) → "On the canvas, a card keeps its full handle set" before
  reopening it.
- **A card's `indicator()` has no decided appearance.** Styling it away from tldraw's default
  is its own design decision needing its own sign-off — the classic ride-along. If an
  implementation ticket for `mtg-card` reaches you with a custom indicator in it, that's the
  thing to block.
- **The `mtg-counter` shape (life totals / commander damage) has decided placement and
  UNDECIDED appearance** (ticket 12, 2026-08-08). The name-row layout is Jess's verbatim
  dictation — player name large and left-justified, commander-damage counters then a bigger
  life counter right-justified — but font, exact sizes, and colors beyond the sleeve-color
  swatch were **not** decided. Its implementation ticket must consult this owner's `-context`
  before design forms and `-review` on the plan; an appearance arriving fully-formed in that
  ticket is the ride-along to block. "Large" and "bigger" are relative scale facts, not a
  typography decision. The sleeve-color swatch on each commander-damage counter is
  **identity**, not decoration — it must be the opponent's actual sleeve color (ticket 11's
  plumbing), never a palette value this owner picks.
- **The sleeve's rendered appearance has a decided MODEL and an undecided treatment** (ticket
  11, 2026-08-08). The model — solid rectangle a few px larger than the card; face-down cards
  and the library pile render as the bare sleeve rectangle; a face-up sleeved card centers
  its image inside it; unsleeved keeps the standard Magic back — is settled. The treatment —
  exact margin, corner radius (a sleeve is a physical object → real radius, computed in
  TypeScript at render time like all canvas geometry), border/sheen/texture, and the picker's
  swatch palette — is reserved for this owner's `-context`/`-review` at implementation time.
  An `mtg-card` sleeve implementation arriving with those fully formed is the ride-along to
  block. The `sleeveColor` hex itself is **domain data** (player-chosen, like card art) —
  exempt from the stylesheet raw-hex ban; the ban governs values agents pick, not values
  players pick.
- **A canvas shape has a name for its font and its radius now** (`f79bc7d`, 2026-08-07).
  `--font-chrome`/`--font-content`/`--font-display` and `--radius-soft` are in the shared package
  specifically for this case. **Correction: a `.tsx` shape *can* `var()`** — this was written
  when nothing had tried it. `MtgZoneShapeUtil` (ticket 13, 2026-08-08) sets
  `fontFamily: "var(--font-chrome)"` directly in an inline style on a plain div inside
  `HTMLContainer`, and it resolves to Orbitron: `HTMLContainer` is unshadowed DOM, so `:root`
  custom properties reach it the same way they'd reach any other element on the page. **What it
  must not do is retype `"Orbitron", sans-serif` or a bare `4px` as if it were choosing** — that
  part still holds, it's just enforced by writing `var(--font-chrome)` rather than by copying a
  computed value. `mtg-zone` is the first customer, confirmed working; `--radius-soft` on a
  canvas shape is still unexercised.
- **A geometry value meant to look consistent across zoom/resize cannot be a static CSS
  value at all — it has to be computed in TypeScript at render time** (decided 2026-08-07,
  ticket 11, `a304c52`; playmat corner radius). Two wrong framings, in order, worth expecting
  again: **(1)** a literal pixel value (`20px`, ported from the Shuffler's fixed-scale DOM
  pages) drifts out of proportion to the object as the object is resized/zoomed on tldraw's
  continuously-zoomable canvas — a concern that doesn't exist on a page that never zooms.
  **(2)** the seemingly-obvious fix, a bare CSS percentage (`border-radius: 12%`), is *also*
  wrong: percentage border-radius uses width for the horizontal corner and height for the
  vertical one **separately**, so on a non-square box it draws an ellipse, not a round corner.
  **The actual fix**: one radius value, computed from the shape's own height (`props.h`) at
  render time, applied equally to both axes. Not expressible as a static class — a `/design`
  mock can only bake in the already-computed px result to *show* a round corner, which is what
  ticket 11's `.playmat-mock--radius-a`/`-b` do. Expect this same two-step trap for any future
  canvas-shape geometry decision (radius, stroke width, anything meant to hold constant across
  zoom/resize) — a fixed pixel assumes a scale the canvas doesn't have, and a CSS percentage
  silently assumes a square box.
- **Stage Tabletop mocks on `.stage-white`, not `.stage-dark`** (ticket 11, `a304c52`). The
  first draft of the zone/playmat specimens copied `.stage-dark` — the Shuffler's own play-page
  convention — and Jess caught it immediately: the Tabletop's canvas is white. Default to
  `.stage-white` for any Tabletop specimen; don't inherit the Shuffler's own stage by habit.
- **`apps/tabletop` now has the fleet tokens and the fonts** (`4396aea`), so a `var(--deep-space)`
  there resolves and Orbitron loads. What it still lacks is a **stylesheet of its own** — the
  first Tabletop-only rule has nowhere to live, and inline styles are the status quo by inertia.
  See [open-choices.md](open-choices.md) → "Fleet gaps — the Tabletop side" before writing any
  Tabletop CSS, and don't answer the question by starting a `:root` there.
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
