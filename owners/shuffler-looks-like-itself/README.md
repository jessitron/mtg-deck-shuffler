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

**And it has nowhere to start from yet.** `apps/tabletop` has **no CSS source file at all**
(only a built `dist/client/assets/*.css`) and **no font `<link>` or `@font-face` anywhere** —
the only CSS import in the client is `import "tldraw/tldraw.css"`. So Layer 1's "use a token,
not a literal" currently has nowhere to point, and Orbitron has no way to load. **Both halves
fail silently:** CSS drops an unknown `var()`, and a missing font falls back to a system serif.
Tracked as `tabletop-css-tokens` in the repo-root `TODO.md`. **When it gets solved, do not solve
it by copying `styles.css`'s `:root`** — a second source of truth for the palette diverges
silently, and this owner is already fighting four `:root` blocks.

## tldraw limits — recorded, not fought (2026-08-07)

Layer 2 says to write these down rather than silently dropping a rule. All four were found
while `.scratch/tabletop-physics/issues/03-what-furniture-is.md` decided that Tabletop
furniture becomes a custom `mtg-zone` shape.

- **tldraw's `geo` `font` prop is an enum with no Orbitron in it.** So a stock `geo` label
  can *never* be on-brand — today's `serif` zone labels aren't a design choice, they're the
  enum. This is the strongest design argument for a custom shape, and it generalizes: **any
  text the fleet wants on a canvas in a fleet typeface has to come from a self-rendering
  shape.**
- **Layer 1's focus rule cannot reach a canvas shape.** The global `:focus-visible` rule is
  DOM-only, and tldraw owns selection indication for shapes. This is a genuine exemption from
  the "every interactive element gets a visible focus state" rule, not an oversight — say so
  out loud when designing canvas UI instead of inventing a shape-level ring that would fight
  tldraw's.
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
- **An opaque picture layered over a zone box hides that box's interior.** The playmat's and
  library's *pictures* stay separate stock `image` shapes on top of the `mtg-zone` box, so
  border, interior tint and inset shadow are all invisible for those two. Any "armed" or
  "about to receive" treatment for them must read as an **outward** effect — which rules out
  the app's one existing armed pattern (`.hand-drop-zone.drag-over`'s "restate the boundary +
  tint the interior") for exactly the two zones that need it most. A pure-CSS `/design`
  specimen will hide this; include a stand-in image layer or scope the specimen to the
  unpictured zones and say so.

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

**Three typefaces, with distinct jobs.** Orbitron (geometric sans) for chrome — nav,
buttons, headings, form labels and fields, the game title slab. Ovo (serif) for content
— prose and **card names specifically**; a card name is content, not chrome. Risque
(display cursive) only for the big splashy words on the site pages, never on the play
pages. There is no fourth typeface.

