# How the Shuffler's styles are organised

The negotiable part: which file owns what, what loads where, and the traps.

## The one thing that is not the Shuffler's: `packages/design-tokens`

**The fleet's shared tokens live outside both ships** (`4396aea`, 2026-08-07).
`packages/design-tokens/tokens.css` (`@fleet/design-tokens`, a workspace — `packages/*` is in
the root `workspaces` glob) holds the identity palette, `--narrow-border`, `--mana-*`, the three
type roles `--font-chrome`/`--font-content`/`--font-display`, and `--radius-soft` (the last five
added `f79bc7d`, 2026-08-07). Two delivery paths for one file:

| Ship | How it arrives | Consequence |
| --- | --- | --- |
| Shuffler | `app.ts` mounts `express.static` at **`/fleet`**, resolved via `import.meta.resolve("@fleet/design-tokens/tokens.css")` — *not* by walking up from `__dirname`, because the depth differs between dev and container | the file must exist at **runtime**; a 404 here strips every page's colours |
| Tabletop | `import "@fleet/design-tokens/tokens.css"` in `src/client/main.tsx` | Vite **inlines** it into the client bundle; needed at build time only |

**Three container facts, all prod-only, all learned by building and curling the image:**

- **Both Dockerfiles use the repo root as build context** (npm workspaces keeps the lockfile
  there). That predates this change; it's what makes `COPY packages/…` possible at all.
- **Every workspace in the glob needs its `package.json` COPYed before `npm ci`**, or the
  install fails outright. Both Dockerfiles now do.
- **The Shuffler's runtime stage flattens the workspace** (`/repo/apps/shuffler` → `/app`), and
  npm links workspaces as **relative** symlinks
  (`node_modules/@fleet/design-tokens → ../../packages/design-tokens`). So the runtime stage
  must `COPY --from=builder /repo/packages ./packages` or the link dangles. **`verify-container-boot.sh`
  would not catch that**: `import.meta.resolve` doesn't check the file exists, so the server
  boots happily and only the route 404s. The Tabletop copies `packages/` into its runtime stage
  too — unnecessary today (Vite already inlined it), deliberately, so the link doesn't dangle
  for the next thing that reaches for it.

**The Tabletop still has no stylesheet of its own.** It has tokens and fonts now, but no CSS
source file — so "which file owns this component" still has no answer there, and the first
Tabletop-only rule has to decide it. See [open-choices.md](open-choices.md) → "Fleet gaps".

**Everything below is the Shuffler.**

