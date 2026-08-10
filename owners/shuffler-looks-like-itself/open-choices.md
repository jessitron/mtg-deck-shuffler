# Open choices — the work list

**Status: every choice is answered; three are unshipped.** Choices 1 and 2 DECIDED
(2026-08-02); **choice 5 DECIDED and shipped (2026-08-06)**; **choice 7 DECIDED and shipped
(2026-08-07)**. **Jess answered choices 3, 4 and 6 on 2026-08-06** — reasoning in
`.scratch/shuffler-design-choices/spec.md`, executed one commit at a time by `issues/02`–`04`.

⚠️ **"Pending" used to appear on 3, 4 and 6 below, meaning *unshipped*, and it read as
*undecided*.** On 2026-08-07 a Tabletop ticket (`.scratch/tabletop-physics/issues/11-what-a-zone-looks-like.md`)
asserted `border-radius: 0` on a canvas zone from first principles because this file said choice
4 was pending — reaching the wrong answer, since the decided rule is `0` on flat surfaces but
`4px` on pressables. So each answer is now stated **inline** below with its spec.md section.
**Nothing here is an open question.** What's outstanding is CSS commits.

**Citations here are file + selector, never `file:NNN` (convention adopted 2026-08-07 — see
[README.md](README.md#how-to-cite-code-in-this-kb-standing-convention-2026-08-07)).** Grep the
selector; don't trust a remembered line. The line numbers that used to be here rotted four
separate times.

**Choice 4's list of rules below is still incomplete** — `.table-cards-button` doesn't exist,
three rules are missing, and three are duplicated across files. `issues/04-radius-sweep.md`
has the verified list; trust it over this file until this one is rewritten.

This is the handoff doc for converging the Shuffler's design drift. Each choice below is
staged on **`/design`** with its options rendered side by side, and each has its exact
implementation steps. Read this, get the answers, execute.

> **How to use this file.** Ask Jess for her decision on any choice not yet marked
> DECIDED. Implement one choice per commit. After each, follow the "when a choice is
> resolved" checklist at the bottom — it's what keeps `/design` and this KB honest.

**Standing decision (2026-08-01):** new UI **pulls toward the standard**, not toward the
drift it sits next to. A temporarily mixed look is acceptable; replicating drift is not.

---

## 1. Canonical button press behaviour

The big one — settle it first; the others are easier once buttons are consistent.

The app has one interaction *idea* (lift on hover, press on click) expressed seven ways
with different travel, easing, shadow and border treatment.

| Option | What it is |
| --- | --- |
| **A** | Today's `outset`/`inset` bevel + lift, with travel and easing made identical everywhere |
| **B** | Josh Comeau's `.pushable` — faithful: ground shadow, lit edge with darker left/right faces, 34ms press snap |
| **C** | `.pushable-flat` — same travel and spring easing from a hard `box-shadow`; drops onto an existing `<button>` with no markup change |

**Cost, measured:** option B needs three nested spans per button. There are **82
`<button>` tags across 17 files** in `views/` and `src/view/` (excluding `design.ejs`),
several of them inside HTMX fragments. Option C touches only CSS plus class names.
Option A touches only CSS.

**Decision: C — `.pushable-flat` (2026-08-02).** Same travel and spring easing as
Comeau's faithful three-span `.pushable`, but built from a `box-shadow` bevel so it
drops onto an existing `<button>` with no markup change. Reasoning: cheapest of the two
"real" options that don't keep a browser-drawn (and therefore imprecise, engine-variable)
`outset`/`inset` bevel, at zero markup cost across 17 files. See
[history.md](history.md#2026-08-02--choice-1-decided-canonical-button-press-behaviour)
for what actually happened implementing it — notably, the base rule ended up in
`styles.css`, not `playmat.css`/`site.css` as guessed below, because the press behaviour
also touches `game.css`-only components.

Colors were **not** decided by this choice — each site kept its own fill and computed
its own darker shadow color rather than adopting `.pushable-flat`'s default dark-pink.
Choices 2 and 3 (below) are still open.

**Correction (2026-08-02):** the first pass also collapsed `.begin-button` (BEGIN,
Shuffle Up) into a plain dark-pink `.pushable-flat` fill, on the theory that "unify the
press behaviour" meant unify everything. It doesn't — the Big Fat CTA is a distinct
button *kind*, not a bigger primary button, and keeps its own white fill + chunky
`10px solid` light-pink border. Only the press physics (`translateY`/box-shadow) are
shared. See
[history.md](history.md#2026-08-02--a-concept-choice-1-missed-the-big-fat-cta-is-not-a-primary-button).

---

## 2. Secondary-button gray

Three grays used to mean "secondary".

| Option | Value | Where |
| --- | --- | --- |
| A | `#6c757d` (Bootstrap) | `game.css` `.end-game-actions`, `.card-action-button.secondary` |
| B | `#607d8b` (Material) | `playmat.css` `.modal-action-button.secondary` |
| **C — DECIDED** | `var(--deep-space)` fill + `var(--light-pink)` text | now live |

**Decision: C (2026-08-02).** `var(--deep-space)` + `var(--light-pink)`, on-brand, no new
color enters the palette. Changed: `game.css` `.end-game-actions button/a` and
`.card-action-button.secondary` (base, `:hover`, `:active`); `playmat.css`
`.modal-action-button.secondary` (base, `:hover`, `:active`). The shadow color on all of
these is `#0d0716` — the same darkened-`--deep-space` shade already established for
`.pushable-flat.pushable-dark` in `styles.css`, reused rather than computed fresh.

The three sites that darkened their fill *again* on hover (`#5a6268`, riding along with
the `#6c757d` family) also had that override dropped entirely — `.table-cards-button`,
`.end-game-actions`, `.card-action-button.secondary`. None of the canonical
`.pushable-flat`-shaped siblings (e.g. `.modal-action-button.play-button`) change
`background-color` on `:hover`, only `box-shadow` + `transform` — this was drift, not a
deliberate secondary affordance, so it was removed rather than recolored.

`game.css` `.event-undo { color: #6c757d }` (text, not a button) and
`src/view/debug/load-state.ts` `.cancel-link { color: #6c757d }` (same — text) were left
untouched; they're not part of this choice. They're candidates for the "tokenize the
orphan colors" cleanup below.

---

## 3. Card-modal action buttons

Seven unrelated Material hues, none of them brand colors. All eight rules are in
`playmat.css`; grep the selector.

| Rule (all `.modal-action-button.*` in `playmat.css`) | Fill |
| --- | --- |
| `.recover-button, .copy-button` (one shared rule) | `#2196f3` blue |
| `.gatherer-button` | `#4caf50` green |
| `.flip-button` | `#ff9800` orange |
| `.play-button` | `#e91e63` pink |
| `.put-in-hand-button` | `#9c27b0` purple |
| `.put-on-top-button` | `#3f51b5` indigo |
| `.put-on-bottom-button` | `#673ab7` deep purple |
| `.secondary` | `var(--deep-space)` — already settled by choice 2 |

| Option | Tradeoff |
| --- | --- |
| A | Keep color coding — learnable per-destination color, but seven off-brand hues |
| B | One primary (`--dark-pink`) + rest secondary — two tokens, most likely action stands out, loses the color learning |

**Decision: ANSWERED 2026-08-06 (spec.md §3), not yet shipped — and it was neither staged
option.** Jess picked a third: **two families, split so the color carries meaning** — *this
moves the card* vs *this is a tool*. Don't go looking for it on the old options page.

If B, the `.modal-action-button.*` variant rules collapse into two classes; update
`views/partials/card-modal.ejs` and `src/view/play-game/game-modals.ts` accordingly.

---

## 4. Corner radius on chrome

13 distinct values in use. The stated rule is square-except-physical.

| Option | |
| --- | --- |
| A | Truly `0` — matches the written rule and the newest code |
| B | A single `4px` — closer to where most CSS already sits, but contradicts the rule |

**Decision: ANSWERED 2026-08-06 (spec.md §4) — "soften what you press" — not yet shipped.**
Also neither staged option, but a *split*: **`--radius-soft: 4px` on pressables, `0` on flat
surfaces, physical objects keep their real radii.** Jess, worth keeping verbatim because it's
the rule agents will follow: *"While I want square corners, there are times when the square
gets painfully pointy. So on buttons and stuff, there is a 'not too pointy' minimal border
radius. (4px is acceptable.) Of course cards have their border radius, that's how they really
are."*

**The test is "do you touch it", not "is it small"** — deliberately, so the next agent can
*apply* it rather than guess. Square is the aesthetic; the softening is a concession applied
exactly where the pointiness reason applies (raised things, pressed things). This applies
fleet-wide, including to canvas shapes: a zone boundary is a flat surface you don't press, so
it's `0`; a pressable drawn on the canvas would be `4px`.

**The token now exists — the sweep does not (2026-08-07, `f79bc7d`).** `--radius-soft: 4px`
landed in `packages/design-tokens/tokens.css` alongside the font tokens. **Where it lives was
decided, not defaulted:** shared, for the same canvas-can't-use-CSS reason as the fonts — the
rule is stated fleet-wide *including canvas shapes*, and a tldraw shape passes a radius from
TypeScript where no stylesheet convention reaches. Naming the already-decided value is not a
new appearance decision, which is why it was allowed to ride with the font work.

So what remains here is purely the **sweep**: the ~13 hand-written values below still say `2px`,
`5px`, `10px`… **They are drift, not precedent** — a comment in `tokens.css` says so, and so
does `/design` → Geometry. `--radius-soft` is documented in the Geometry section of
`design.ejs` rather than as a colour swatch in the "Named tokens" grid; when the sweep lands,
convert that section's `.choice` block (whose two staged options are the *original* question —
Jess picked neither) into a plain specimen.

**The `playmat.css` radius rules, by selector** (grep `border-radius` in that file to see all
twelve at once): `.library-card-back::before` 8px *(keep — physical)*, `.library-buttons
button` 4px, `.cool-command-zone-surround` 2px, `.cool-command-zone-surround .multiple-cards`
2px *(not in the change-list below; add it)*, `.modal-dialog` 10px, `.modal-close` 4px,
`.hand-count`/`.card-modal-close` 50% *(keep)*, `.card-modal-image` 3vh *(keep)*,
`.modal-card-image` 30px *(keep)*, `.modal-action-button` 8px, `.card-modal-nav-button` 8px,
`.card-modal-position-indicator` 6px.

**Keep round regardless** (these are physical objects): `.mtg-card-image` 10px,
`.commander-placeholder` 10px, `.playmat-prepare` 20px, `.playmat-game` 80px
*(both are the playmat — renamed 2026-08-07 `7487393`; they were `.playmat` and
`.page-container`. The two radii are **settled**, not drift: `a4991f3` converged everything
else the mats differed on and Jess ruled radius is per-page because it is a matter of scale.
Whatever this choice picks for chrome, leave these two alone.)*,
`.card-modal-image` 3vh, `.modal-card-image` 30px, `.library-card-back::before` 8px,
`.hand-count` 50%, `.card-modal-close` 50%.

**Change to the chosen value:** `.cool-command-zone-surround` 2px,
`.table-cards-button` 2px, `.card-action-button` 3px, `.game-menu-panel` 4px,
`.menu-section button` 4px, `.modal-close` 4px, `.debug-container` 4px,
`.debug-copy-button` 4px, `.debug-note` 4px, `.flip-button` 5px, `.hand-drop-zone` 5px
(and its `.drag-over` 20px), `.card-modal-position-indicator` 6px,
`.modal-action-button` 8px, `.card-modal-nav-button` 8px, `.modal-dialog` 10px.

---

## 5. Focus ring — **DECIDED 2026-08-06, shipped**

**Decision: B — `3px solid var(--light-pink)` with `outline-offset: 3px`, as ONE global
`:focus-visible` rule** in `styles.css` (grep `:focus-visible`) on `a, button, input, select, textarea,
summary, [tabindex]`. Reasoning in `.scratch/shuffler-design-choices/spec.md` §5; ticket
`.scratch/shuffler-design-choices/issues/01-global-focus-ring.md`.

Why B over A and C: A (`--dark-pink` flush) matched the one rule that existed but vanishes
against the playmat's dark card art — the surface where most of the app's buttons live. C
(the `--deep-space` halo) is visible everywhere but heaviest, and — discovered while
implementing — a halo can only be drawn with `box-shadow`, which doesn't accumulate across
rules and would therefore erase `.pushable-flat`'s two-layer press bevel. The offset in B
does the same job cheaply: the gap shows the *page* behind the control rather than the
control's own fill, which is what keeps the ring legible against `.begin-button`'s 10px
light-pink border.

**What this was fixing.** The app had *one* focus outline (`.button-base:focus` in
`site.css`, a plain `:focus`, so it fired on mouse clicks too) and **three** rules that
actively set `outline: none` — not two, as this file and `interactions.md` previously said:

| Rule | What it did | Now |
| --- | --- | --- |
| `.precon-search-input:focus` (`deck-selection.css`) | `outline: none` + `--dark-pink` border + `rgba(219,39,119,.3)` glow (Tailwind pink, not `--dark-pink` `#bb5277`) | **deleted whole** |
| `.archidekt-input-section input:focus` (`deck-selection.css`) | `outline: none` + `--dark-pink` border + `rgba(76,175,80,.3)` glow — **Material green** | **deleted whole** |
| `.json-summary` (`src/view/debug/state-copy.ts`, inline `<style>`) | `outline: none` on the app's only `<summary>` | **deleted** |

The third was already dead code — `summary:focus-visible` (0,1,1) outranks `.json-summary`
(0,1,0) — but it was still a written instruction to hide focus, and it's why the global
selector list carries a `summary` clause at all.

**Consequence recorded deliberately:** the two deleted input rules were plain `:focus`, so
they fired on mouse clicks. The global rule is `:focus-visible` only, so **clicking into
those inputs now produces no border change at all**, just the native caret. That's intended,
not a regression.

**What else landed:**

- `playmat.css` — a companion rule, `.modal-overlay:focus-visible,
  .card-modal-overlay:focus-visible { outline-offset: -3px }`. `tabindex="0"` appears in
  exactly four places and all four are the modal overlay (grep it: `views/partials/card-modal.ejs`,
  `views/partials/library-modal.ejs`, `src/view/play-game/game-modals.ts`,
  `src/view/play-game/history-components.ts`). Those are fixed full-viewport elements, so
  the standard `+3px` offset draws the ring *outside* the viewport where it clips to nothing —
  a keyboard stop that looks unfocused, i.e. the exact deficit this choice closes. The offset
  is turned inward so it reads as a frame. In `playmat.css` only (prepare loads it, and the
  modal block is already duplicated across playmat/prepare — don't grow that).
- `site.css` — `.button-base:focus` deleted. Verified nothing was lost: `.button-base` only
  ever lands on `<a>`/`<button>` (grep `button-base`: `views/index.ejs` ×2, `views/prepare.ejs`,
  `views/choose-any-deck.ejs` ×2, `views/partials/deck-selection-archidekt.ejs`), both
  covered by the global selector.
- `design-candidates.css` — the three focus candidates deleted, plus
  `.candidate-input:focus-visible` (it *was* choice 5's rejected dark-pink flush treatment,
  and spec.md §6 decided the adopted input carries no focus rule of its own). See the note
  under choice 6.

### Two open risks — recorded, not resolved

1. **`--light-pink` on white measures ~1.35:1**, under WCAG 1.4.11's 3:1 floor for non-text
   indicators. `spec.md` frames the residual risk as pale passages in the playmat's card art,
   but the app has real flat-white surfaces: `.modal-dialog { background: white }`
   (`playmat.css` → `.modal-dialog`, and the `prepare.css` duplicate), `docs.css` →
   `.docs-content`, and
   `.button-base:disabled` `#f0f0f0`. **The library/history modal interior is the likeliest
   failure, ahead of the card art.** Not yet verified by eye.
2. **The sanctioned fallback collides with choice 1.** If the ring needs help, spec.md says
   add a hairline `--deep-space` companion. A halo can only be drawn with `box-shadow`, and
   `box-shadow` does not accumulate across rules — so it would **erase** `.pushable-flat`'s
   two-layer press bevel (`styles.css` → `.pushable-flat`) on every focused button. `::after` is not an
   escape hatch (inputs can't have pseudo-elements). So the companion means re-declaring the
   bevel inside `:focus-visible` for both `.pushable-flat` and `.pushable-flat.pushable-dark`.
   That's a real cost that goes **back to Jess** rather than being absorbed. A warning to this
   effect is in the `styles.css` comment.

**Still outstanding:** manual keyboard tab-through. Build (`npm run build`), unit tests
(224/224) and `npx playwright test verify-design-gallery` (5/5) all pass, but the real test of
this ticket is a human tabbing through `/`, `/choose-any-deck`, `/prepare`, `/game`, `/docs`
(link-dense, own second `:root`), `/design`, the debug state view (the `<summary>` case), and
**inside an open library modal and card modal** (the white-surface and overlay cases).

**The modal-interior part is now automated, not just manually checked (2026-08-10,
`modal-focus-trap`).** `apps/shuffler/test/verification/verify-modal-focus.spec.ts` tabs and
shift-tabs repeatedly inside an open library modal and an open card modal, asserting focus
never escapes to `#game-container` (which the same change makes `inert` while a modal is
open) — see [README.md](README.md)'s "the `tabindex=0` on all four modal overlays now has
its consumer" entry for the mechanism (`apps/shuffler/public/modal-focus.js`). What's still
manual: the non-modal pages in the list above.

---

## 6. Text input treatment

| Option | |
| --- | --- |
| A | `.precon-search-input` — `deck-selection.css`, 2px `#ddd`, Orbitron, largest |
| B | `.join-table-fields input` — `prepare.css`, 1px `#888`, compact, inherits Ovo |
| **C (recommended)** | `.candidate-input` in `design-candidates.css` — 2px `--deep-space`, Orbitron, one rule with a size variant |

**Decision: C, ANSWERED 2026-08-06 (spec.md §6), not yet shipped.**

**The four sites** (choice 5 deleted the two `:focus` rules that used to sit among them): in
`deck-selection.css` — `.precon-search-input` and its `::placeholder`,
`.archidekt-input-section input`, `#deck-number`; in `prepare.css` —
`.join-table-fields input`.

**A fifth, adjacent site to visit when the sweep lands (2026-08-09, ticket 16):**
`prepare.css` → `.table-look-color-input` already *reproduces* C's values (2px solid
`--deep-space` on white) rather than waiting — `design-candidates.css` is gallery-only, so
the values couldn't be shared; an in-file comment cites this choice. It deliberately deviates
on radius: `--radius-soft`, not the text input's 0, because a color input is **pressed, not
typed into** (choice 4's "do you touch it" test). When the sweep converges the four text
inputs onto a real `.candidate-input`-descended rule, converge this one's border values too —
but keep its radius.

**Note for `issues/02`:** the candidate no longer carries a focus rule of its own —
`.candidate-input:focus-visible` was **already deleted** by choice 5 (it was that choice's
rejected dark-pink flush treatment, and spec.md §6 decided the adopted input takes the global
ring instead). So "real focus state" is no longer a point in C's favour; the global ring gives
it to all three options equally. `.candidate-input` and its `::placeholder` remain.

---

## 7. Deck-title plaque border — **DECIDED 2026-08-07, shipped**

The deck-title plaque left `.cool-command-zone-surround` and now rests on the playmat
itself (see [history.md](history.md#2026-08-07--the-deck-title-plaque-moved-onto-the-playmat)).
Its `3px groove black` border was, arguably, the *join* between slab and metal frame. Alone
on the mat, did it still want one?

| Option | Where |
| --- | --- |
| A — keep `3px groove black` (was shipped) | `playmat.css` → `.game-title` |
| **B — DECIDED — flat `3px solid black`** | now live in `playmat.css` → `.game-title` |

**Decision: B — flat `3px solid black` (2026-08-07).** Jess, seeing both on `/design`: *"go
with your option B, the black border. That looks great in /design."* Landed in `20b83aa`.

Reasoning: the groove was the plaque's **join** to the metal command-zone surround, and out
on the mat it has nothing to join to. At the time, the surround kept its `5px outset
black`, so the chunky 3D-border language still had a home — it was down to one site instead
of two. That cost was argued explicitly before the decision (halving the surviving
vocabulary is a real loss of identity, not a cleanup) and Jess took it anyway, by eye.

**Update, same day (`63d4c08`): the last site went too, and not through this process.**
Jess edited `.cool-command-zone-surround` directly — `5px outset black` and its diagonal
gradient fill became `3px solid black` + `var(--light-pink)`, the exact same border and
fill as `.game-title`. She said: *"I simplified the command zone and made it match the
deck title."* The chunky `outset`/`inset`/`groove` vocabulary this choice's writeup treated
as "the last one, load-bearing, don't remove without asking" is now retired entirely. This
wasn't staged on `/design` or asked about — it's recorded here as a fact that happened, not
as an eighth choice.

**How it was decided, and this is the reusable part.** The owner's `-review` pass on the
plaque *move* **blocked** the flat border: Jess had approved a placement change, and an
appearance change was riding along unapproved. That block was honoured — the groove shipped
unchanged, both treatments were staged side by side on `/design` as a `.choice` block, and
Jess was asked properly. She then picked the very treatment the review had blocked. **That
is the process succeeding, not reversing itself:** the job is to stop unapproved changes
riding along, not to defend the status quo. A block that ends in "so stage it as a choice
and ask" is the good outcome. It's also the second time (after choice 5) that staging real
options on `/design` beat arguing them in prose — Jess asked for pixels, not paragraphs.

**Resolve checklist — done:** `.candidate-game-title-flat` deleted from
`design-candidates.css` (no dangling references — grepped); `playmat.css` → `.game-title`
carries the flat border with the decision, date and reasoning in the comment above it; the
`.choice` block in `design.ejs` is gone and the "Deck title plaque" specimen — which renders
the real shipped `.game-title` — now carries a `section-note` recording the outcome; the row
is out of [README.md](README.md)'s open-choices table and the "chunky physical controls"
paragraph now says the surround is the **last** 3D-border site; entry added to
[history.md](history.md). No stated rule in `apps/shuffler/CLAUDE.md` → UI Style changed (it
never named the plaque's border). `npm run build` clean; `./verify.sh verify-design-gallery
verify-deck-title-placement` — 6/6 pass. The gallery spec asserts nothing about `.game-title`,
so it needed no update.

---

## Deferred by Jess — raised, consciously not done

Not choices staged on `/design`; just things she looked at and said "not now." Recorded so
the next session doesn't re-discover them as if they were news, and doesn't do them
unbidden either.

- **The `.join-table-fields` panel is now the odd one out on `/prepare`** (raised
  2026-08-07). Its white fill and `#888` 1px borders were one pale slab among several;
  after the deck-title plaque moved onto the mat, the panel is the *only* pale untokenized
  slab left on that screen, so it reads as foreign. Converging it is entangled with choice
  6 (it's option B's input). Jess deferred it explicitly. **It will look worse before it
  looks better — that's expected, not a regression to patch.**
- **Removing `.cool-command-zone-surround` entirely**, so commanders sit bare on the mat
  (raised 2026-08-07, deferred as its own change). **Partially overtaken by events, same
  day:** the surround's `5px outset black` — the concern this deferral was protecting — is
  gone; Jess changed it directly to `3px solid black` + `var(--light-pink)` (matching
  `.game-title`), which already ended the chunky-3D vocabulary this item worried about
  ending. The element itself still exists (a flat-bordered frame around the commander card,
  now with the card's own border/background/fixed-height removed too — it floats bare
  inside a flatter frame). So the *specific* question this item raised — "does removing the
  surround end the app's last 3D-border site" — is moot; whether the surround should be
  removed *as an element* (frame and all, commanders sitting bare on the mat) is still open
  and still Jess's call.
- **The table-look custom color picker stays the native `<input type="color">`** (raised and
  decided 2026-08-09). Jess considered click-outside-to-close for the picker; the native
  control's OS color panel can't be closed by JS, and she chose to keep the native control
  rather than build a custom in-page picker. This one isn't deferred — it's decided-against.
  Don't re-propose a custom picker unprompted.

---

## Falls out of the above — no decision needed

Do these as their own commits once the choices are settled. They're mechanical.

- **Tokenize the orphan colors.** 57 distinct hex values today; ~14 of them are
  Material/Bootstrap defaults on single buttons. Choices 2, 3 and 6 kill most of them.
  Whatever survives needs a name — in `packages/design-tokens/tokens.css` if it's fleet
  identity, in `styles.css` `:root` if it's Shuffler-only chrome — and a swatch on `/design`.
  Choice 5 took two off the list — the `rgba(219,39,119,.3)` Tailwind pink and one
  `rgba(76,175,80,.3)` **Material green** both left with the deleted input `:focus` rules.
  Material green **survives once**, in `game.css` → `.hand-drop-zone.drag-over`
  (`background-color: rgba(76,175,80,.2)`), and now belongs to this cleanup rather than to
  focus work. **That one rule violates three rules at once**, which is why it keeps coming up:
  the Material green, `border-radius: 20px` (soft corners on chrome), and
  `outline: 2px solid gray` (one of only two surviving decorative outlines). It is also the
  app's **only** existing "armed / about to receive" treatment, so it is the thing an agent
  designing a drop target will find and copy — it nearly got ported into the Tabletop on
  2026-08-07 (`.scratch/tabletop-physics/issues/11-what-a-zone-looks-like.md`). **Its *shape*
  is instructive and worth keeping — "restate the boundary + tint the interior" — its *values*
  are not.** Don't port it anywhere; reproduce the shape with tokens.
- **`.commander-placeholder`'s literals** (`2px dashed #ccc` on `#f9f9f9`, duplicated in
  `game.css` *and* `prepare.css`) belong to this cleanup too. Noted 2026-08-07 because the
  **pattern** is good and being reused: dashed-on-a-card-sized-box already means "empty
  receptacle where a card goes" in this app, at exactly the card unit, which makes it the
  right starting point for a Tabletop zone at rest. Port the pattern, retokenize the values.
- **De-duplicate the copy-pasted blocks** (see `architecture.md` → Traps). There are
  **four**, and "flip" is two separate ones — the container and the button:
  - modal styles in `playmat.css` + `prepare.css`;
  - flip **container** styles (`.flip-container-outer/-inner`, `.two-sided-front/-back`)
    in `game.css` + `prepare.css` — still verbatim identical;
  - flip **button** styles in **`playmat.css`** (`.modal-action-button.flip-button`)
    + **`prepare.css`** (bare `.flip-button`) — **already diverged** (verified
    2026-08-06). Choice 1 converted the playmat copy to the `.pushable-flat` box-shadow
    bevel; the prepare copy is still the pre-choice-1 flat control (`border-radius: 5px`,
    `background-color: #f57c00` on hover, no press physics). They now only agree on the
    `#ff9800` fill. This one can't be deleted blind — the two are different selectors on
    different markup, so the prepare copy needs to *adopt* the playmat treatment, not
    disappear.
  - library-list styles in `playmat.css` + `prepare.css`.

  Prepare loads `playmat.css` already, so for the modal and library-list blocks the
  `prepare.css` copy can likely just go — verify the `font-family: "Ovo"` addition on its
  `.card-name-link` isn't load-bearing first.
- **Restyle the flip button as a circle of two arrows.** Jess's stated want: *"a circle
  of two arrows, centered under the card"* — an icon affordance, not a labelled text
  button. Today it's Material orange `#ff9800` with white text in two places
  (`playmat.css` → `.modal-action-button.flip-button`, `prepare.css` → `.flip-button`; see
  the de-duplication item above), and the
  prepare copy's `border-radius: 5px` is one of the values choice 4 governs. No decision
  needed on the *look* — Jess has said what she wants — but it can't land until choice 4
  settles the radius question it's entangled with, and it should de-duplicate at the same
  time rather than restyle two copies. The `#ff9800` swatch on `/design`
  (`design.ejs`, in the orphan-hex grid) goes with it.
- **~~Collapse the extra `:root` blocks.~~ Mostly done 2026-08-07 (`4396aea` + `a8e2427`).**
  There were four in the Shuffler; there are now **three, and one of them is authoritative
  and lives outside the ship**:

  | `:root` | What's in it | Verdict |
  | --- | --- | --- |
  | `packages/design-tokens/tokens.css` | the identity palette, `--narrow-border`, `--mana-*`, **`--font-chrome/-content/-display`, `--radius-soft`** (added `f79bc7d`, 2026-08-07) | the fleet's one dictionary — shared tokens go **here** |
  | `styles.css` | `--background-color` only | Shuffler-only site chrome; fine |
  | `docs.css` | `--text-light`, `--link-color`, `--link-hover` | no longer a re-declaration — three genuinely docs-only tokens. Promoting them is its own decision |
  | `game.css` | `--playmat-one`, `--playmat-two` | **deliberately left**, not an oversight — see `playmat-colours-fleet-or-shuffler` in `TODO.md` |

  `playmat.css` no longer has a `:root` at all. The remaining question isn't "collapse them",
  it's the one buoy: do the playmat colours belong to the fleet or to the Shuffler? Extending
  "the playmat is one object, one appearance" **across the ship boundary** to a tldraw-rendered
  seat mat is an unratified Layer-2 claim, so moving those two tokens would silently answer it.
- **Delete the debug leftover:** `site.css` → `.step > * { border: 0px solid red }`.
- **Adopt a spacing scale.** No scale exists. Proposed: `4 · 8 · 12 · 16 · 24 · 32 · 48`
  — every current value rounds to one of these within 2px except 5, 15 and 18.

---

## Fleet gaps — the Tabletop side (opened 2026-08-07)

Not `/design` choices. These are places where this owner's charge already applies to
`apps/tabletop` and there is nothing to apply it *with*. Surfaced by
`.scratch/tabletop-physics/issues/03-what-furniture-is.md` making Tabletop furniture a
self-rendering custom shape.

- **~~There is nowhere to declare a Tabletop token, and no way to load Orbitron.~~
  RESOLVED 2026-08-07 (`4396aea`, `db79bf8`, `a8e2427`) — `tabletop-css-tokens`.** The answer
  was a shared workspace, not a deliberate duplicate: `packages/design-tokens`
  (`@fleet/design-tokens`, `packages/*` added to the root workspaces glob), holding the identity
  palette, `--narrow-border` and the mana colours. The Shuffler serves it at `/fleet/tokens.css`
  (an `express.static` mount in `src/app.ts`, resolved via `import.meta.resolve` rather than by
  walking up from `__dirname`, because the depth differs between dev and container); the Tabletop
  imports `@fleet/design-tokens/tokens.css` in `src/client/main.tsx` so Vite inlines it. Orbitron
  and Ovo come from a Google Fonts `<link>` in `apps/tabletop/index.html`, matching the two
  existing sites.

  **This owner's two non-negotiables both held.** (1) The tokens **moved**, they are not
  mirrored — `styles.css` `:root` now holds only `--background-color`, `playmat.css`'s `--mana-*`
  `:root` is gone entirely, and a Playwright test fails if any shared token is re-declared in
  `styles.css`. (2) It landed **with checks**, because both halves fail silently:
  `verify-fleet-tokens.spec.ts` on each ship asserts every shared token resolves non-empty via
  `getComputedStyle` and that Orbitron loads, `test/html-layout-fleet-tokens.test.ts` covers the
  Shuffler's *other* head cheaply, and `scripts/check-fleet-tokens.sh` is a fast local smoke check.

  **Why not the `log.ts`-style deliberate duplicate.** That duplication is *forced* — the two
  copies sit on incompatible OTel version lines — and it drifts **loudly**, breaking the build.
  A palette drifts silently. `docs.css` was the fleet's own evidence: it re-declared three of
  these tokens, never diverged in what it copied, and diverged **by addition** anyway.

  **Ordering that mattered, and is worth reusing:** `docs.css`'s three re-declarations were
  deleted in a **separate, later commit** (`a8e2427`), after the plumbing was verified —
  because while they existed, `/docs`, `/about` and `/history` would have kept their colours
  even if the shared sheet failed to load, masking the failure on exactly three pages.
  `--text-light`, `--link-color`, `--link-hover` stay; they're genuinely docs-only, and
  promoting them is its own decision.

- **Still open: there is no ship-local stylesheet on the Tabletop.** Shared tokens have a home;
  the first *Tabletop-only* rule does not. Inline styles are the status quo by inertia, not by
  choice. Ticket 05 (tap motion) still wants one; ticket 11 (what a zone looks like) no longer
  does — it landed as inline `CSSProperties` objects in `MtgZoneShapeUtil.tsx` (ticket 14,
  2026-08-08, see below), not CSS, so it didn't end up needing a stylesheet after all. Ticket
  18's counter disc (2026-08-08) made the same call — inline `CSSProperties` with `var()`
  tokens in `MtgCounterShapeUtil.tsx`, deliberately not starting a stylesheet. Whoever
  writes the Tabletop's first CSS rule still decides where it lives — and it must not be
  answered by starting a `:root` there.
- **~~Still open: font tokens.~~ DECIDED and shipped 2026-08-07 (`f79bc7d`).** Jess: *"yeah, go
  for it! I'm all for more tokens."* `--font-chrome` / `--font-content` / `--font-display` are in
  `packages/design-tokens/tokens.css`, **named by role rather than by typeface** because three
  faces with fixed jobs make the role the stable name and the face the detail. All **39**
  `font-family` literals across nine Shuffler stylesheets were swept onto them in the same
  commit — swept rather than merely added, because a token nobody uses is just a second way to
  say the same thing, which was the main argument against having one. `scripts/sweep-font-literals.sh`
  keeps the exact substitutions reviewable. Both ships' `verify-fleet-tokens.spec.ts` now assert
  the three (plus `--radius-soft`) resolve.

  **A real convergence rode along and is recorded as a decision, not an accident.** `styles.css`'s
  `body` said `font-family: "Ovo", Arial, sans-serif` while all nine other Ovo sites said
  `"Ovo", serif`; the token settles it as `"Ovo", serif`. Only observable if Ovo fails to load —
  but it *is* a behaviour change, and it was the agent's to make, not Jess's. That drift, plus
  quoting split between single and double quotes, is the concrete evidence that justified
  tokenising type at all.

  **What is still literal, and correctly so:** the typeface names in the two `<head>` sources
  (down from three since `b268414`, 2026-08-08: `formatHtmlHead` in
  `src/view/common/html-layout.ts` — the Shuffler's one page shell, which `head.ejs` now
  adapts — and `apps/tabletop/index.html`), where
  the Google Fonts `<link>` *fetches* the files. That is delivery, not naming a face in a rule, and
  a CSS custom property can't reach it. The standing rule holds: one delivery mechanism fleet-wide
  (a `<link>` **or** `@font-face`, never both), and self-hosting is a change to both at once.

  **Built and confirmed working 2026-08-08 (ticket 13).** `MtgZoneShapeUtil`'s zone labels
  ("Graveyard", "Exile", "Library", "The Stack", and — since table-layout ticket 13 the same
  day, `1046b93` — "Command Zone") render with `fontFamily: "var(--font-chrome)"`,
  and the token resolves to Orbitron inside the canvas — the first fleet-token consumer inside a
  genuine self-rendering shape, exactly the case the tokens were created for. See
  [README.md](README.md) → "tldraw limits" and [history.md](history.md) for how it was verified.

- **~~Choice: what a zone looks like (ticket 11).~~ DECIDED 2026-08-07, BUILT 2026-08-08
  (ticket 14).** `MtgZoneShapeUtil.tsx` now carries the real visual treatment in place of
  ticket 13's plain placeholder — verified against `design-candidates.css`'s literal rules,
  not ticket 11's prose summary of them (an earlier `-review` pass caught that the two didn't
  match). At rest: `border: 2px dashed var(--dark-pink)`, `color: var(--dark-pink)`,
  `background: rgba(187, 82, 119, 0.03)`, ported verbatim from `.zone-mock--rest`. Armed:
  option **A, "glow ring"** (not B, "armed-border") — `color: var(--deep-space)`,
  `background: rgba(230, 163, 61, 0.1)`,
  `box-shadow: 0 0 0 3px var(--armed-glow), 0 0 16px 5px rgba(230, 163, 61, 0.65)`, ported
  verbatim from `.zone-mock--armed-glow`. The playmat keeps its own identity — untokenized
  `10px solid black`, `borderRadius: h * 0.05` computed fresh from `props.h` every render
  (never a CSS percent, which draws an ellipse on a non-square box, and never a fixed px,
  which drifts out of proportion as the canvas zooms) — and the armed glow rides on top of it
  via `box-shadow`, additive rather than replacing the border, which is exactly why it survives
  being covered by the playmat's/library's opaque `image` overlay (see README.md → tldraw
  limits, "an opaque picture layered over a zone box"). The Stack got no distinct treatment —
  same dashed-pink/armed-glow family as graveyard/exile, per the ticket. See
  [history.md](history.md) for the verification detail (Playwright, both single- and
  two-client).
- **Coming to this owner: the tap motion's tempo** (`.scratch/tabletop-physics/issues/05-rotate-to-tap.md`,
  opened by ticket 04 on 2026-08-07). A card tapping is a 90° rotation played as a local
  catch-up transform. **Ticket 04 decided no duration, easing, colour or literal** — that is
  deliberately 05's, and 05 is to be decided *with* this owner. The calibration 04 handed
  forward: the Shuffler's motion vocabulary is **0.8s** (the flip transition) and **0.5s**
  (card motion), and a tap is a flip-like **reorientation**, not a translation — so match one
  of those two rather than inventing a third tempo. **Decidable now, not implementable** — it
  needs a Tabletop stylesheet (`tabletop-css-tokens`, above) to land in. This is not a
  `/design` `.choice` yet; staging it would mean animating a specimen, and the gallery has no
  Tabletop stage.
- **Staged, awaiting Jess's sign-off: the counter disc (`mtg-counter`, tabletop-physics
  ticket 18, built 2026-08-08).** The drag-onto-a-card counter — free editable text, blank by
  default — shipped with a treatment ported from `.hand-count` in `game.css` (the app's one
  existing count disc, fully tokenized): `--deep-space` fill, `var(--narrow-border)` solid
  `--dark-pink` ring, `--light-pink` text in `--font-chrome`, `border-radius: 50%` (count
  discs are a sanctioned round category), 44px default. Border width is **proportional to
  `props.h`** (`h * 3/44` px); font-size starts at `h * 0.32` and **shrinks to fit long
  labels** (`counterTextFit.ts`, 2026-08-08 follow-up — Jess: "lifelink" was invisible at the
  fixed size). The rest of the recipe is unchanged. The fit is deliberately minimal (a
  circle-aware chord-wrapping version was built and reverted the same day — Jess: "too much
  code and not core to this app"): the font shrinks until an estimated wrapped block fits the
  square content box, the browser does the wrapping, and the round clip nibbling the corners
  of long labels is **accepted** — see [history.md](history.md). Implemented as inline `CSSProperties` in
  `MtgCounterShapeUtil.tsx` (still no Tabletop ship-local stylesheet — ticket 18 deliberately
  didn't start one). **Staged on `/design` § `#counter-disc` (`.counter-mock` in
  `design-candidates.css`, badge `candidate`) in the same commit — this is
  staged-not-decided.** If Jess signs off: retag the specimen `badge-standard`, and the
  "small count disc: deep-space fill / narrow dark-pink ring / light-pink text" recipe
  becomes a named chip pattern in the README's design language (the winning CSS stays inline
  in the shape — there's no stylesheet to move it to). Two riders flagged for her, not
  decided by this owner: the **toolbar tool** (a `TldrawUiMenuItem` with the stock
  `geo-ellipse` icon before `DefaultToolbarContent` in `TablePage.tsx` — stock tldraw chrome,
  no restyling, per "record the limit, don't fight it"; the tool's *existence* is an
  assumption, the spec never said how a player obtains a counter), and `toSvg` skipped
  (consistent with `mtg-card`/`mtg-zone`; buoyed as `custom-shapes-lack-toSvg` — a
  three-shape gap for one pass, Orbitron hand-carried into the SVG per this KB's rule).
- **Coming to this owner: the life-counter shape's appearance**
  (`.scratch/tabletop-table-layout/issues/12-life-totals-and-commander-damage.md`, resolved
  2026-08-08 — placement + content only). **Naming note: ticket 12 called this shape
  `mtg-counter`, but that type string now belongs to ticket 18's counter disc (above) per the
  tabletop-physics spec — the life counter needs its own name, buoyed as
  `life-counter-needs-own-name`.** Life totals and commander damage become a locked
  custom shape rendering a number with +/- buttons (also directly typeable), in the name row
  above the command zone/library. **Decided**: the row's layout (Jess verbatim — player name
  large, left-justified; commander-damage counters then a bigger life counter,
  right-justified), life starts at 40, commander damage starts at 0 and is always visible,
  one counter **per commander**, each identified by opponent name + **sleeve color** (ticket
  09's solid-color sleeves, traveling via ticket 11 — no separate player-color concept;
  playmats rejected as the identity carrier). **Undecided, reserved for this owner's
  `-context`/`-review` at implementation time**: font, exact sizes, colors beyond the sleeve
  swatch. Same posture as the tap tempo and the `mtg-card` indicator — the appearance must
  not ride along on the implementation ticket. All the canvas rules apply: self-rendering
  shape for any fleet typeface, geometry computed in TypeScript at render time, `.stage-white`
  for any `/design` mock.
- **~~Coming to this owner: the sleeve's rendered appearance.~~ DECIDED and BUILT
  2026-08-08 (ticket 17, `0a768e6` + `bfdc877`), decided with this owner's `-context`
  mid-implementation — except the picker palette, see below.**
  (`.scratch/tabletop-table-layout/issues/11-sleeve-color-to-card-back.md` had decided
  transport + rendering *model*; ticket 15, `4263ef8`, gave `sleeveColor` its schema home in
  `contracts/payloads/seat.joined.v1.json` — optional raw hex `^#[0-9a-fA-F]{6}$`, winning
  over `cardBackImageUrl`; it's baked into `mtg-card` props at mint, legal because sleeve
  color is a game constant.) The reserved treatment came due and landed as: margin
  `w * 0.03` per side, **a proportion of `shape.props.w`** computed
  in TypeScript at render time (cards are aspect-locked resizable — never a fixed px, never
  a CSS percent); flat solid player-picked hex, **no border/sheen/texture**; the face image
  keeps its own rendering inside the ring, no second radius; face-down (sleeved) = bare
  sleeve rectangle. **The corners are SQUARE — revised 2026-08-09 (`e53a27e`, Jess: "sleeves
  are rectangular"):** ticket 17's original `w * 0.05` radius came off the sleeved card and
  the library pile alike; only the `w * 0.03` overhang survives. A sleeve's edge is exactly
  what gives cards the square corners the fleet's style wants (issue 09's own line) — don't
  "restore" the radius citing the physical-objects rule. **Refined the same day
  (`c1592c4`): the face IMAGE inside the sleeve keeps rounded corners** — `e53a27e` had
  accidentally stripped the inner img's rounding too (the `sleeve` style object was spread
  into the image's wrapper div), and the printed card inside a sleeve is still a rounded
  card, so the img now carries its own explicit `borderRadius: w * 0.05` (the Shuffler
  card's 10/200 ratio). The full three-part rule: unsleeved card rounded, sleeve rectangle
  square, face image inside a sleeve rounded; a face-down sleeved card is the bare square
  rectangle with no image. The library pile is `MtgZoneShapeUtil`'s own render via a new
  `sleeveColor` prop on `mtg-zone` — inner rect inset by the shared `LIBRARY_PILE_INSET=12`
  (`src/shared/mtgZoneShape.ts`), square-cornered, zone opacity 1 with the box
  chrome self-faded to 0.5 so the pile stays vivid. `indicator()` untouched — the ride-along
  warning held. Full decision text in [README.md](README.md)'s design language; the
  `.tl-image` wrapper-escape limit it uncovered is in README → tldraw limits. **The picker's
  swatch palette — the last reserved piece — is DECIDED 2026-08-09 (ticket 16, `8995c1a`;
  prototype variant A approved by Jess, `683ca1c`):** the sleeve quick-picks are the **mana
  pie five** (hexes in `apps/shuffler/src/table-look.ts` mirror the `--mana-*` tokens — its
  comment says "change a token there, visit here"; identity weight per ticket 12 holds, the
  five mana colours are distinguishable at a glance), plus a None chip showing the standard
  Magic card back (`null` ⇔ unsleeved — still no default *color*) and a custom
  `<input type="color">`. The playmat set started as the five `aeoe-*` images — one more than
  issue 09's four hero backgrounds (seam-rip is the fifth); the prototype verdict ratified
  five. **That count is not settled — it's grown to 11 (2026-08-09)**, when six lower-contrast
  art crops joined `PLAYMATS` in `table-look.ts` for a player who found the original five too
  high-contrast against cards/text; see [README.md](README.md) and [history.md](history.md).
  **The `/design` specimen of the rendered sleeve-on-a-card is DONE (2026-08-10,
  `design-sleeve-specimen`, `9e23201`)** — `/design` § `#sleeved-card`, badge `candidate`,
  mocks the face-up sleeve ring via `.card-mock-sleeved-face` in `design-candidates.css`; the
  picker *panel* keeps its own separate specimen (`#table-look`). The raw hex itself remains
  domain data, exempt from the stylesheet hex ban; what an agent must not do is *pick* one.
- **Also undecided, and it must not ride along: a card's `indicator()`.** Ticket 04 records
  explicitly that an `indicator()` looking like anything other than tldraw's default is a
  **separate design decision needing its own sign-off**. The `mtg-card` implementation ticket
  is where it will try to hitch a ride.
- **~~The gallery has zero Tabletop specimens~~ — it has its first five now (2026-08-07,
  `a304c52`, ticket 11), and the cross-app stylesheet question is still unresolved.** The
  gallery's credibility rests on rendering the *app's own* stylesheets. Ticket 11's § Tabletop
  zones section sidestepped rather than answered the hard version of this: its specimens use
  only `design-candidates.css` mock classes and the shared fleet tokens, explicitly labelled a
  mock in the section's own note, scoped to the zones an opaque picture layer doesn't hide. A
  Tabletop specimen using the Tabletop's **own** stylesheet, once it has one, still needs
  `/design` to be able to load it — across ships, which nobody has decided. **If you mock a
  Tabletop specimen with candidate CSS, label it a mock** (ticket 11 did) — and stage it on
  `.stage-white`, not `.stage-dark` (ticket 11's first draft got this wrong and was corrected
  live). Don't settle the architecture quietly on the way past.

  **The cross-app stylesheet question is still genuinely unresolved, now that the real thing
  is built (ticket 14, 2026-08-08).** `mtg-zone`'s visual treatment landed as inline
  `CSSProperties` objects in the shape's own `.tsx`, not as CSS classes — so there was never a
  Tabletop stylesheet for `/design` to try to load, and the mock's honesty was never actually
  tested against a real one. The question this bullet raised (can `/design` load a genuine
  Tabletop stylesheet across the ship boundary) is exactly as open as it was after ticket 11;
  ticket 14 is evidence the mock was *good enough to decide by*, not evidence the architecture
  question was answered.

## When a choice is resolved — the checklist

1. Move the winning CSS out of `design-candidates.css` into the stylesheet that **owns**
   the component (`playmat.css` for shared playmat chrome, `site.css` for site pages,
   `styles.css` for anything global). Delete the losing candidates.
2. Update the call sites listed above.
3. In `apps/shuffler/views/design.ejs`: convert the `.choice` block into a plain specimen
   tagged `badge-standard`, and add the rule to the House Rules list at the bottom.
4. Remove the row from the open-choices table in [README.md](README.md) and state the
   decision in its design-language section. Mark it DECIDED here with the date and the
   reasoning.
5. Add an entry to [history.md](history.md).
6. Update `apps/shuffler/CLAUDE.md` → UI Style if a stated rule changed.
7. Run the gallery test: `npx playwright test verify-design-gallery` against a running
   server (see `verify.sh`). It asserts computed values — a deliberate change may
   legitimately break it; update the spec in the same commit.
8. **Cite by selector, never by line number** — see
   [README.md → How to cite code in this KB](README.md#how-to-cite-code-in-this-kb-standing-convention-2026-08-07).
   This step used to read "re-verify every `file:line` citation after each choice lands," which
   was a whole manual sweep, every time, forever. It rotted anyway: after choices 1 and 2,
   essentially every citation here was stale (choice 3's nine all wrong); choice 5's 12-line
   `playmat.css` insert moved 8 of choice 3's and 5 of choice 4's; the deck-title move
   (2026-08-07) invalidated ~20 across this file, `interactions.md` and `architecture.md` at
   once. That fourth time is what retired the practice. **If you find a surviving `file:NNN`
   anywhere in this KB, convert it as you pass.**
9. Commit, tagged `- claude`.
