# How the Shuffler's styles are organised

The negotiable part: which file owns what, what loads where, and the traps.

**Everything below is the Shuffler.** The owner is fleet-scoped, but the Tabletop has no
architecture to describe yet: `apps/tabletop` has **no CSS source file** (only a built
`dist/client/assets/*.css`), **no `:root`**, and **no font link** — the client's only CSS import
is `import "tldraw/tldraw.css"`. Verified 2026-08-07. So "which file owns this" has no answer
there; see [open-choices.md](open-choices.md) → "Fleet gaps — the Tabletop side". When it
acquires one, this file grows a second half rather than the Shuffler's table growing rows.

**Citations here are file + selector, never `file:NNN`** — see
[README.md → How to cite code in this KB](README.md#how-to-cite-code-in-this-kb-standing-convention-2026-08-07).
Grep the selector.

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
| `styles.css` | **The `:root` tokens.** Global reset, body font, `.mtg-card-image`, error/debug helpers, `.hidden`, `.pushable-flat`, **the global `:focus-visible` ring** | every page |
| `site.css` | Site pages: header, footer, hero, slogan, steps, `.button-base` family | every EJS page |
| `playmat.css` | **Shared by game and prepare**: **the bare `.playmat` rule — the mat's whole shared appearance (art, `background-size`/`-position`, `border: 10px solid black`), filled in by `a4991f3`**, library stack, card/library buttons, command zone, **the deck-title plaque's *appearance* (`.game-title`)**, all modal styles, card-type icons, card modal, the `--mana-*` `:root` | game (TS) + prepare (EJS) |
| `game.css` | Game page only: `.playmat-game` (the mat *at game scale* — layout, 80px radius, `box-shadow`; was `.page-container` until `7487393`), `.game-header-row`, card-move animations, hand, drag-and-drop, hamburger menu, debug blocks, the `--playmat-one`/`--playmat-two` `:root` | game (TS) |
| `prepare.css` | Prepare page only: `.playmat-prepare` (the mat *at prepare scale* — the grid, layout, 20px radius), the bare-`.playmat` placement rules, commander placeholder, join-table panel | prepare (EJS) |
| `deck-selection.css` | `/choose-any-deck`: precon tiles, search + Archidekt inputs | choose-any-deck |
| `docs.css` | `/docs`, `/about`, `/history`: sidebar + prose layout | those three |
| `design-candidates.css` | **Proposals only.** Nothing in the app loads it | `/design` only |
| `design-gallery.css` | Gallery chrome. Never copy into the app | `/design` only |

**Deciding where a new rule goes:** does it appear on both game and prepare? →
`playmat.css`. One play page only? → that page's file. A site page? → `site.css` (or
`deck-selection.css`/`docs.css` if it's local to those). A new token? → `styles.css`
`:root`, never a second `:root` elsewhere.

**Split appearance from placement (2026-08-07).** For a component on both play pages, the
question isn't one file or the other — it's both, with a clean seam. `.game-title` is the
worked example: `playmat.css` declares everything about how it *looks* (fill, border,
padding, font, wrapping) as a **bare class selector**; `prepare.css` (`.playmat >
.game-title`) and `game.css` (`.game-header-row`) each say only where it *sits* on that
page. Before this, the appearance lived in `.cool-command-zone-surround .game-title` — a
descendant selector — and moving the element out of that parent silently unstyled it. Don't
write appearance rules that name an ancestor.

## Traps

**Duplicated blocks.** Editing one copy silently leaves the other page unchanged.

- The modal block — `.modal-overlay`, `.modal-dialog`, `.modal-header`, `.modal-title`,
  `.modal-close`, `.modal-body` — is in **both** `playmat.css` and `prepare.css`. It was
  verbatim until choice 5 (2026-08-06) added `.modal-overlay:focus-visible` to the
  `playmat.css` copy **only** — deliberately, so the duplicate wouldn't grow. That rule
  reaches `/prepare` anyway: prepare loads both sheets, and `:focus-visible` (0,2,0) beats
  `prepare.css`'s plain `.modal-overlay` regardless of load order.
- The flip **container** block — `.flip-container-outer/-inner`, `.two-sided-front/-back`
  — is verbatim in **both** `game.css` and `prepare.css`.
- The flip **button** is a *separate* duplicate, and it has **already diverged**:
  `playmat.css` → `.modal-action-button.flip-button` carries the choice-1
  `.pushable-flat` box-shadow bevel; `prepare.css` → bare `.flip-button` is still the
  pre-choice-1 flat control (`border-radius: 5px`, hover recolor to `#f57c00`). They
  agree only on the `#ff9800` fill. Different selectors on different markup — so this
  pair converges by the prepare copy *adopting* the playmat treatment, not by deletion.
- `.library-search-list`, `.library-card-item`, `.card-name-link` are in **both**
  `playmat.css` and `prepare.css` (the prepare copy adds `font-family: "Ovo"`).

**`outline` is globally spoken for.** Since choice 5, `outline` is the focus channel app-wide
(`styles.css`, grep `:focus-visible`). **Two** rules still use it **decoratively**: `site.css` →
`.main-footer` (a `--dark-pink` rule) and `game.css` → `.hand-drop-zone.drag-over`
(`2px solid gray`). It was three until `a4991f3` moved `.playmat-prepare`'s
`outline: 10px solid black` into the shared `.playmat` rule as a `border` — which shrank the
visible mat 20px in each dimension, because an outline paints outside the box and takes no
space. Neither survivor is
focusable today, so nothing conflicts — but a decorative `outline` on anything focusable will
be clobbered the moment it takes focus. Use `border` or `box-shadow` for decoration on
anything a keyboard can reach. Only one rule deliberately *tunes* the focus ring:
`playmat.css` → `.modal-overlay:focus-visible, .card-modal-overlay:focus-visible` flips the
offset to `-3px` on the two full-viewport modal overlays,
because the standard `+3px` would draw outside the viewport and clip to nothing.

**There are FOUR `:root` blocks, not two** (corrected 2026-08-07 — this file said "don't
add a third" while three extras already existed). `grep -n ':root' public/*.css`:

| File | What's in it | Verdict |
| --- | --- | --- |
| `styles.css` | The token set of record | the one true `:root` — new tokens go here |
| `docs.css` | **Re-declares** `--deep-space`, `--dark-pink`, `--light-pink`, plus `--text-light`, `--link-color`, `--link-hover` that exist nowhere else | drift; on the cleanup list in [open-choices.md](open-choices.md) → "Collapse the second `:root`" |
| `game.css` | `--playmat-one`, `--playmat-two` | legitimate-ish but misplaced — page-scoped tokens in a page sheet |
| `playmat.css` | The closed `--mana-W/U/B/R/G` set | legitimate-ish, same caveat |

**Add nothing to any of them but `styles.css`.** The `game.css`/`playmat.css` pairs are
component-local color sets rather than re-declarations, which is why they've never
conflicted — but a *general* token in a page sheet only reaches the pages that load it,
and that failure is silent.

**The playmat's cascade tie, resolved in opposite directions per page** (added `a4991f3`).
`.playmat` (`playmat.css`), `.playmat-game` (`game.css`) and `.playmat-prepare`
(`prepare.css`) are all a single class — equal specificity — and the two pages load their
sheets in opposite order:

| Page | Load order | Who wins a shared property |
| --- | --- | --- |
| `/game` | `styles.css`, `game.css`, `playmat.css` | the bare `.playmat` rule |
| `/prepare` | `styles.css`, `site.css`, `playmat.css`, `prepare.css` | `.playmat-prepare` |

So the same declaration added to the bare rule takes effect on one page and is ignored on
the other, silently. **Keep each property in the shared rule or in a modifier, never both.**
There's a `CAREFUL` comment on the rule in `playmat.css`; the animations owner independently
found this too, so it is flagged twice on purpose.

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

**Known exception to that rule — `.stage-playmat` is a lookalike, not the mat.** It
hand-copies the art URL, `background-size: cover`, `background-position: center` and its own
`3px solid black` border, so the gallery has been *describing* the playmat in its tables
while *rendering* an imitation. This is the one place the gallery can currently lie about the
app. It only became fixable with `a4991f3`, which created a bare `.playmat` rule worth
inheriting; tracked as `design-playmat-specimen` in the repo-root `TODO.md`. It is gallery
surgery, not a one-line swap — the stage needs a thinner frame at specimen scale.

`test/verification/verify-design-gallery.spec.ts` protects the arrangement:

1. every declared stylesheet actually returns 200,
2. specimens pick up real app rules (card is 200×278, `.begin-button` border-style is
   **`solid`** — choice 1 retired the `outset` bevel; this file said `outset` until
   2026-08-07 — playmat buttons are black),
3. every section renders and every `.choice` offers ≥2 options,
4. both candidate buttons actually travel downward when pressed,
5. **the global focus ring reaches the keyboard** — the `#focus` specimens (which carry
   only real app classes, no candidate class) compute to a 3px `rgb(221, 199, 221)` outline
   at 3px offset, so the ring can only be coming from `styles.css`'s global rule.

**Gotcha in that last test:** it **polls** (`expect(...).toPass`) rather than reading the
computed style once. `.group-by-type-toggle` (`playmat.css`) carries
`transition: all 0.2s ease`, and `outline-width` is animatable — so an immediate read catches
the ring mid-transition at `1px`, which looks exactly like a missing CSS rule. If you add a
focus assertion to a transitioned element, poll.

If you add a stylesheet to the app, add it to `APP_STYLESHEETS` in that spec **and** to
`design.ejs`.

**The gallery cannot currently stage anything from another ship (open, 2026-08-07).** Every
specimen today is a Shuffler component styled by a Shuffler stylesheet. A Tabletop specimen
would need the Tabletop's CSS to be a real stylesheet `/design` can serve — a cross-app
question nobody has answered, and the Tabletop has no stylesheet to serve in the first place.
`.scratch/tabletop-physics/issues/11-what-a-zone-looks-like.md` will be the first to want one.
Two rules for whoever gets there: **a mock built from `design-candidates.css` must be labelled
a mock**, and a canvas specimen must not quietly hide the layering the real canvas has (see
[README.md](README.md) → tldraw limits — the playmat's and library's opaque pictures sit *over*
their zone box, so a flat CSS box misrepresents them).
