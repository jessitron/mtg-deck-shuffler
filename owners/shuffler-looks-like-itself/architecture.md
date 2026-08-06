# How the Shuffler's styles are organised

The negotiable part: which file owns what, what loads where, and the traps.

## Two page-building systems, two heads

The Shuffler renders pages two ways, and each has its own `<head>`. **A new stylesheet
must be added to whichever one(s) need it — they do not share a list.**

| | EJS pages | TypeScript pages |
| --- | --- | --- |
| Head | `views/partials/head.ejs` | `formatHtmlHead()` in `src/view/common/html-layout.ts` |
| Always loads | `styles.css`, `site.css` | `styles.css`, `game.css`, `playmat.css` |
| Fonts | Orbitron; `additionalFonts` array adds more | Ovo + Orbitron, hard-coded |
| Extra CSS | `additionalStyles` array per view | `additionalStylesheets` option |
| Pages | `/`, `/docs`, `/about`, `/history`, `/choose-any-deck`, `/prepare`, `/design` | `/game`, error pages |

Note the asymmetry: EJS pages get `site.css` by default and must opt into the playmat
styles; TS pages get the playmat styles by default and never load `site.css`.

Per-view `additionalStyles` today:

- `prepare.ejs` → `playmat.css`, `prepare.css`
- `choose-any-deck.ejs` → `deck-selection.css` (+ fonts Risque, Ovo)
- `docs.ejs`, `about.ejs`, `history.ejs` → `docs.css` (+ font Ovo)
- `index.ejs` → none (+ font Risque)
- `design.ejs` → everything, plus `design-candidates.css` and `design-gallery.css`

## Which file owns which component

| File | Owns | Loaded by |
| --- | --- | --- |
| `styles.css` | **The `:root` tokens.** Global reset, body font, `.mtg-card-image`, error/debug helpers, `.hidden`, `.pushable-flat`, **the global `:focus-visible` ring** (`:200-209`) | every page |
| `site.css` | Site pages: header, footer, hero, slogan, steps, `.button-base` family | every EJS page |
| `playmat.css` | **Shared by game and prepare**: library stack, card/library buttons, command zone, all modal styles, card-type icons, card modal | game (TS) + prepare (EJS) |
| `game.css` | Game page only: `.page-container`, card-move animations, hand, drag-and-drop, hamburger menu, debug blocks | game (TS) |
| `prepare.css` | Prepare page only: playmat grid, commander placeholder, join-table panel | prepare (EJS) |
| `deck-selection.css` | `/choose-any-deck`: precon tiles, search + Archidekt inputs | choose-any-deck |
| `docs.css` | `/docs`, `/about`, `/history`: sidebar + prose layout | those three |
| `design-candidates.css` | **Proposals only.** Nothing in the app loads it | `/design` only |
| `design-gallery.css` | Gallery chrome. Never copy into the app | `/design` only |

**Deciding where a new rule goes:** does it appear on both game and prepare? →
`playmat.css`. One play page only? → that page's file. A site page? → `site.css` (or
`deck-selection.css`/`docs.css` if it's local to those). A new token? → `styles.css`
`:root`, never a second `:root` elsewhere.

## Traps

**Duplicated blocks.** Editing one copy silently leaves the other page unchanged.

- The modal block — `.modal-overlay`, `.modal-dialog`, `.modal-header`, `.modal-title`,
  `.modal-close`, `.modal-body` — is verbatim in **both** `playmat.css` and `prepare.css`.
- The flip **container** block — `.flip-container-outer/-inner`, `.two-sided-front/-back`
  — is verbatim in **both** `game.css:97-133` and `prepare.css:210-244`.
- The flip **button** is a *separate* duplicate, and it has **already diverged**:
  `playmat.css:518` `.modal-action-button.flip-button` carries the choice-1
  `.pushable-flat` box-shadow bevel; `prepare.css:246` bare `.flip-button` is still the
  pre-choice-1 flat control (`border-radius: 5px`, hover recolor to `#f57c00`). They
  agree only on the `#ff9800` fill. Different selectors on different markup — so this
  pair converges by the prepare copy *adopting* the playmat treatment, not by deletion.
- `.library-search-list`, `.library-card-item`, `.card-name-link` are in **both**
  `playmat.css` and `prepare.css` (the prepare copy adds `font-family: "Ovo"`).

**`outline` is globally spoken for.** Since choice 5, `outline` is the focus channel app-wide
(`styles.css:200-209`). Three rules still use it **decoratively**: `site.css:422`
(`.main-footer`, a `--dark-pink` rule), `prepare.css:25` (`.playmat`, its 10px black frame),
and `game.css:458` (`.hand-drop-zone.drag-over`, `2px solid gray`). None of those three is
focusable today, so nothing conflicts — but a decorative `outline` on anything focusable will
be clobbered the moment it takes focus. Use `border` or `box-shadow` for decoration on
anything a keyboard can reach. Only one rule deliberately *tunes* the focus ring:
`playmat.css:173-176` flips the offset to `-3px` on the two full-viewport modal overlays,
because the standard `+3px` would draw outside the viewport and clip to nothing.

**A second `:root`.** `docs.css` re-declares `--deep-space`, `--dark-pink` and
`--light-pink` rather than using the ones from `styles.css`, and adds `--text-light`,
`--link-color`, `--link-hover` that exist nowhere else. Don't add a third.

**Cascade order on `/design`.** The gallery loads every app stylesheet at once, so
conflicting `body` rules (`styles.css` and `game.css` say Ovo, `site.css` says Orbitron)
resolve by load order. The gallery insulates itself: everything is scoped under
`.design-page`, and `.design-page .stage` resets `color: black` so specimens inherit what
they'd inherit in the app rather than the gallery's light-on-dark text.

## The z-index ladder

Documented in a comment in `game.css` and worth keeping:

| Layer | z-index |
| --- | --- |
| Page content, step overlays | 1–3 |
| `.hand-drop-zone` | 10 |
| `.game-menu-panel` | 500 |
| `.modal-overlay` | 1000 |
| `.card-modal-overlay` | 2000 |
| `.card-modal-close` | 2001 |

## The gallery

`/design` (`views/design.ejs`) is the component gallery. Its one architectural rule:
**specimens are rendered by the app's own stylesheets**, never by gallery CSS. That's what
makes it impossible for the gallery to lie about the app.

`design-gallery.css` supplies only the museum around the specimens — labels, option grids,
swatches, and `.stage-*` classes that reproduce each component's native background
(playmat art, purple gradient, white modal interior, `#1e1e1e` menu panel).

`test/verification/verify-design-gallery.spec.ts` protects the arrangement:

1. every declared stylesheet actually returns 200,
2. specimens pick up real app rules (card is 200×278, `.begin-button` border is `outset`,
   playmat buttons are black),
3. every section renders and every `.choice` offers ≥2 options,
4. both candidate buttons actually travel downward when pressed,
5. **the global focus ring reaches the keyboard** — the `#focus` specimens (which carry
   only real app classes, no candidate class) compute to a 3px `rgb(221, 199, 221)` outline
   at 3px offset, so the ring can only be coming from `styles.css`'s global rule.

**Gotcha in that last test:** it **polls** (`expect(...).toPass`) rather than reading the
computed style once. `.group-by-type-toggle` (`playmat.css:235`) carries
`transition: all 0.2s ease`, and `outline-width` is animatable — so an immediate read catches
the ring mid-transition at `1px`, which looks exactly like a missing CSS rule. If you add a
focus assertion to a transitioned element, poll.

If you add a stylesheet to the app, add it to `APP_STYLESHEETS` in that spec **and** to
`design.ejs`.