**Citations here are file + selector, never `file:NNN`** — see
[README.md → How to cite code in this KB](README.md#how-to-cite-code-in-this-kb-standing-convention-2026-08-07).
Grep the selector.

## Two page-body systems, ONE page shell (unified 2026-08-08, `b268414`)

The Shuffler renders page *bodies* two ways (EJS templates, TS functions), but every
page's `<head>` now comes from **one place**: `formatHtmlHead(options)` in
`src/view/common/html-layout.ts` — `options: {title, stylesheets?, additionalFonts?,
scriptsHtml?}`. The skeleton, in fixed order: meta charset + viewport, **escaped** title
(`escapeHtml` inside the shell — deck names come from Archidekt), font preconnects + one
Google Fonts `<link>` (Orbitron always, plus `additionalFonts`), **`/fleet/tokens.css`
FIRST**, `/styles.css`, then `options.stylesheets` in the order given, then
`/browser-tab-id.js`, `/hny.js`, the guarded `Hny.initializeTracing` block, then
`options.scriptsHtml` verbatim (commented "trusted HTML only" — never interpolate
user-supplied data into it).

Two routes into the shell:

| | EJS pages | TypeScript pages |
| --- | --- | --- |
| Route in | `views/partials/head.ejs` — a **thin adapter** calling `app.locals.formatHtmlHead` (wired in `src/app.ts` next to the view-engine setup) | `formatPageWrapper` calls `formatHtmlHead` directly |
| Adapter/caller adds | prepends `/site.css` to `locals.additionalStyles`; converts `locals.script` to a deferred script tag | `stylesheets: ["/playmat.css", "/game.css", ...]` (order deliberate — cascade tie, inline comment says so), `additionalFonts: ["Ovo"]`, `scriptsHtml = GAME_HEAD_SCRIPTS_HTML` (htmx.js, the 409/502 `responseHandling` config, game.js, modal-query-params.js) |
| Per-page CSS | `additionalStyles` array per view — the EJS-facing name is unchanged | `additionalStylesheets` option on `formatPageWrapper` |
| Pages | `/`, `/docs`, `/about`, `/history`, `/choose-any-deck`, `/prepare`, `/design` | `/game`, debug load-state, error pages |

The old asymmetry stands, but it's now expressed as **adapter defaults**, not duplicated
skeletons: EJS pages get `site.css` (the adapter is the one spot that adds it — `site.css`
must never reach `/game`; `/prepare` still gets it, deliberately not tidied in the
unification), TS pages get the playmat sheets. Three fixes rode along, all owner-reviewed
and deliberate: EJS pages gained meta charset + viewport (changes phone rendering — 375px
screenshots of `/` and `/prepare` were taken and look sensible); `/game`'s tracing init
gained the `window.Hny && window.browserTabId` guard the EJS head already had; `/game`'s
duplicate `htmx:configRequest` listener was deleted (browser-tab-id.js already registers
one).

**`/fleet/tokens.css` is first, and that can no longer diverge between page families** —
every `var()` in every sheet depends on it. The cheap jest test survived the seam
(`test/html-layout-fleet-tokens.test.ts`, retitled "the one page shell links the fleet
palette"): tokens before `styles.css`, page sheets after both in the given order, Orbitron
always, `additionalFonts`, and title escaping. It remains the cheap gate for the `/game`
path (reaching a play page in Playwright needs a whole game set up); the EJS/adapter path
is covered in the browser by `verify-fleet-tokens.spec.ts`.

Per-view `additionalStyles` today:

- `prepare.ejs` → `playmat.css`, `prepare.css`
- `choose-any-deck.ejs` → `deck-selection.css` (+ fonts Risque, Ovo)
- `docs.ejs`, `about.ejs`, `history.ejs` → `docs.css` (+ font Ovo)
- `index.ejs` → none (+ font Risque)
- `design.ejs` → everything, plus `design-candidates.css` and `design-gallery.css`

## Which file owns which component

| File | Owns | Loaded by |
| --- | --- | --- |
| `packages/design-tokens/tokens.css` | **The fleet's shared tokens** — identity palette, `--narrow-border`, `--mana-*`, the three type roles, `--radius-soft`. Not a Shuffler file | every page of **both ships** |
| `styles.css` | Global reset, body font, `.mtg-card-image`, error/debug helpers, `.hidden`, `.pushable-flat`, **the global `:focus-visible` ring**, and a `:root` holding only `--background-color` | every page |
| `site.css` | Site pages: header, footer, hero, slogan, steps, `.button-base` family | every EJS page |
| `playmat.css` | **Shared by game and prepare**: **the bare `.playmat` rule — the mat's whole shared appearance (art, `background-size`/`-position`, `border: 10px solid black`), filled in by `a4991f3`**, library stack, card/library buttons, command zone, **the deck-title plaque's *appearance* (`.game-title`)**, all modal styles, card-type icons, card modal | game (TS) + prepare (EJS) |
| `game.css` | Game page only: `.playmat-game` (the mat *at game scale* — layout, 80px radius; **no `box-shadow`**, removed 2026-08-10, the mats are fully converged; was `.page-container` until `7487393`), `.game-header-row`, card-move animations, hand, drag-and-drop, hamburger menu, debug blocks, the `--playmat-one`/`--playmat-two` `:root` | game (TS) |
| `prepare.css` | Prepare page only: `.playmat-prepare` (the mat *at prepare scale* — the grid, layout, 20px radius), the bare-`.playmat` placement rules, commander placeholder, join-table panel, **the table-look picker (`.table-look-panel` block at the end of the file, ticket 16 — markup in `views/partials/table-look-panel.ejs`, included by `views/partials/playmat-prepare.ejs`; behaviour is pure HTMX plus `public/table-look-focus.js` for keyboard-focus restoration, since `cabf85b` 2026-08-09 — `prep-picker.js` no longer exists)** | prepare (EJS) |
| `deck-selection.css` | `/choose-any-deck`: precon tiles, search + Archidekt inputs | choose-any-deck |
| `docs.css` | `/docs`, `/about`, `/history`: sidebar + prose layout | those three |
| `design-candidates.css` | **Proposals only.** Nothing in the app loads it | `/design` only |
| `design-gallery.css` | Gallery chrome. Never copy into the app | `/design` only |

**Deciding where a new rule goes:** does it appear on both game and prepare? →
`playmat.css`. One play page only? → that page's file. A site page? → `site.css` (or
`deck-selection.css`/`docs.css` if it's local to those). A new token? → **fleet identity goes in
`packages/design-tokens/tokens.css`**; a genuinely Shuffler-only value goes in `styles.css`
`:root`. Never a new `:root` anywhere else, and never re-declare a shared token in a ship.

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

**There are THREE `:root` blocks in the Shuffler, and the authoritative one is not among
them** (was four; corrected 2026-08-07 after `4396aea` + `a8e2427`).
`grep -n ':root' public/*.css ../../packages/design-tokens/tokens.css`:

| File | What's in it | Verdict |
| --- | --- | --- |
| `packages/design-tokens/tokens.css` | identity palette, `--narrow-border`, `--mana-W/U/B/R/G`, `--font-chrome`/`--font-content`/`--font-display`, `--radius-soft` | **the one true `:root`** — shared tokens go here, and it isn't in this ship |
| `styles.css` | `--background-color` only | Shuffler-only site chrome; fine |
| `docs.css` | `--text-light`, `--link-color`, `--link-hover` | **no longer a re-declaration** — the three shared tokens it copied were deleted in `a8e2427`. These three are genuinely docs-only |
| `game.css` | `--playmat-one`, `--playmat-two` | **deliberately left behind**, not overlooked — whether the playmat colours are the fleet's is buoyed as `playmat-colours-fleet-or-shuffler` |

`playmat.css` no longer has a `:root`; the `--mana-*` set moved into the package (a closed set
of domain vocabulary, so every ship tinting by colour identity uses the same five).

**Never re-declare a shared token in a ship's `:root`.** They are not mirrored anywhere on
purpose: a "fallback" copy is a second dictionary, and it turns a broken load — loud and
obvious — into a silent near-miss. A Playwright assertion enforces this for `styles.css`.
The old warning still holds for anything else: a *general* token in a page sheet only reaches
the pages that load it, and that failure is silent.

**The playmat's cascade tie — RESOLVED 2026-08-07 (`63d4c08`), as a side effect of an
unrelated appearance commit.** `.playmat` (`playmat.css`), `.playmat-game` (`game.css`) and
`.playmat-prepare` (`prepare.css`) are all a single class — equal specificity — so who wins
a shared property depends entirely on load order:

| Page | Load order | Who wins a shared property |
| --- | --- | --- |
| `/game` | `styles.css`, `playmat.css`, `game.css` | `.playmat-game` |
| `/prepare` | `styles.css`, `site.css`, `playmat.css`, `prepare.css` | `.playmat-prepare` |

**Both pages now load `playmat.css` before their own modifier sheet.** `/game` used to load
`game.css` then `playmat.css` (`html-layout.ts` → `formatHtmlHead()`); the commit "Jess
updates appearance" swapped that to `playmat.css` then `game.css`, originally with no
comment noting why. **Since the shell unification (`b268414`, 2026-08-08) the order lives
in `formatPageWrapper`'s `stylesheets` argument, with an inline comment stating it's
deliberate** (equal-specificity cascade tie resolved by load order). `/prepare`'s order (`prepare.ejs`'s `additionalStyles`:
`['/playmat.css', '/prepare.css']`) was already this way and is unchanged. **The upshot: a
property added to the bare `.playmat` rule is now overridden by the page modifier on both
pages, identically** — the old hazard, where the same declaration took effect on one page
and was silently ignored on the other, no longer exists. The `CAREFUL` comment that used to
sit above `.playmat` explaining the old hazard was deleted in the same commit — correctly,
since it no longer applies. **Still true regardless:** keep each shared-mat property in the
shared rule or in a modifier, never both — that's good hygiene independent of load order,
and if a future change reintroduces divergent load order, the hazard returns.

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
**No longer blocking anything real (2026-08-10):** it used to gate `playmat-drop-shadow`
(the gallery couldn't stage a shadow choice on a fake mat); that question is now closed by
Jess removing the shadow outright, so this item stays open purely for general
gallery-fidelity reasons, not because something else depends on it.

**Second, smaller exception — the *colour* swatches still hard-code their hexes.** Each
`.swatch-chip` in the "Named tokens" grid carries `style="background: #221534"` rather than
`var(--deep-space)`, so the grid *describes* the palette instead of *rendering* it. Harmless
while the values are right, but it means the grid would keep showing the brand colours even if
`/fleet/tokens.css` 404'd. The spec's stylesheet-200 assertion is what covers that today;
switching the chips to `var()` would make the grid self-checking. Noted, not done.

**The equivalent gap in Typography is CLOSED (2026-08-07, with `f79bc7d`).** The four type
specimens used to be inline `font-family: 'Risque', cursive` literals — describing the palette,
exactly like the swatch chips. They now read `var(--font-display)` / `var(--font-chrome)` /
`var(--font-content)` and each `type-meta` names its token, so the section fails visibly if the
shared sheet doesn't load. **This is the pattern for finishing the swatch chips**: a `var()` swap
is not an appearance change when the token's value is the literal it replaces. `monospace` stays
a literal in the fifth row on purpose — it's a genuine one-off with no token.

**`design-gallery.css` uses the type tokens, and that is deliberate, not a leak.** The rule
"gallery chrome must never be copied into the app" is about *components* — `.badge`, `.stage-*`,
`.option-label` have no business in the app. Consuming the fleet's shared dictionary runs the
other way: the gallery renders specimens, and gallery chrome set in a foreign typeface would make
the museum look unlike the fleet it exhibits. Same for `design-candidates.css`, whose whole
purpose is to stage things that will become app CSS. **Take tokens from the fleet; don't give
selectors to the app.**

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
`design.ejs`. `/fleet/tokens.css` is in that list as of the token move — it arrives through
`head.ejs` rather than `design.ejs`'s `additionalStyles`, and the spec asserting it returns 200
is what would catch the container symlink trap on the one page whose swatches *describe* those
values.

**The gallery has its first Tabletop specimens, and they are mocks, not the cross-app answer
(2026-08-07, `a304c52`, ticket 11).** The § Tabletop zones section (between `#cards` and
`#rules`) stages five zone/playmat decisions using `design-candidates.css` classes and the
shared fleet tokens — but the Tabletop still has no stylesheet of its own, so this did **not**
answer "can `/design` serve a real Tabletop stylesheet." It answered the narrower, sufficient
question: a mock built entirely from shared tokens is honest enough to decide by. **Two rules
this mock followed, now precedent for the next one:** it's labelled a mock in its own
`section-note` rather than presented as the real component, and it's scoped to the
**unpictured** zones (graveyard, exile, Stack, command) rather than pretending to show the
library/playmat, whose opaque picture layer a flat CSS box can't represent (see
[README.md](README.md) → tldraw limits). **A second precedent, easy to get wrong by default:**
stage Tabletop specimens on `.stage-white`, not the Shuffler's own `.stage-dark` — the first
draft here copied `.stage-dark` and Jess caught it immediately (the Tabletop's canvas is
white). The cross-app "real Tabletop stylesheet on `/design`" question remains open for
whichever ticket needs to render actual Tabletop CSS, not a mock.

**§ `#table-look` — the table-look picker's specimen (2026-08-09, ticket 16, `8995c1a`).**
"Table look picker", badge **standard** (not a mock — the panel is a shipped Shuffler
component and `/design` loads `prepare.css`), staged on `.stage-playmat` because the panel
lives on the mat. Shows a selected mat swatch, the None chip, two mana chips, and the custom
color input. It follows the static-specimen convention: the *rules* come from the real
`prepare.css` classes, but the markup and the inline values (swatch `background-image` URLs,
mana hexes, the `#bb5277` input default) are hand-copied from
`views/partials/table-look-panel.ejs` — if the partial's structure or the palette in
`src/table-look.ts` changes, visit the specimen. What a static specimen can't show: the actual
pick (`cabf85b`, 2026-08-09, converted this from a live JS preview to a full HTMX round-trip —
a real `hx-post`, a persisted pick, and a re-rendered `#playmat-prepare` fragment — mat art swap,
sleeve tint on the surround and plaque, and the focus restoration `table-look-focus.js` does
after the swap).

**Second Tabletop mock section: § `#counter-disc` (2026-08-08, tabletop-physics ticket 18).**
"Tabletop counter disc", badge `candidate`, staged on `.stage-white` — three `.counter-mock`
specimens (`design-candidates.css`) mirroring the inline treatment in
`MtgCounterShapeUtil.tsx` (the `.hand-count` recipe, 44px). Both mock precedents were
followed: labelled a mock in its own `section-note`, staged white. It follows the same
inline-`CSSProperties` reality as `mtg-zone` — the real look lives in the shape's `.tsx`, so
the mock hand-mirrors it and can drift; the section-note names the real file. **Known,
accepted drift since the 2026-08-08 shrink-to-fit follow-up:** the mock's `font-size: 14px`
is the *base* size only — the real shape shrinks long labels to fit
(`counterTextFit.ts` — the minimal estimate-based version; the circle-aware chord-wrapping
one was reverted the same day, see [history.md](history.md)); the `.counter-mock` comment
says so. A static specimen can't show the shrink. Awaiting Jess's sign-off — see
[open-choices.md](open-choices.md).

**Third Tabletop mock section: § `#sleeved-card` (2026-08-10, `design-sleeve-specimen`,
`9e23201`).** "Tabletop sleeved card", badge `candidate`, staged on `.stage-white` —
`.card-mock-sleeved-face` (`design-candidates.css`) mirrors the face-up `sleeve && !faceDown`
branch of `MtgCardShapeUtil.tsx`: a card image centered in a sleeve-colored square frame, sized
to the Tabletop's own 170×238 card unit. Same two mock precedents followed as the zone and
counter-disc sections: labelled a mock in its own `section-note`, staged white. `sleeveColor`
is an inline `style="background-color: …"` on the specimen markup, same posture as the
Shuffler's own `.library-card-back.sleeved` mock — it's player-chosen data, not a value to bake
into the shared class. Closes the gap `design-sleeve-specimen` in the repo-root `TODO.md`
tracked; that entry is now gone.
