---
name: shuffler-looks-like-itself
kind: capability
scope: fleet
---

# The Shuffler looks like itself

*(The slug predates the fleet scope. The charge is now fleet-wide: Shuffler and
Tabletop are one app with two faces, and they should feel like the same app.)*

**The charge:** when someone adds UI anywhere in the fleet, the result looks like it was
always there. New buttons, panels, fields and states adopt the fleet's existing design
language instead of importing a foreign one.

This is a **capability**, not a feature. No single screen breaks when it lapses — the
app just gets a little less like itself, one button at a time, until it reads as a pile
of widgets from four different design systems. That's the failure mode this owner exists
to prevent, and it's a slow one: every individual violation looks reasonable in
isolation.

## Two layers (established 2026-08-06, Jess's call)

**Layer 1 — craft. Fleet-wide, enforceable everywhere, today.** Ship-agnostic rules
about doing UI *well*, independent of any aesthetic: text has breathing room beneath it;
things that should align, align; colors and spacing come from tokens, not literals;
every interactive element has a visible `:focus-visible` state (**the Shuffler now
satisfies this with one global rule — see the design language below; that's the pattern
for the Tabletop to copy, not a per-component chore**); no raw
Material/Bootstrap hex ever. These apply to the Tabletop right now, even before it has
an identity. The mechanically checkable subset is being turned into a script
(`.scratch/design-lint/issues/01-design-lint-script.md`) — the owner guards the
judgment-required rest.

**Layer 2 — identity. One identity, shared across ships.** Jess wants the Shuffler and
Tabletop to *feel like the same app* — not sibling apps with separate faces. The
identity below ("The design language") was won on the Shuffler and is described from it,
but it is the fleet's identity: when the Tabletop gets its design pass, it pulls toward
these same tokens, typefaces, and shapes. Two honest caveats:

- **Some components are ship-specific.** The playmat as the Shuffler dresses it is the
  Shuffler's; the tldraw canvas is the Tabletop's. Shared identity ≠ identical screens.
  (The Tabletop has playmats too — one per seat — but they're tldraw-rendered, not CSS.)
- **tldraw constrains.** The Tabletop is built on tldraw, which owns much of its own
  chrome and rendering. Where tldraw limits a rule (fonts inside the canvas, its
  built-in UI), record the limit here rather than fighting it or silently dropping the
  rule.

**Promotion path:** rules start where they're proven (usually the Shuffler) and get
promoted to fleet-wide as the other ships adopt them. When a rule below is
Shuffler-only, it says so; absence of a marker means it's aspiration for the fleet.

The Tabletop today has hit "can't implement anything else until it has a design
identity" (Jess, 2026-08-06). Its design pass should start from this identity — tokens
and typefaces first — not from a blank page, and its findings come back into this KB.

**It now has somewhere to start from — half of it (resolved 2026-08-07, `4396aea`).** The
Tabletop used to have no CSS source file and no font link at all, so a `var(--…)` resolved to
nothing and Orbitron fell back to a system serif, both silently. That is closed: the fleet's
shared tokens live in **`packages/design-tokens/tokens.css`** (`@fleet/design-tokens`), imported
by the Tabletop through Vite and served by the Shuffler at `/fleet/tokens.css`; Orbitron and Ovo
load from a Google Fonts `<link>` in `apps/tabletop/index.html`. The tokens **moved** — they are
not mirrored in any ship's `:root` — which was this owner's non-negotiable and is why the
`docs.css` re-declaration went too.

**What is still missing: a ship-local stylesheet on the Tabletop.** Shared tokens have a home;
the first *Tabletop-only* rule does not, so inline styles remain the default by inertia rather
than by choice. Whoever writes that rule decides where Tabletop CSS lives. See
[open-choices.md](open-choices.md) → "Fleet gaps — the Tabletop side".

## tldraw limits — recorded, not fought (2026-08-07)

Layer 2 says to write these down rather than silently dropping a rule. The first four were
found while `.scratch/tabletop-physics/issues/03-what-furniture-is.md` decided that Tabletop
furniture becomes a custom `mtg-zone` shape; later work keeps adding to the list (dates on
each).

- **tldraw's `geo` `font` prop is an enum with no Orbitron in it.** So a stock `geo` label
  can *never* be on-brand — today's `serif` zone labels aren't a design choice, they're the
  enum. **The stock `text` shape had the same enum** (confirmed 2026-08-08, ticket 15: the
  seat name label's `font: "serif"` and `color: "green"` were enum values, not choices). This
  is the strongest design argument for a custom shape, and it generalizes: **any
  text the fleet wants on a canvas in a fleet typeface has to come from a self-rendering
  shape.** **The seat/deck label stopped being that stock `text` example on 2026-08-12
  (`96551ef`, `mtg-title`) — see the seat-name-label paragraph below.** It is now a
  self-rendering `BaseBox` shape, so it *could* be on-brand, but the change deliberately
  **reproduced the old off-brand stock look** (green `#099268`, `Georgia` serif) as raw
  literals rather than going on-brand — the mechanism moved, the appearance decision did not.
  So the enum values that used to be "not a choice" are now raw literals reproducing what the
  enum rendered; the on-brand version is the unratified decision still owed to Jess. **Confirmed working, not just argued, 2026-08-08** (tabletop-physics ticket 13):
  `MtgZoneShapeUtil`'s `component()` sets `fontFamily: "var(--font-chrome)"` on a plain `div`
  inside `HTMLContainer`, and it resolves to Orbitron — checked both by reading the DOM's
  computed `font-family` in a live browser and by screenshot. `HTMLContainer` is an
  unshadowed div, so the `:root` custom properties from `main.tsx`'s
  `@fleet/design-tokens/tokens.css` import reach it by ordinary CSS inheritance, no special
  plumbing required. This is the first fleet-token consumer inside a genuine self-rendering
  canvas shape — the mechanism was designed for exactly this case (`f79bc7d`) but had never
  been exercised until now. See [history.md](history.md) for the verification detail.
- **Layer 1's focus rule cannot reach a canvas shape — literally true of the global CSS rule,
  but not the end of the story.** The global `:focus-visible` rule is DOM-only, and tldraw owns
  selection indication for shapes. Where the shape's own "focus" is tldraw's ephemeral editing
  state (double-click to edit, gone when you click away), that's a genuine exemption from
  "every interactive element gets a visible focus state," not an oversight — say so out loud
  instead of inventing a shape-level ring that would fight tldraw's. **First shipped instance
  of the exemption (2026-08-08, ticket 18):** `MtgCounterShapeUtil.tsx`'s in-place editing
  `<textarea>` (an `<input>` until the 2026-08-08 shrink-to-fit follow-up made long labels wrap
  while editing) carries a literal `outline: none`, with a comment naming this exemption. That
  is the one sanctioned `outline: none` in the fleet — it's a canvas shape, the Shuffler's ban
  ("never write `outline: none`", choice 5) governs DOM pages, and tldraw owns focus/selection
  indication here. A design-lint sweep must not "fix" it, and it is not precedent for writing
  one in any stylesheet.
  - **Second instance, and it goes the other way (2026-08-10, table-layout ticket 20):**
    `MtgLifeCounterShapeUtil.tsx`'s +/- buttons and typeable input are **persistent, always-live
    DOM controls**, not tldraw's ephemeral editing state — nothing about them is exempt from
    "every interactive element gets a visible focus state." Since the Tabletop still has no
    ship-local stylesheet and never loads `styles.css`, the global rule can't reach them by
    inheritance the way it does on the Shuffler. The shape reproduces choice 5's exact decided
    values (`3px solid var(--light-pink)`, `outline-offset: 3px`) verbatim via a scoped inline
    `<style>` tag inside its own `HTMLContainer`, targeting `.mtg-life-counter-btn`/
    `.mtg-life-counter-input`. **This is not a new focus treatment and not a second
    `outline: none` exemption** — it's the same decided rule, duplicated because the delivery
    mechanism (a global stylesheet rule) can't reach this canvas surface, the same "duplicated
    because the mechanism can't reach it" shape as the fonts and `--radius-soft` tokens. If the
    Tabletop ever gets a ship-local stylesheet, this is a candidate to fold into it rather than
    leave as a one-off inline `<style>` per shape.
- **A locked shape can never be a drop target.** `Editor.getDraggingOverShape`
  (`Editor.ts`, currently around `:6571-6585`) filters `!s.isLocked` **before** it checks
  whether a util defines `onDragShapesOver`/`onDropShapesOver`, and there is no
  `canMove`/`canDrag`/`canTranslate` on `ShapeUtil` — `isLocked` is tldraw's only shape-level
  brake. Furniture is locked on purpose (Jess: locked by default so she doesn't move it by
  accident, unlockable via the context menu on purpose), so **any "this furniture reacts to
  what's over it" treatment has to be a derived render** (`useValue` over the shapes being
  translated), never a hook writing a prop. That's also better hygiene: the hooks fire every
  frame, so a prop-writing version means per-frame writes to a synced document plus an undo
  trail.
- **An opaque picture layered over a zone box hides that box's interior — now true of only
  the library, not the playmat (narrowed 2026-08-11, playmat-image-radius).** This used to
  cover both: the playmat's and library's *pictures* were separate stock `image` shapes on
  top of the `mtg-zone` box, so border, interior tint and inset shadow were invisible for
  both. **The playmat's picture is no longer a separate shape at all** — `MtgZoneShapeUtil`'s
  own `component()` renders it as an absolutely-positioned `<img>` *inside* the same div, so
  the playmat box's interior is no longer hidden by an overlay — there is no overlay, the
  picture is a child of the box. **The border moved from the box onto the `<img>` itself
  (2026-08-11, same day, Jess's follow-up)** — it was first drawn on the container div with the
  image clipped to match, which worked but left border and image as two separately-sized/
  positioned boxes that could drift apart; Jess noticed the mismatch, so `border: "10px solid
  black"` and `borderRadius: h * 0.05` (same untokenized-on-purpose values as before) now live
  directly on the `<img>` (`boxSizing: "border-box"`), so the border hugs the actual rendered
  artwork edge exactly. **When there's no `imageUrl` yet** (a playmat with no image assigned —
  `playmatImageUrl` is optional, `seatJoined.ts`), the container div falls back to the old
  plain bordered empty box — Jess's explicit call, "keep a placeholder border" over "truly
  empty," so the zone still reads as a placeholder rectangle. The armed-glow `box-shadow` (see
  ticket 14 below) is unaffected by either branch: it's still set on the container div, which
  is the same size in both cases, so the ring traces the same rectangle regardless of whether
  an image is present. **The library's card-back picture is
  unchanged** — still a separate stock `image` shape layered on top of the `mtg-zone` box, so
  this limit (and the "any armed treatment must read as outward" consequence below) still
  governs it alone. Any "armed" or "about to receive" treatment for the library must still read
  as an **outward** effect — which rules out the app's one existing armed pattern
  (`.hand-drop-zone.drag-over`'s "restate the boundary + tint the interior") for that zone. A
  pure-CSS `/design` specimen of the library will still hide this; include a stand-in image
  layer or scope the specimen to the unpictured zones and say so. **Confirmed in the built
  shape, not just argued (2026-08-08, ticket 14).** `MtgZoneShapeUtil`'s armed treatment is a
  `box-shadow` ring, which spreads outward from the border edge rather than being drawn inside
  it — so it rides on top of the library's opaque black border and (per this rule) would
  survive an image overlay the same way. Screenshot-verified the ring shows. (At the time this
  was confirmed, the same reasoning was cited for the playmat too — that citation is now stale
  for the playmat specifically, since there's no separate image shape left to ride on top of.)
- **tldraw's `.tl-image` class escapes any intermediate wrapper — a frame around an image
  must style its `<img>` directly.** `.tl-image` is `position: absolute; inset: 0`
  (tldraw.css), anchored to `.tl-image-container` — so an `<img className="tl-image">`
  placed inside a padded frame div ignores the padding entirely and fills the container,
  making the frame invisible. Found by ticket 17's sleeve ring (2026-08-08): the sleeved
  branch of `MtgCardShapeUtil` shipped with the class reused "rather than reinventing it,"
  the ring didn't render, and the fix (`bfdc877`) drops the class and sets
  `display: block; width/height: 100%` on the img itself. Caught only by a live-browser
  screenshot (`.scratch/tabletop-table-layout/verify-17-sleeved-card.png`) — the DOM and
  the build both looked fine. Reuse `.tl-image-container` for its `pointer-events: all`;
  do **not** reuse `.tl-image` on an img you intend to wrap.
- **tldraw cannot rotate the view per viewer on a shared board.** Reconfirmed 2026-08-08
  (`.scratch/tabletop-table-layout/issues/10-the-square.md`), same posture as Mural — "Mural
  doesn't rotate either." This is a hard platform limit, not a deferred nicety: every player
  area on the Tabletop stays upright and unrotated in world space, for everyone, always. A
  design that wants "my mat faces me" (the physical-table framing Jess keeps returning to)
  cannot have it without the canvas in an iframe or similar — out of scope for this fleet.
  Consequence recorded in `apps/tabletop/DESIGN.md` → "The square": seats can move into
  compass slots (N/E/S/W) around a centered Stack, but a wide-short player-area rectangle
  parked at an E/W slot reads "sideways" rather than rotating to face the Stack — an accepted
  cosmetic quirk, not a bug, until (if ever) this limit lifts.
- **tldraw's toast system renders with its own default visual treatment, not the fleet's
  identity — recorded, not fought (2026-08-12).** `useToasts().addToast()`
  (`TablePage.tsx`'s `COPY_DISABLED_TOAST`, the "copy doesn't work here, use duplicate
  instead" hint) is the fleet's first toast. It renders through tldraw's own
  `.tlui-toast__container` chrome — generic sans font, tldraw's own color tokens — because
  restyling it would be the Tabletop's *first* ship-local CSS rule, and where that CSS
  should live is still the open question. See [open-choices.md](open-choices.md) → "Fleet
  gaps — the Tabletop side". Accepted as a known visual gap, not silently normalized as the
  standard; revisit once the ship-local-stylesheet question resolves.

## Why this owner exists

The Shuffler has a real, specific, coherent aesthetic — and it is almost entirely
**unwritten**. It lives in Jess's head and in the CSS, and nowhere else.

That's a problem for agents specifically. An agent adding a button does what looks
reasonable: it greps the CSS for a precedent. What it finds is **57 distinct hex
values** across 2,772 lines, of which only a handful are named tokens. The rest is
Material Design and Bootstrap defaults that arrived one feature at a time — so the
statistically obvious "precedent" is exactly the thing that's wrong. Each new agent
samples the drift and adds to it. That's how the app got seven rainbow Material buttons
in the card modal.

So the job isn't to invent a design system. It's to **name the coherent thing that's
already there**, and stop the drift from replicating.

## The design language

The things that are genuinely consistent today, and that new UI must match:

**Three typefaces, with distinct jobs — and they are named by ROLE, not by face
(2026-08-07, `f79bc7d`).** `--font-chrome` (Orbitron, geometric sans) for chrome — nav,
buttons, headings, form labels and fields, the game title slab. `--font-content` (Ovo,
serif) for content — prose and **card names specifically**; a card name is content, not
chrome. `--font-display` (Risque, display cursive) only for the big splashy words on the
site pages, never on the play pages. There is no fourth typeface.

- **Write the role token, never the face.** `font-family: var(--font-chrome)`, not
  `font-family: "Orbitron", sans-serif`. All 39 literals across the Shuffler's nine
  stylesheets were swept onto the tokens in the same commit that added them — deliberately,
  because a token nobody uses is just a second way to say the same thing, which was the main
  argument *against* having one. The only surviving `font-family` literals in the CSS are
  `monospace` (debug blocks) and `inherit`; both are genuine one-offs.
- **The role is the stable name and the face is the detail.** If Ovo were ever replaced, the
  word "content" would still be true. Three faces with fixed jobs is exactly the situation
  where role names hold.
- **The canvas is the reason these are tokens and not a convention.** A self-rendering
  tldraw shape passes a font *string* from TypeScript — there is no class to hang a rule on
  — so without a name here, the literal gets retyped into a `.tsx` file where no
  stylesheet-level convention can reach it. Same argument as `--radius-soft`.

**Purple and pink, from tokens — and the tokens are the fleet's, not the Shuffler's
(2026-08-07, `4396aea`).** `--deep-space` (#221534) for bars and dark surfaces,
`--dark-pink` (#bb5277) for borders/rules/accents, `--light-pink` (#ddc7dd) for bevels
and slabs, `--cute-heading-color` (#9134d2), `--narrow-border` (3px), the closed
`--mana-W/U/B/R/G` set, the three type roles above, `--radius-soft` (4px), and
`--armed-glow` (#e6a33d, decided 2026-08-07 ticket 11, built 2026-08-08 ticket 14 — a Tabletop
canvas zone about to receive a dragged card; deliberately not `--light-pink`, since that's the
global focus-ring colour, and not part of the `--dark-pink`/`--deep-space` identity pair). **All
of those live in `packages/design-tokens/tokens.css`**
(`@fleet/design-tokens`) — one file, both ships, served by the Shuffler at
`/fleet/tokens.css` and imported by the Tabletop through Vite.

- **Add or change a shared token in the package**, never in a ship's `:root`. They are
  deliberately **not** mirrored anywhere: a "fallback" copy is a second dictionary, and it
  turns a broken load — loud and obvious — into a silent near-miss. A Playwright test fails
  if any of them is re-declared in `styles.css`.
- **What did *not* travel.** `--background-color` (#f0f0f0) stayed in `styles.css`: generic
  site chrome, not fleet identity. `--playmat-one`/`--playmat-two` stayed in `game.css`
  **on purpose** — "the playmat is one object, one appearance" was decided about the
  Shuffler's two *pages*, and extending it across the ship boundary to a tldraw-rendered
  seat mat is an unratified Layer-2 claim. Buoyed as `playmat-colours-fleet-or-shuffler`;
  the omission is a decision, not an oversight. **`--playmat-one`/`--playmat-two` are now
  shadowed, not removed (2026-08-11, `game-buttons-seat-colors`)** — see the new
  "`/game`'s chrome buttons now read the seat's own colors" entry below; they remain the
  `var()` fallback whenever a seat has no resolved color, which in practice is never (every
  seat gets a resolved pair, sleeved or not — see the `colorsForPlaymat` entry above).

**`/game`'s chrome buttons now read the seat's own colors, not the fixed playmat pair
(decided 2026-08-11, Jess's explicit request — "this is a realization of the original
intended purpose of `--playmat-one` etc" — reversing the SAME-DAY earlier "static chrome
colors stay put" ruling, `aca3f2f`).** Two new CSS custom properties, `--seat-primary`/
`--seat-secondary` (plus `--seat-text-on-primary`/`--seat-text-on-secondary` for contrast),
are set as an inline style on `.playmat-game` itself — not `#game-container`, which gets
`outerHTML`-swapped on every game-state update; `.playmat-game` is the stable ancestor that
also wraps `#modal-container`/`#card-modal-container` — computed once per page render in
`formatGamePageHtmlPage` (`active-game-page.ts`) via `colorsForPlaymat(game.playmatImagePath
?? DEFAULT_PLAYMAT_PATH, game.sleeveColor)` and `luminance()` (both `table-look.ts`). Custom
properties inherit down the DOM, so every descendant button reads
`var(--seat-primary, <original-fallback>)` with zero extra plumbing per component — no
component needed to change its render function to accept a color.

- **Scope is chrome only, decided explicitly with Jess — not the semantic
  action-colored buttons.** In scope: `.menu-toggle` (hamburger) and `.history-actions
  button` (Undo/History) in `game.css` — edited in place, since they're `/game`-exclusive
  classes; a new scoped `.playmat-game .pushable-flat`/`.pushable-flat.pushable-dark`
  override in `game.css` that recolors Go to Table, Cards on table, and Mulligan (every
  `.pushable-flat` used on `/game`) **without touching `.pushable-flat` itself**, which
  stays `--dark-pink` everywhere else (site pages, `/prepare`'s Shuffle Up button); and a
  new scoped `.playmat-game .card-buttons button, .playmat-game .library-buttons button`
  override that recolors Draw/Shuffle/Search/Reveal and the revealed-card action buttons
  (Play/Put in Hand/Put on Top/Put on Bottom on the main page, **not** the modal versions)
  from the shared bare-black rule in `playmat.css`, scoped so `/prepare`'s identical bare
  rule is untouched. Out of scope, left on fixed/semantic colors: `.end-game-actions`
  (Restart/Choose Deck/Home — dark identity chrome), `.card-action-button`/
  `.modal-action-button` (the color-coded card-detail-modal buttons — per-action-type
  semantic colors, not identity chrome), and the dev-only debug-copy-button.
- **This is a new pattern: a page-scoped override of a shared button class.** `.pushable-flat`
  never had a per-page appearance override before this — every prior site (the BFC excepted,
  which is its own button *kind*, not an override) either used it plain or didn't use it at
  all. Confirmed via this KB before implementing; not precedent for casually overriding other
  shared classes per-page, but the shape (`.playmat-game .pushable-flat`) is the one to copy
  if a second page-scoped override is ever needed.
- **`color-mix(in srgb, <color> 65%, black)` is a new CSS feature in this codebase** — used
  to derive each button's box-shadow tone from its *own* background color (now variable)
  instead of a third server-computed shadow hex. No browser-support concern: Jess's own app,
  evergreen Chromium via Playwright.
- **`--playmat-one`/`--playmat-two` remain as the `var()` fallback values only** — not
  reverted, not renamed, just shadowed whenever a seat's resolved colors are present (which
  is always, per `colorsForPlaymat`'s no-`chosenTwo` fallback pair).
- Spec'd in `test/verification/verify-game-seat-colors.spec.ts`: hamburger toggle, library
  buttons, the Cards-on-table button, and the menu's history button render with
  `colorsForPlaymat`'s resolved colors for a sleeved seat; Restart/Choose/Home do **not**
  pick up seat colors (the chrome-only boundary's regression guard); an unsleeved
  default-mat game still gets a real (non-transparent) resolved color.
- **Font tokens: RESOLVED 2026-08-07 (`f79bc7d`).** Jess: *"yeah, go for it! I'm all for more
  tokens."* `--font-chrome` / `--font-content` / `--font-display` are in the package and every
  Shuffler stylesheet uses them. **The typeface names still appear in the two `<head>`
  sources** (down from three since `b268414`, 2026-08-08: the Shuffler's one page shell,
  `formatHtmlHead` in `src/view/common/html-layout.ts`, plus the Tabletop's `index.html`) —
  that's the Google Fonts `<link>` fetching the files, a separate concern from naming a face
  in a rule, and it does not go through a token.
- **`--radius-soft: 4px` is also in the package (2026-08-07, `f79bc7d`), and where it lives
  was decided deliberately.** Shared, not `styles.css`, for the same canvas-can't-use-CSS
  reason as the fonts: choice 4's rule is stated fleet-wide *including canvas shapes*, and a
  tldraw shape passes a radius from TypeScript. This is choice 4's already-decided value
  (Jess, 2026-08-06) getting a **name** — no new appearance decision rode along. **The ~13
  hand-written radius values in the Shuffler are NOT swept**; that sweep is still its own job
  (`.scratch/shuffler-design-choices/issues/04-radius-sweep.md`), and those values are still
  drift, not precedent. A comment in `tokens.css` says so.

**Chunky physical controls — the language is retired (2026-08-07, Jess's direct edit,
`63d4c08`).** `outset` / `inset` / `groove` borders no longer survive anywhere in the app.
The deck-title plaque gave up its `groove` first (choice 7, staged on `/design` and decided
by Jess) once it left the command-zone surround and had nothing left to join to — it became
`3px solid black`. The surround itself — `.cool-command-zone-surround` in `playmat.css` —
then followed on the same day, but **not through `/design`**: Jess edited the CSS directly,
changing its `5px outset black` frame and diagonal gradient fill to the exact same
`3px solid black` border and `var(--light-pink)` fill as the plaque, unifying the two.
That was the last surviving 3D-border site (see [open-choices.md](open-choices.md) →
"Deferred by Jess" — a prior entry there had flagged this exact change as "ending the
language, not thinning it" and deferred it as Jess's call to make). She made it, directly,
outside the choice-staging process this owner normally uses — recorded here as a fact, not
a resolved choice. Button press feedback moved to the box-shadow bevel described below
(`shuffler-design-choices` choice 1) — no more `outset → inset` border switch anywhere. The
Big Fat CTA (below) still carries a visible `10px solid` light-pink border — it just doesn't
switch to `inset` on press anymore.

**Lift on hover, press on click — one canonical shape (decided 2026-08-02, `shuffler-design-choices`
choice 1).** `.pushable-flat` in `apps/shuffler/public/styles.css`: `translateY(-4px)`
at rest, `-6px` on hover (springy `cubic-bezier(.3,.7,.4,1.5)`, 250ms), `-2px` on press
(34ms snap), with a two-layer `box-shadow` bevel instead of a browser-drawn
`outset`/`inset` border. It's global (every page loads `styles.css`); each button site
keeps its own fill color and reproduces the same shape with its own shadow color —
colors are separate open choices (2 and 3).

**Three kinds of button, not just colors.** The Big Fat CTA (`.begin-button` — BEGIN,
Shuffle Up) is its own category: white fill behind the signature chunky light-pink
border, reserved for the one action per page that matters most. Primary and secondary
buttons (dark-pink / deep-space fills elsewhere) are a different, smaller-scale
category. Don't collapse the BFC into "just a bigger primary button" — that's a
distinction the app actually draws, not drift (caught 2026-08-02, see
[history.md](history.md)).

**A radio/tab pair needs its own selection signal (decided 2026-08-02, standalone —
not part of `shuffler-design-choices`).** `.hero-button.active` (Precon/Archidekt on `/choose-any-deck`)
gets a `4px` dark-pink underline via `::after`, on top of the shared press physics.
Elevation alone (the "already pressed" look from choice 1) read as too subtle to signal
mutual exclusivity. This is a pattern for exclusive-choice controls, not a new
button color rule — don't reuse it for ordinary buttons. **Second live instance
(2026-08-09, ticket 16, `8995c1a`):** `.table-look-selected` on the prep-screen picker's
swatches — locked lift plus the same 4px `--dark-pink` `::after` underline. Its shadows
are black-rgba only; it deliberately did **not** copy `.hero-button`'s `#897b89` hex,
which is recorded drift. One mechanical wrinkle worth reusing: an `<input>` can't carry
`::after`, so the custom color input's selected state sits on its wrapper
`<label class="table-look-custom">` instead.

**The table-look panel is the prep screen's setup surface (decided 2026-08-09 —
prototype variant A approved by Jess, `683ca1c`; shipped by ticket 16, `8995c1a`).**
`.table-look-panel` in `prepare.css`: one opaque white panel on the prepare mat
(grid-column 2/7, row 4), framed `var(--narrow-border) solid black` — the play pages'
frame keyword, deliberately **not** the join-table panel's `#888` drift — square corners
(flat surface), with only the pressable swatches carrying `--radius-soft`. Two rows:
Playmat (a growable array of image swatch buttons, 96×54, currently 11) and Sleeves (a None chip showing the
standard Magic card back — `null` ⇔ unsleeved — five mana-pie chips 44×44, and a custom
`<input type="color">`). Markup in `views/partials/table-look-panel.ejs`, included by
`views/partials/playmat-prepare.ejs` — the single source for the whole prepare-mat fragment,
shared by `GET /prepare/:prepId` and `POST /prep-table-look/:prepId` (converted to pure HTMX
2026-08-09, `cabf85b` — see below; `public/prep-picker.js` no longer exists). **The two swatch
rows frame differently, on purpose (Jess,
2026-08-09, `99829d7`):** the shared `.table-look-mat, .table-look-sleeve` rule says
`var(--narrow-border) solid var(--dark-pink)`, and `.table-look-mat` alone overrides
`border-color: black` — mat swatches frame like the mat itself (the play pages' black
frame keyword), sleeve chips keep the dark-pink border. Don't "unify" that split.
Facts that outlive the ticket:

- **The swatches' press physics are a THIRD press behaviour, and that's a recorded
  judgement call, not a settled rule.** Rest at 0, hover `translateY(-2px)` + black-rgba
  shadow — the prototype's exact physics, which Jess approved as part of variant A. Not
  `.pushable-flat`'s numbers (rest −4px / hover −6px / press −2px) and not `.hero-button`'s.
  Either it's sanctioned-for-swatches or a future sweep target; don't copy it to a fourth
  site, and don't "fix" it to `.pushable-flat` without asking.
- **Live previews are inline styles on purpose.** The sleeve pick tints
  `.cool-command-zone-surround` and `.game-title` via inline `background-color` (sleeve
  hex is domain data — a page-sheet rule on shared components would leak onto `/design`);
  the mat pick sets inline `background-image` **longhand** on `.playmat` — never the
  shorthand, which would wipe the shared rule's `cover`/`center`. **A dark sleeve flips the
  plaque lettering to white (Jess, 2026-08-09, `81abce5`):** inline `color: white` is set on
  `.game-title` when the picked hex's BT.601 perceived luminance is below 128, and cleared
  otherwise — same inline-style-for-domain-data posture as the tint. Spec'd in
  `verify-prep-picker.spec.ts`.
- **The tint (and every other pick) is server-rendered on BOTH play pages, and on
  `/prepare` there is no client-side preview left at all (2026-08-09, `5c9f04e` then
  `cabf85b`).** It used to be JS-only (`prep-picker.js`'s `applySleeveTint`), so it only
  ever appeared on `/prepare` and never on `/game` — closed first by giving the server its
  own copy of the same computation (`sleeveTintStyle`, below), then, the same day, by
  **deleting `prep-picker.js` entirely** and converting the whole picker to HTMX
  (`cabf85b` — see the table-look-panel entry in [history.md](history.md)). Every swatch
  now `hx-post`s to `/prep-table-look/:prepId`, which persists the pick and re-renders the
  real `#playmat-prepare` fragment (`views/partials/playmat-prepare.ejs`) — so "preview" and
  "persisted" are now the same round-trip, not two separate code paths. `sleeveTintStyle(sleeveColor, withTextColor)`,
  exported from `shared-components.ts`, computes the inline `background-color` (and, when
  `withTextColor` is true and the hex reads dark by the same BT.601 formula, `color: white`)
  that `applySleeveTint` used to compute only in the browser — **it is now the only
  implementation of that formula in the codebase**, where before `prep-picker.js`'s `isDark`
  and this `isDarkHex` had to be kept in sync by hand. `formatDeckTitleHtmlFragment` takes an
  optional `sleeveColor` param and calls it with `withTextColor: true` (the plaque's
  lettering can flip); `formatCommandZoneHtmlFragment` reads `game.sleeveColor` and calls it
  with `withTextColor: false` (the surround has no text to flip). `prep-view-helpers.ts`'s
  `renderPrepCommandZone`/`renderDeckTitle` do the same for `/prepare` via `prep.sleeveColor`.
  **What was deliberately lost, both confirmed fine by Jess:** the custom color input's
  live-drag preview before commit, and the CSS lift/shadow crossfade on the exact moment of
  clicking a swatch (hover still lifts it, and it stays lifted after click — only the
  crossfade is gone). Spec'd in `test/view/sleeve-tint.test.ts` (unit) and
  `verify-prep-picker.spec.ts` (browser, 8 specs — 2 new, for focus-restoration and
  unsaved-text-survival across the swap).
- **What feeds these two background tints changed (2026-08-11, ticket 01 of
  `colors-from-playmat-to-life-counter`): a resolved `secondaryColor`, not the raw sleeve
  hex.** `colorsForPlaymat(playmatPath, sleeveColor)`, new in `table-look.ts`, derives
  `{ primaryColor, secondaryColor }` from the playmat's curated `chosenTwo` pair
  (`playmat-colors.json`) plus the sleeve choice — contrast-matched against the sleeve when
  one is picked, the darker/lighter of the pair when none is, and a fixed fallback pair
  (mirroring `--light-pink`/`--dark-pink`) when the playmat has no `chosenTwo` entry. All
  four call sites above now pass `secondaryColor` into `sleeveTintStyle`, so **the
  command-zone surround and deck-title plaque are never colorless** — an unsleeved seat used
  to leave these two backgrounds at the CSS default; now every seat gets a resolved color
  from its playmat even with no sleeve chosen. The sleeve's own rendering elsewhere (the
  library-card-back sleeve treatment, the sleeve-lettering logic itself) is untouched — only
  what feeds these two backgrounds moved. `luminance(hex)` (the BT.601 formula) moved to
  `table-look.ts` and is exported from there now; `isDarkHex` in `shared-components.ts`
  delegates to it rather than carrying a second copy, keeping "one implementation of the
  formula" true through the move.
- **The custom color picker stays the native `<input type="color">` — decided, not an
  oversight (Jess, 2026-08-09).** Jess considered click-outside-to-close for the picker;
  the native control's OS panel can't be closed by JS, and she chose to keep the native
  control rather than build a custom in-page picker. Don't re-propose one unprompted.
- **`/game` now paints the picked mat too — CLOSED (2026-08-09).** `GameState`/
  `PersistedGameState` gained `sleeveColor`/`playmatImagePath` (snapshotted from
  `PersistedGamePrep` at `/start-game` and `/restart-game`, optional fields, no version bump —
  same exception as `tableName`), and `formatGamePageHtmlPage` sets the same inline
  **longhand** `background-image` on `.playmat.playmat-game` that `/prepare` already uses —
  never the shorthand, which would wipe `playmat.css`'s shared `cover`/`center`. Closes the
  `game-page-picked-mat` gap this section used to name. **The sleeve tint on the
  command-zone surround and deck-title plaque followed the same day (`5c9f04e`)** — see the
  bullet above; it was the same shape of gap (JS-only, so `/prepare`-only) and closed the
  same way (a shared server-side helper, `sleeveTintStyle` in `shared-components.ts`).

**The nav-link idiom is the fleet's only text-link treatment.** White `--font-chrome` type
on a dark surface: the Shuffler's header (`site.css` → `.right-nav a` — `text-decoration:
none`, opacity fade on `:hover`, underline marks `.active`). No other tokenized link
styling exists — `docs.css`'s content links (`--link-color`/`--link-hover`) are that page
family's own docs-only tokens, not this idiom, and its raw-hex sites remain drift. **A
second instance briefly existed on the Tabletop (2026-08-09 to 2026-08-10):** the landing
page's "Manage your decks in the Shuffler" link (`LandingPage.tsx` → `styles.shufflerLink`)
— always underlined, the accepted degradation where React inline styles can't express
`:hover`. It went with the whole landing page (2026-08-10: `/` on the Tabletop became a
server-side redirect to the Shuffler, and `LandingPage.tsx` was deleted entirely), so the
idiom is back to its one live site. See [history.md](history.md) for both the instance and
its retirement. The next text link that lands anywhere copies this composition; if one
ever lands in a stylesheet context, hover behaviour becomes expressible again and choosing
it is a small new decision, not a port.

**Square corners on chrome.** Round corners belong only to physical objects: cards, the
playmat, count discs. (That used to say "the playmat, the `.page-container`" — two names
for one object; see "The playmat is one object" below.)

**The card is the layout unit.** 200 × 278, radius 10px. Column widths, button grids and
drop zones are sized off that 200. On the canvas the Tabletop's card is 170 × 238 (68
units/inch) and everything else derives from it — but see the next paragraph: that
derivation describes the **default** card, not every card on the board.

**On the canvas, a card keeps its full handle set — resize AND free-rotate — and that is
decided, not an oversight (2026-08-07, `.scratch/tabletop-physics/issues/04-tap-is-state.md`,
`3f14d02`).** No handles are suppressed on a card at all.

- **Resize stays, aspect-ratio locked** (`isAspectRatioLocked = () => true`). Jess resizes
  cards deliberately — *"I like to make creatures bigger than lands"* — and she does it in
  Mural today. The aspect-ratio lock is this owner's constraint and it **was** adopted: the
  board's whole premise is physical proportion, so a card may change size but never shape.
- **This owner argued resize should die and was overruled.** The argument: `CARD_W = 170`
  fixes the canvas coordinate system, so a player-scaled card falsifies "the playmat is 9.6
  cards wide." The counter, from Jess and the ticket: the playmat is 9.6 **default** cards
  wide, and one scaled creature doesn't falsify that. **Recorded so the argument isn't
  re-run from scratch** — if you find yourself re-deriving it, you're re-deriving a settled
  question.
- **Free-rotate stays** — *"people might want to angle a card a little bit to indicate that
  it's attacking (even if vigilant)."* It costs nothing because tap became a rotation
  **delta** (+90° relative to the card's own angle), so tap composes on top of any
  player-chosen angle without either mechanism knowing about the other.
- **Crop disappears for free.** `DefaultImageToolbar` gates on `shape.type !== 'image'`, so
  the crop button exists only while the card is an `ImageShapeUtil` subclass; becoming the
  custom `mtg-card` type removes it with no work. That was the thing Jess actually objected
  to (*"I don't want the weird cropping thing"*), and it is not the same objection as
  resize.
- **So the board is deliberately non-uniform on handles.** All *furniture* is `isLocked` and
  therefore has no handles; *cards* have all of them. Don't "tidy" that into consistency in
  either direction.
- **A custom `indicator()` is still undecided.** Ticket 04 decided nothing about how a
  selected card looks. An `indicator()` that looks like anything other than tldraw's default
  is a **separate design decision needing its own sign-off** — don't let it ride along on the
  `mtg-card` implementation. (Related: the global `:focus-visible` rule cannot reach a canvas
  shape — see tldraw limits above.)

**Sleeve color is a player-identity signal (decided 2026-08-08, ticket 12 of the
Table-layout map).** On the Tabletop, each player's sleeve color — a solid color, ticket
09's v1 decision — identifies that player beyond their own card backs: commander-damage
counters on the life-counter shape (ticket 21, built 2026-08-11) are labelled by opponent
name + sleeve color.
(That shape was called `mtg-counter` when ticket 12 wrote it, but the type string went to
tabletop-physics ticket 18's drag-onto-a-card counter disc on 2026-08-08 — the life counter
needs its own name, buoyed as `life-counter-needs-own-name` in `TODO.md`.)
**There is no separate player-color concept**, deliberately, and playmats (images) were
explicitly rejected as the identity carrier. Two consequences: whatever palette the sleeve
picker offers must keep players distinguishable at a glance (two near-identical sleeves now
confuse damage tracking, not just card backs), and any future "which player is this"
treatment reaches for the sleeve color rather than inventing a new signal. The counter
shape itself is placement-decided, appearance-undecided — see
[open-choices.md](open-choices.md) → "Fleet gaps — the Tabletop side".

**Sleeve color is domain data, not a stylesheet value (decided 2026-08-08, ticket 11 of the
Table-layout map).** It travels as an optional raw hex (`sleeveColor` on `seat.joined`'s
player data) and gets baked into `mtg-card` props at mint — a game constant, never changed
mid-game. **The raw-hex-in-stylesheets ban does not govern it**: like card art, it's content
the player chose, not chrome an agent colored. The rendering model is decided: a sleeve is a
solid-color rectangle slightly larger than the card (a few px per side, like real sleeves);
a face-down card and the library pile render as the bare sleeve rectangle; a face-up sleeved
card renders as its image centered inside the sleeve rectangle — every face-up sleeved card
gets a sleeve-color border. Unsleeved decks keep the standard Magic card-back image, so the
library furniture now has **two** looks keyed on whether the seat has a sleeve.

**The sleeve treatment is DECIDED and shipped (2026-08-08, ticket 17, `0a768e6` +
`bfdc877`), decided with this owner's `-context` mid-implementation — and its corners went
SQUARE on 2026-08-09 (`e53a27e`, Jess: "sleeves are rectangular").** The margin (the ring of
color around a face-up image) is `w * 0.03` per side — a **proportion of the shape's own
`shape.props.w`**, never fixed px, because cards are aspect-locked resizable (the
playmat-radius lesson, applied again); `0.03` mirrors a real sleeve's ~1–2mm overhang.
Ticket 17 originally gave the sleeve rectangle a `w * 0.05` corner radius (the Shuffler
card's own corner ratio); Jess removed it — a sleeve is a rectangular physical object, and
its edge is exactly what gives cards the square corners the fleet's style wants (issue 09's
own line). **Don't "restore" the radius citing the physical-objects rule — the sleeve's real
shape IS square-cornered.** The sleeve is the flat solid player-picked hex — **no border,
sheen, or texture**. **The face IMAGE inside the sleeve keeps rounded corners of its own —
refined 2026-08-09, same day (`c1592c4`), making the corner rule three-part:** an unsleeved
card is rounded (the printed card); a sleeve rectangle is square (`e53a27e`); the face image
inside a sleeve is rounded again — an explicit `borderRadius: w * 0.05` on the img itself
(the Shuffler card's own corner ratio, 10/200) — because the printed card inside the sleeve
is still a rounded card. Ticket 17 had relied on the Scryfall art's own printed corners with
no explicit radius; `e53a27e`'s square-corner edit accidentally stripped the inner rounding
too, because the `sleeve` style object was spread into the image's wrapper div, doing double
duty. Face-down (sleeved) = the bare sleeve
rectangle, square, no image. The **library pile** is rendered
by `MtgZoneShapeUtil` itself via a new `sleeveColor` prop on `mtg-zone`: an inner solid rect
inset by the shared `LIBRARY_PILE_INSET` (12, moved to
`apps/tabletop/src/shared/mtgZoneShape.ts`, used by server image geometry and client sleeve
geometry alike), square-cornered like the sleeved cards (its 5%-of-inset-width radius went
in the same `e53a27e`). **The fleet-wide 0.5-opacity dimming is GONE (2026-08-11, Jess:
"the border isn't black, it's gray. Let's take out that opacity change entirely and let the
furniture shine.").** Every zone shape's `opacity` is now `1` regardless of sleeve state
(`zoneShape()` in `tableFurniture.ts`), and `MtgZoneShapeUtil` no longer fades the sleeved
library's box chrome to 0.5 either — the two mechanisms that used to both land at "0.5, by
different paths" are simply gone, not unified. Unsleeved furniture renders at full strength
instead of the earlier faint-outline treatment; a sleeved pile was already full strength and
stays that way. This is also what the earlier "the black playmat border looks gray"
observation turned out to be — the 0.5 shape opacity blending the border toward white.
**Open, not yet re-verified:** the armed-glow ring's alpha values (`rgba(230, 163, 61, 0.1)`
tint, `0.65` box-shadow alpha — see "tldraw limits" above, ticket 14) were screenshot-checked
against the old 0.5-dimmed baseline; with nothing dimming them anymore they read more
intense. Nobody has re-checked that against `/design` — if the glow looks too hot, that's
this note, not a new regression. **The picker palette is now DECIDED
(2026-08-09, ticket 16, `8995c1a`):** the sleeve quick-picks are the **mana pie five**
(hexes in `src/table-look.ts` mirror the `--mana-*` tokens — its comment says "change a
token there, visit here"), plus a None chip showing the standard Magic card back (`null`
⇔ unsleeved — still no default *color*) and a custom `<input type="color">`. The playmat
set started as the five `aeoe-*` images from the approved prototype — one **more** than the
four `site.css` hero backgrounds issue 09 named (seam-rip is the fifth); the prototype
verdict (`683ca1c`) ratified five. **The count is deliberately open-ended, not settled at
five (2026-08-09):** it grew to 11 the same week when a player found the original five too
high-contrast against cards/text, adding six lower-contrast art crops to `PLAYMATS` in
`src/table-look.ts` — no CSS or markup change was needed, since `table-look-panel.ejs`
iterates the array generically and `.table-look-mats` already wraps. **`PLAYMATS` stopped
being a hand-curated literal array entirely (2026-08-11).** The images moved to their own
directory, `apps/shuffler/public/images/playmats/`, and `table-look.ts` now builds `PLAYMATS`
by scanning that directory at startup (`loadPlaymats()`) instead of listing paths by hand —
slug and display name are derived from the filename. Dropping a new image into that directory
makes it selectable with no code change; the "count is deliberately open-ended" framing above
is now literally true, enforced by the filesystem rather than by convention. `DEFAULT_PLAYMAT_PATH`
is still a literal (now `/images/playmats/aeoe-43-cascading-cataracts.png`), and a startup check
throws if it isn't among the scanned files — so a renamed/missing default fails loudly, not
silently. `SLEEVE_QUICK_PICKS` stayed a curated array; there's no directory of sleeve art to
scan (image-based sleeves are still a later phase). See [history.md](history.md) for the follow-up
and a portrait-crop aspect-ratio note worth reading before adding more. **The gallery gap is closed (2026-08-10, `design-sleeve-specimen`,
`9e23201`):** `/design` § `#sleeved-card` ("Tabletop sleeved card", badge `candidate`) mocks
the face-up `sleeve && !faceDown` branch of `MtgCardShapeUtil.tsx` — the card's image
centered in a sleeve-colored square frame — via `.card-mock-sleeved-face` in
`design-candidates.css`, staged on `.stage-white` at the Tabletop's own 170×238 card unit
(not the Shuffler's 200×278). It's a different thing from `#table-look`, which shows the
*picker*, not the rendered sleeve. v1 is one color; distinct front/back colors or an image
sleeve are someday-maybes, deferred.

**The Shuffler side of the same sleeve rule shipped too (2026-08-09), on both `/prepare`
and `/game`.** `formatLibraryStack`/`formatLibraryCardBack` (`shared-components.ts`) render
each of the three library-card-back elements as a `<div class="mtg-card-image
library-card-back library-card-N sleeved" style="background-color: <hex>">` — a bare
flat-hex rectangle, square corners (`.library-card-back.sleeved { border-radius: 0 }` in
`playmat.css`) — instead of the standard-back `<img>`, whenever the table's `sleeveColor`
is set. The box-shadow is kept (it's the pile's own depth cue, not card-face decoration);
the inset-border/gradient chrome is dropped via `.library-card-back.sleeved::before {
content: none }`, which wins by specificity over both `playmat.css`'s base inset-border
rule and `game.css`'s diagonal-gradient override, regardless of load order. Unsleeved
backs render pixel-identical to before. Same square-corner/flat-hex/no-sheen posture as
the Tabletop's card sleeve above — one rule, both ships. **No sheen was added** — Jess
considered it and held off, on purpose; that stays a separate, future appearance decision,
not bundled with this one. A specimen for both states lives on `/design` § Cards &
playmat, next to the unsleeved library stack.

**The seat name label pairs player name and deck name on ONE line, player first, joined by a
wave-dash (decided 2026-08-09 at Jess's direct request, `75bae71` — superseding the
2026-08-08 two-line ruling from ticket 15, `4263ef8`).** It reads
``${playerName} 〜 ${deckName}``. This is the fleet's one player-name + deck-name pairing; the
next label that shows both copies this composition. The choices, each deliberate: **player
first** (carried forward from the 2026-08-08 ruling); **one line rather than two**, because
Jess wanted the label bigger and single-line — with the **accepted trade-off**, named in the
code comment, that a long deck name can grow the label toward the neighboring seat (exactly
the hazard the two-line ruling existed to avoid — Jess took it knowingly); **the `〜`
wave-dash swoosh as separator** (the old "no separator glyph" choice is gone — on one line,
something has to mark the seam); **deck name verbatim**, no truncation (player-chosen content,
same category as card art). A missing deck name degrades to the bare player name.

**The label became a self-rendering shape on 2026-08-12 (`96551ef`, `mtg-title`) — the event
the previous version of this paragraph predicted — and the prediction held exactly: the
one-line name-〜-deck composition carried forward, and on-brand typographic hierarchy is now
*possible* for the first time.** The label was a locked stock tldraw `text` shape (`serif`,
`color: "green"`, `scale: 2` — enum values, not choices, per the tldraw limit above);
`.scratch/editable-deck-title/` replaced it with a locked custom `BaseBox` shape
(`MtgTitleShapeUtil.tsx`, drawn by `ensurePlayerArea` in
`apps/tabletop/src/server/tableFurniture.ts`) so the whole label is one editable `<input>`.
**That change was mechanics-only by design; the appearance was a faithful reproduction, and
the on-brand restyle was deliberately NOT ridden along.** What the reproduction hard-codes as
raw literals in the shape's `component()` (`MtgTitleShapeUtil.tsx`, `inputStyle`): `color:
"#099268"`, `fontFamily: "Georgia, 'Times New Roman', serif"`, `fontSize: 28`, transparent/
borderless at rest, with choice 5's exact focus ring (`outline: 3px solid var(--light-pink)`,
`outline-offset: 3px`) reproduced via a scoped `<style>` the same way the life counter does.
These used to be tldraw enum values the KB called "not a choice"; a self-rendering shape can't
use that enum, so they are now raw literals reproducing what the enum *rendered* — a
**knowingly-untokenized placeholder** in the same category as the zone scaffolding, exempt
from the Layer-1 token ban, pending the real decision. **The on-brand version (`--font-chrome`/
Orbitron + a token text color) is an unratified appearance decision, staged for Jess
separately — do not let it land as tidying.** Two facts the restyle will need:

- **There is no fitting green token in the fleet palette, and `--mana-G` is a false friend.**
  `--mana-G` is `#2a8439` (Forest — *Magic's colour-pie green for mana identity*), not the
  label's `#099268` (tldraw's own green), and it is a different green besides. Reaching for
  `--mana-G` would both miscolour the label and misuse an identity token as chrome. The
  on-brand restyle therefore needs a **new** chrome/text colour decision, not a reuse — most
  likely dropping the green entirely for the identity palette (`--dark-pink`/`--deep-space`/
  `--light-pink`) or a new named token, which is exactly the kind of thing to stage on
  `/design` and put to Jess.
- **A `/design` specimen is owed with that restyle, not now.** Staging the current stock-look
  reproduction would be staging scaffolding; the specimen belongs with the on-brand options
  when they go to Jess (same "stage both, let Jess pick" shape as choice 7 and the life
  counter). A Tabletop canvas shape stages as a `.stage-white` mock, per precedent.

**Two style worlds.** Site pages (`/`, `/choose-any-deck`, `/docs`, `/about`) use the
purple gradient, AEOE card art backgrounds, and `--deep-space` bars. Play pages
(`/prepare`, `/game`) put a **playmat** on screen — a big art-backed surface everything
else sits on. Don't mix them.

**The playmat is one object, one appearance, two scales — and now fully converged
(named 2026-08-07 `7487393`, converged 2026-08-07 `a4991f3`, the last difference
(the shadow) removed 2026-08-10, Jess's explicit call).** Both play pages carry the bare
class `playmat` plus a page modifier: `/prepare` is `class="playmat playmat-prepare"`
(`prepare.css` → `.playmat-prepare`), `/game` is `class="playmat playmat-game"`
(`game.css` → `.playmat-game`). The game one was called `.page-container` until this KB's
own text was leading readers to conclude the game screen had no playmat — if you meet that
name anywhere, it's stale. Three things follow:

- **The shared appearance lives in the bare `.playmat` rule in `playmat.css`** — art
  (`/images/playmats/aeoe-43-cascading-cataracts.png`), `background-size: cover`,
  `background-position: center`, `border: 10px solid black`. The reserved empty slot the
  rename left is now filled. New shared playmat looks go *there*, never in a page sheet.
- **Only genuinely per-page things stay under the modifier, and that's down to layout and
  radius alone.** `border-radius` is the sanctioned one: 80px on `/game`, 20px on
  `/prepare`, because **radius is a matter of scale** and `/prepare` draws the mat smaller
  (Jess, 2026-08-07). `.playmat-game` also keeps its layout (`width`, `max-width: 1800px`,
  centering, `padding-bottom`); `.playmat-prepare` keeps the grid, `margin`,
  `min-height`, `padding`, `max-width`. **`.playmat-game`'s `box-shadow: 5px 5px black`
  is GONE (2026-08-10)** — Jess's explicit decision to unify the two playmats fully: no
  shadow on either page, since `.playmat-prepare` never had one. The dependent
  `margin-bottom: 5px` and its `/* have to account for the shadow */` comment went with it
  — both existed solely to give the shadow's offset room. This resolves the
  `playmat-drop-shadow` TODO item and closes the "one remaining unexplained difference"
  this section used to name. It was a survivor of the "giant Magic card" reading: `/game`'s
  art used to be a literal Magic card face (portrait, cover-cropped), so 80px + shadow +
  card art read as one big card; the landscape art had already half-retired that reading,
  and now the shadow is gone too. **The two mats are now fully converged** — art, border,
  and shadow-absence all shared; only radius and layout stay page-specific, per scale.
- **Placement rules stay keyed on the bare `.playmat`.** `prepare.css`'s three descendant
  rules (`.playmat > .game-title`, `.playmat .cool-command-zone-surround`,
  `.playmat .commander-placeholder`) place things relative to the mat *as a domain object*
  — the grid parent — not relative to one page's dressing of it. Appearance goes in the
  shared rule or under the modifier; placement keys off the bare class.

**Load-order hazard on the mat — RESOLVED 2026-08-07, incidentally, by Jess's own edit
(`63d4c08`).** `.playmat`, `.playmat-game` and `.playmat-prepare` are all one class of
specificity, and the two pages used to load their sheets in *opposite* order (`/game`:
`game.css` then `playmat.css`; `/prepare`: `playmat.css` then `prepare.css`), so a property
added to the bare rule silently overrode `.playmat-game` on `/game` but lost to
`.playmat-prepare` on `/prepare`. `html-layout.ts`'s `formatHtmlHead()` now loads
`playmat.css` **before** `game.css` (it used to be the other way round) — matching
`/prepare`'s order (`prepare.ejs`'s `additionalStyles` is still `['/playmat.css',
'/prepare.css']`, unchanged). **Both pages now load the bare `.playmat` rule before their
own modifier**, so a property added to the bare rule is overridden by the modifier on
*both* pages, the same way, every time. The trap this paragraph used to warn about is gone.
**This was a side effect, not the point of the commit** ("Jess updates appearance" doesn't
mention load order), and the `CAREFUL` comment that used to sit above `.playmat` explaining
the hazard was deleted in the same edit — correctly, since the hazard it described no longer
exists. Still keep each shared-mat property in the shared rule or in a modifier, never
both — that discipline is good hygiene regardless of load order.

**`black` as a keyword is the play pages' frame color.** The mats' `10px solid black`,
`.game-title`'s `3px solid black`, and (as of 2026-08-07) `.cool-command-zone-surround`'s
own `3px solid black` all use the CSS keyword; no black token exists in `styles.css`
`:root`. That's a real, if untokenised, part of the language — don't substitute
`--deep-space` for it, and don't introduce a near-black hex.

**Appearance in the shared sheet, placement in the page sheet (established 2026-08-07 by
the deck-title plaque).** A component that appears on both play pages declares its *looks*
once in `playmat.css` — fill, border, padding, font — and each page sheet contributes only
where it sits (`prepare.css` puts `.game-title` in the mat's top grid row; `game.css` puts
it in `.game-header-row` beside the hamburger). Don't write a descendant selector like
`.some-container .game-title` for appearance; that welds the look to one parent and it
breaks the moment the component moves. This is the pattern to copy for the next shared
component.

## Design philosophy

**Descriptive before prescriptive.** This owner starts from what the app *is*, not from
what a design authority says a card game should look like. There's a specific reason:
an earlier attempt went the other way and had to be abandoned — see [history](history.md).
A design doc written from imagination contradicts the shipped app and gets ignored.

**Pull toward the standard.** Jess's explicit call (2026-08-01): when new UI sits next to
drifted code, it uses the tokenized palette and square corners anyway. The app converges
gradually and looks briefly mixed, rather than the drift replicating forever. So
"the button next to it is Material orange" is *not* a reason to make yours Material
orange.

**The gallery is the source of truth for appearance — and for direction.**
[`/design`](../../apps/shuffler/views/design.ejs) renders every component using the
app's own stylesheets, so it cannot drift from the app. Look at it before designing; add
to it when you add a component. Candidates staged there (`design-candidates.css`) are
the *direction*: when your change touches something a candidate reimagines, pull toward
the candidate rather than replicating the outgoing treatment. This holds fleet-wide —
the gallery lives in the Shuffler, but it speaks for the Tabletop too.

**Some things are Jess's to decide.** Where more than one treatment is in use, this owner
does not pick — it surfaces both on `/design` and waits. Inventing a resolution is worse
than leaving the choice visible.

**Stage it, don't argue it.** Twice now (choice 5, choice 7) a question that read as
unanswerable in prose was settled in one sentence once Jess could *see* both options
rendered on `/design`. Build the candidate; don't write the essay.

**Blocking is not defending the status quo.** The owner's job is to stop an unapproved
change riding along with an approved one — not to protect whatever shipped last. The
worked example is choice 7 (2026-08-07): the `-review` blocked a flat border that was
hitching a ride on an approved *placement* change; the groove shipped unchanged, both
treatments were staged, Jess was asked, and she chose the flat border. The blocked outcome
is the outcome that landed — but it landed **decided** instead of smuggled. So a block that
ends in "stage it as a choice and ask" is a success. Don't read a later reversal as
evidence the block was wrong, and don't soften the next one to avoid looking wrong.

**One focus ring, declared once (decided 2026-08-06, `shuffler-design-choices` choice 5):**
`3px solid var(--light-pink)` at `outline-offset: 3px`, as a single global `:focus-visible`
rule in `styles.css` (grep `:focus-visible`) covering `a, button, input, select, textarea, summary,
[tabindex]`. **Don't write per-component focus rules and never write `outline: none`** — the
app previously had one plain `:focus` outline and *three* rules that hid focus outright. The
offset matters: the gap shows the page behind the control rather than the control's own fill,
which is what keeps the ring legible against `.begin-button`'s light-pink border. One
sanctioned exception exists — `playmat.css` → `.modal-overlay:focus-visible,
.card-modal-overlay:focus-visible` flips the offset inward to `-3px` on the
two full-viewport modal overlays, where `+3px` would draw off-screen. **Known open risk:**
`--light-pink` measures ~1.35:1 on white (against WCAG 1.4.11's 3:1 floor for non-text
indicators), and the flat-white `.modal-dialog` interior is the likeliest failure. The fix is
Jess's call, not a local patch — see [open-choices.md](open-choices.md) choice 5.

**The `tabindex="0"` on all four modal overlays now has its consumer, and a shape convention
for the next one (2026-08-10, `modal-focus-trap`).** `apps/shuffler/public/modal-focus.js`
is the generic focus-trap mechanism for `#modal-container` (library/history/table/error
modals) and `#card-modal-container` (the card modal): on `htmx:afterSettle`, it moves focus
into whichever container just gained an overlay (landing on the overlay's own
`tabindex="0"` — the reason that attribute existed, not a fossil of some earlier design),
sets native `inert` on whichever region is *not* the topmost open dialog (main content plus
the other modal container, if any — the two dialogs can stack), wraps Tab/Shift+Tab at the
topmost dialog's first/last focusable element, and restores focus to whatever had it when
the dialog opened. No CSS changed — `inert`'s own default (no visual change, removed from
tab order and the accessibility tree) needed no styling, and this owner's `-review` confirmed
nothing in `playmat.css`/`prepare.css`/`game.css` keys off `[inert]`. **The shape a fifth
modal-overlay-shaped consumer must follow**: a `.modal-overlay`/`.card-modal-overlay` class
on the outer div, `tabindex="0"`, and (new) `role="dialog" aria-modal="true"` declared
statically next to it — `modal-focus.js` finds dialogs by container id and overlay class, so
a new consumer that reuses the shape gets the trap for free; one that reinvents the markup
does not. Spec'd in `apps/shuffler/test/verification/verify-modal-focus.spec.ts`.

**Secondary-button gray (decided 2026-08-02, `shuffler-design-choices` choice 2):** `var(--deep-space)`
fill + `var(--light-pink)` text. Replaces the three grays (`#6c757d` Bootstrap, `#607d8b`
Material, and the `#5a6268` hover-darken riding along with them) across
`.end-game-actions`, `.card-action-button.secondary`, and `.modal-action-button.secondary`.

## Open choices — answered by Jess, not yet shipped

**All three are DECIDED** — Jess answered choices 3, 4 and 6 on 2026-08-06, and the answers
with her reasoning are in `.scratch/shuffler-design-choices/spec.md`. What's outstanding is the
*commits*, one per choice (`issues/02`–`04`). **So do not treat these as open questions and do
not re-derive an answer** — cite spec.md. (This bit somebody on 2026-08-07: a Tabletop ticket
asserted `border-radius: 0` on a zone as though radius were still open, because this table and
`open-choices.md` both still read "pending".)

| Choice | Jess's answer (spec.md) | Shipped? |
| --- | --- | --- |
| 3 · Card-modal action buttons | **Two families, split so the color carries meaning** — *this moves the card* vs *this is a tool*. Neither staged option | not yet |
| 4 · Corner radius on chrome | **Soften what you press:** `--radius-soft: 4px` on pressables, `0` on flat surfaces, physical objects keep their real radii. *"The line falls at 'do you touch it', not at 'is it small'"* | **token named** in `tokens.css` (`f79bc7d`); the ~13-value sweep not yet |
| 6 · Text input | option C, `.candidate-input` — 2px `--deep-space`, Orbitron, one rule with a size variant | not yet |

**→ [open-choices.md](open-choices.md) is the work list**: every option, its exact
implementation steps by file and selector, and the checklist for resolving one. Start there if
you've been sent to converge the design.

Because the CSS hasn't caught up, the *code* still shows 13 radius values and seven Material
hues. Those are not precedent — new UI follows the decided rule above.

Candidate CSS for the unadopted options lives in
`apps/shuffler/public/design-candidates.css`, loaded by nothing but the gallery.

## Quick reference

| | |
| --- | --- |
| Gallery route | `/design` → `apps/shuffler/views/design.ejs` (`src/app.ts`, near `/about`) |
| **Shared tokens (fleet)** | `packages/design-tokens/tokens.css` — served at `/fleet/tokens.css`, imported by the Tabletop via Vite. Colours + `--narrow-border` + `--mana-*` + `--font-chrome/-content/-display` + `--radius-soft` |
| Shuffler-only tokens | `apps/shuffler/public/styles.css` `:root` — now just `--background-color` |
| Typefaces in CSS | **always `var(--font-*)`** — no `font-family` literal survives in the Shuffler except `monospace` and `inherit` |
| Fonts (delivery) | Google Fonts `<link>` in **two** sources (since `b268414`, 2026-08-08): the Shuffler's one page shell — `formatHtmlHead` in `src/view/common/html-layout.ts`, which `views/partials/head.ejs` is now a thin adapter over — and `apps/tabletop/index.html`. This is the one place a typeface is still named by name, and it isn't tokenisable |
| One-shot sweep script | `scripts/sweep-font-literals.sh` — kept so the exact substitutions stay reviewable |
| Site pages | `apps/shuffler/public/site.css` |
| Shared playmat chrome | `apps/shuffler/public/playmat.css` (game **and** prepare) |
| Page-specific | `game.css`, `prepare.css`, `deck-selection.css`, `docs.css` |
| Candidates (not adopted) | `apps/shuffler/public/design-candidates.css` |
| Gallery chrome only | `apps/shuffler/public/design-gallery.css` |
| Gallery test | `apps/shuffler/test/verification/verify-design-gallery.spec.ts` |
| Stated UI rule | `apps/shuffler/CLAUDE.md` → "UI Style" |

## How to cite code in this KB (standing convention, 2026-08-07)

**Cite `file` + selector or symbol name. Do not cite `file:NNN`.** Write
``playmat.css → `.game-title` `` , not ``playmat.css:122-128``.

Why: a line number is invalidated by any edit *above* it, in a file nobody was thinking
about this KB while editing. That rot has bitten four times now — after choices 1, 2 and 5
landed, and again when the deck-title plaque moved (2026-08-07), when a single change
invalidated roughly twenty citations across three KB files at once. Nobody notices a stale
line number until they're already editing the wrong rule. A selector, by contrast, is
greppable (`grep -n '\.game-title' public/*.css` finds it wherever it went) and survives
every edit that doesn't touch the rule itself — and if the selector *is* gone, the grep
returning nothing tells you so honestly instead of pointing at an innocent neighbour.

Keep a line number only where nothing else identifies the spot — an unnamed block, a
particular line inside a long function — and make it visibly secondary (`…, currently
around :455`) so the next reader knows to grep first.

## The other files

- [open-choices.md](open-choices.md) — **the work list.** All seven choices, with the three
  still-undecided ones (3, 4, 6) carrying implementation steps, plus the mechanical cleanups
  that fall out of them. Resolved choices keep their reasoning rather than being deleted.
- [interactions.md](interactions.md) — what this leans on, who breaks it, and the concrete
  watch points. **The review skill's fuel.**
- [architecture.md](architecture.md) — how the stylesheets are organised, which file owns
  which component, load order, and the known duplication traps.
- [history.md](history.md) — how the language got here, and the abandoned attempt at
  prescriptive design docs.
