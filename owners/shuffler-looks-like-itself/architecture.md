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
| `styles.css` | **The `:root` tokens.** Global reset, body font, `.mtg-card-image`, error/debug helpers, `.hidden` | every page |
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
- The flip block — `.flip-container-outer/-inner`, `.two-sided-front/-back` — is verbatim
  in **both** `game.css` and `prepare.css`.
- `.library-search-list`, `.library-card-item`, `.card-name-link` are in **both**
  `playmat.css` and `prepare.css` (the prepare copy adds `font-family: "Ovo"`).

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
5. all three candidate focus rings draw a 3px outline.

If you add a stylesheet to the app, add it to `APP_STYLESHEETS` in that spec **and** to
`design.ejs`.