**Purple and pink, from tokens.** `--deep-space` (#221534) for bars and dark surfaces,
`--dark-pink` (#bb5277) for borders/rules/accents, `--light-pink` (#ddc7dd) for bevels
and slabs. Plus `--playmat-one`/`--playmat-two` on the game page and the closed
`--mana-W/U/B/R/G` set.

**Chunky physical controls — down to a single site.** `outset` / `inset` / `groove`
borders survive in **exactly one place** in the app: `.cool-command-zone-surround`'s
`5px outset black` metal frame (`playmat.css`). It is the last of them. The deck-title
plaque was the other, and gave up its `groove` on 2026-08-07 (choice 7) once it left the
surround and had nothing left to join to — it is now `3px solid black`. **Know what that
makes the surround:** any future change to it isn't trimming one instance of a language,
it's deciding whether the app still speaks that language at all. That's Jess's call, not a
cleanup — see [open-choices.md](open-choices.md) → "Deferred by Jess". Button
press feedback moved to the box-shadow bevel described below (`shuffler-design-choices` choice 1) — no
more `outset → inset` border switch anywhere. The Big Fat CTA (below) still carries a
visible `10px solid` light-pink border — it just doesn't switch to `inset` on press
anymore.

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
mutual exclusivity. This is a one-off pattern for exclusive-choice controls, not a new
button color rule — don't reuse it for ordinary buttons.

**Square corners on chrome.** Round corners belong only to physical objects: cards, the
playmat, count discs. (That used to say "the playmat, the `.page-container`" — two names
for one object; see "The playmat is one object" below.)

**The card is the layout unit.** 200 × 278, radius 10px. Column widths, button grids and
drop zones are sized off that 200.

**Two style worlds.** Site pages (`/`, `/choose-any-deck`, `/docs`, `/about`) use the
purple gradient, AEOE card art backgrounds, and `--deep-space` bars. Play pages
(`/prepare`, `/game`) put a **playmat** on screen — a big art-backed surface everything
else sits on. Don't mix them.

**The playmat is one object, one appearance, two scales (named 2026-08-07 `7487393`,
converged 2026-08-07 `a4991f3`).** Both play pages carry the bare class `playmat` plus a
page modifier: `/prepare` is `class="playmat playmat-prepare"` (`prepare.css` →
`.playmat-prepare`), `/game` is `class="playmat playmat-game"` (`game.css` →
`.playmat-game`). The game one was called `.page-container` until this KB's own text was
leading readers to conclude the game screen had no playmat — if you meet that name
anywhere, it's stale. Three things follow:

- **The shared appearance lives in the bare `.playmat` rule in `playmat.css`** — art
  (`/images/aeoe-43-cascading-cataracts.png`), `background-size: cover`,
  `background-position: center`, `border: 10px solid black`. The reserved empty slot the
  rename left is now filled. New shared playmat looks go *there*, never in a page sheet.
- **Only genuinely per-page things stay under the modifier.** `border-radius` is the
  sanctioned one: 80px on `/game`, 20px on `/prepare`, because **radius is a matter of
  scale** and `/prepare` draws the mat smaller (Jess, 2026-08-07). `.playmat-game` also
  keeps its layout (`width`, `max-width: 1800px`, centering, `padding-bottom`) and its
  `box-shadow: 5px 5px black`; `.playmat-prepare` keeps the grid, `margin`, `min-height`,
  `padding`, `max-width`. The shadow is the **one remaining unexplained difference** —
  buoyed as `playmat-drop-shadow` in the repo-root `TODO.md`, blocked on
  `design-playmat-specimen`. It is a survivor of the "giant Magic card" reading: `/game`'s
  art used to be a literal Magic card face (portrait, cover-cropped), so 80px + shadow +
  card art read as one big card. The landscape art half-retired that.
- **Placement rules stay keyed on the bare `.playmat`.** `prepare.css`'s three descendant
  rules (`.playmat > .game-title`, `.playmat .cool-command-zone-surround`,
  `.playmat .commander-placeholder`) place things relative to the mat *as a domain object*
  — the grid parent — not relative to one page's dressing of it. Appearance goes in the
  shared rule or under the modifier; placement keys off the bare class.

**Load-order hazard on the mat — flagged by two owners.** `.playmat`, `.playmat-game` and
`.playmat-prepare` are all one class of specificity, and the two pages load their sheets in
*opposite* order (`/game`: `game.css` then `playmat.css`; `/prepare`: `playmat.css` then
`prepare.css`). So a property added to the bare rule silently **overrides** `.playmat-game`
on `/game` but **loses** to `.playmat-prepare` on `/prepare`. Keep each property in the
shared rule or in a modifier — never both. There's a `CAREFUL` comment on the rule saying so.

**`black` as a keyword is the play pages' frame color.** The mats' `10px solid black`,
`.game-title`'s `3px solid black`, and `.cool-command-zone-surround`'s `5px outset black`
all use the CSS keyword; no black token exists in `styles.css` `:root`. That's a real, if
untokenised, part of the language — don't substitute `--deep-space` for it, and don't
introduce a near-black hex.

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
| 4 · Corner radius on chrome | **Soften what you press:** `--radius-soft: 4px` on pressables, `0` on flat surfaces, physical objects keep their real radii. *"The line falls at 'do you touch it', not at 'is it small'"* | not yet |
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
| Tokens | `apps/shuffler/public/styles.css` `:root` |
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
