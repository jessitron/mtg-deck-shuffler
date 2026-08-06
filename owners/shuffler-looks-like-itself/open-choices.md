# Open choices — the work list

**Status: in progress.** Choices 1 and 2 are DECIDED (2026-08-02); **choice 5 is DECIDED and
shipped (2026-08-06)**. **Jess answered choices 3, 4 and 6 on 2026-08-06** — the answers and
their reasoning are in `.scratch/shuffler-design-choices/spec.md`, and `issues/02`–`04`
execute them one commit at a time. Choices 3, 4 and 6 are still marked `_(pending)_` below
until their commits land and run the resolve checklist.

**Line numbers below were re-verified 2026-08-06 after choice 5 landed** (its insert shifted
everything below `playmat.css:172` by +12).

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

Seven unrelated Material hues, none of them brand colors (line numbers re-verified
2026-08-06 **after choice 5 landed** — all shifted `+12` by its `playmat.css` insert):

| Rule | `playmat.css` | Fill |
| --- | --- | --- |
| `.recover-button, .copy-button` (one shared rule) | `:487` | `#2196f3` blue |
| `.gatherer-button` | `:504` | `#4caf50` green |
| `.flip-button` | `:518` | `#ff9800` orange |
| `.play-button` | `:608` | `#e91e63` pink |
| `.put-in-hand-button` | `:622` | `#9c27b0` purple |
| `.put-on-top-button` | `:636` | `#3f51b5` indigo |
| `.put-on-bottom-button` | `:650` | `#673ab7` deep purple |
| `.secondary` | `:664` | `var(--deep-space)` — already settled by choice 2 |

| Option | Tradeoff |
| --- | --- |
| A | Keep color coding — learnable per-destination color, but seven off-brand hues |
| B | One primary (`--dark-pink`) + rest secondary — two tokens, most likely action stands out, loses the color learning |

**Decision:** _(pending)_

If B, the `.modal-action-button.*` variant rules collapse into two classes; update
`views/partials/card-modal.ejs` and `src/view/play-game/game-modals.ts` accordingly.

---

## 4. Corner radius on chrome

13 distinct values in use. The stated rule is square-except-physical.

| Option | |
| --- | --- |
| A | Truly `0` — matches the written rule and the newest code |
| B | A single `4px` — closer to where most CSS already sits, but contradicts the rule |

**Decision:** _(pending)_

**`playmat.css` line numbers, re-verified 2026-08-06 after choice 5:** `:71` (4px) and `:138`
(2px) are unchanged — both sit above choice 5's insert at `:172`. Everything below shifted
`+12`: `.modal-dialog` 10px is now `:180`, `.modal-close` 4px now `:211`, and the 8px/8px/6px
trio now at `:460`, `:567`, `:603`. `game.css` and `prepare.css` radius lines were untouched
by choice 5.

**Keep round regardless** (these are physical objects): `.mtg-card-image` 10px,
`.commander-placeholder` 10px, `.playmat` 20px, `.page-container` 80px,
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
`:focus-visible` rule** in `styles.css:200-209` on `a, button, input, select, textarea,
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

- `playmat.css:173-176` — a companion rule, `.modal-overlay:focus-visible,
  .card-modal-overlay:focus-visible { outline-offset: -3px }`. `tabindex="0"` appears in
  exactly four places and all four are the modal overlay (`views/partials/card-modal.ejs:21`,
  `views/partials/library-modal.ejs:59`, `src/view/play-game/game-modals.ts:12`,
  `src/view/play-game/history-components.ts:11`). Those are fixed full-viewport elements, so
  the standard `+3px` offset draws the ring *outside* the viewport where it clips to nothing —
  a keyboard stop that looks unfocused, i.e. the exact deficit this choice closes. The offset
  is turned inward so it reads as a frame. In `playmat.css` only (prepare loads it, and the
  modal block is already duplicated across playmat/prepare — don't grow that).
- `site.css` — `.button-base:focus` deleted. Verified nothing was lost: `.button-base` only
  ever lands on `<a>`/`<button>` (`views/index.ejs:33,53`, `views/prepare.ejs:53`,
  `views/choose-any-deck.ejs:20,28`, `views/partials/deck-selection-archidekt.ejs:5`), both
  covered by the global selector.
- `design-candidates.css` — the three focus candidates deleted, plus
  `.candidate-input:focus-visible` (it *was* choice 5's rejected dark-pink flush treatment,
  and spec.md §6 decided the adopted input carries no focus rule of its own). See the note
  under choice 6.

### Two open risks — recorded, not resolved

1. **`--light-pink` on white measures ~1.35:1**, under WCAG 1.4.11's 3:1 floor for non-text
   indicators. `spec.md` frames the residual risk as pale passages in the playmat's card art,
   but the app has real flat-white surfaces: `.modal-dialog { background: white }`
   (`playmat.css:180` and the `prepare.css` duplicate), `docs.css:130`, and
   `.button-base:disabled` `#f0f0f0`. **The library/history modal interior is the likeliest
   failure, ahead of the card art.** Not yet verified by eye.
2. **The sanctioned fallback collides with choice 1.** If the ring needs help, spec.md says
   add a hairline `--deep-space` companion. A halo can only be drawn with `box-shadow`, and
   `box-shadow` does not accumulate across rules — so it would **erase** `.pushable-flat`'s
   two-layer press bevel (`styles.css:150-180`) on every focused button. `::after` is not an
   escape hatch (inputs can't have pseudo-elements). So the companion means re-declaring the
   bevel inside `:focus-visible` for both `.pushable-flat` and `.pushable-flat.pushable-dark`.
   That's a real cost that goes **back to Jess** rather than being absorbed. A warning to this
   effect is in the `styles.css` comment.

**Still outstanding:** manual keyboard tab-through. Build (`npm run build`), unit tests
(224/224) and `npx playwright test verify-design-gallery` (5/5) all pass, but the real test of
this ticket is a human tabbing through `/`, `/choose-any-deck`, `/prepare`, `/game`, `/docs`
(link-dense, own second `:root`), `/design`, the debug state view (the `<summary>` case), and
**inside an open library modal and card modal** (the white-surface and overlay cases).

---

## 6. Text input treatment

| Option | |
| --- | --- |
| A | `.precon-search-input` — `deck-selection.css:49`, 2px `#ddd`, Orbitron, largest |
| B | `.join-table-fields input` — `prepare.css:311`, 1px `#888`, compact, inherits Ovo |
| **C (recommended)** | `.candidate-input` in `design-candidates.css` — 2px `--deep-space`, Orbitron, one rule with a size variant |

**Decision:** _(pending)_

**Sites, re-verified 2026-08-06 after choice 5** (which deleted the two `:focus` rules that
used to sit inside these ranges): `.precon-search-input` `deck-selection.css:49-57` with its
`::placeholder` at `:59-62`; `.archidekt-input-section input` `:72-78`; `#deck-number`
`:80-86`; `.join-table-fields input` `prepare.css:311` (unchanged).

**Note for `issues/02`:** the candidate no longer carries a focus rule of its own —
`.candidate-input:focus-visible` was **already deleted** by choice 5 (it was that choice's
rejected dark-pink flush treatment, and spec.md §6 decided the adopted input takes the global
ring instead). So "real focus state" is no longer a point in C's favour; the global ring gives
it to all three options equally. `.candidate-input` and its `::placeholder` remain.

---

## Falls out of the above — no decision needed

Do these as their own commits once the choices are settled. They're mechanical.

- **Tokenize the orphan colors.** 57 distinct hex values today; ~14 of them are
  Material/Bootstrap defaults on single buttons. Choices 2, 3 and 6 kill most of them.
  Whatever survives needs a name in `styles.css` `:root` and a swatch on `/design`.
  Choice 5 took two off the list — the `rgba(219,39,119,.3)` Tailwind pink and one
  `rgba(76,175,80,.3)` **Material green** both left with the deleted input `:focus` rules.
  Material green **survives once**, at `game.css:455` (`.hand-drop-zone.drag-over`,
  `background-color: rgba(76,175,80,.2)`), and now belongs to this cleanup rather than to
  focus work.
- **De-duplicate the copy-pasted blocks** (see `architecture.md` → Traps). There are
  **four**, and "flip" is two separate ones — the container and the button:
  - modal styles in `playmat.css` + `prepare.css`;
  - flip **container** styles (`.flip-container-outer/-inner`, `.two-sided-front/-back`)
    in `game.css:97-133` + `prepare.css:210-244` — still verbatim identical;
  - flip **button** styles in **`playmat.css:518`** (`.modal-action-button.flip-button`)
    + **`prepare.css:246`** (bare `.flip-button`) — **already diverged** (verified
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
  (`playmat.css:518`, `prepare.css:246`; see the de-duplication item above), and the
  prepare copy's `border-radius: 5px` is one of the values choice 4 governs. No decision
  needed on the *look* — Jess has said what she wants — but it can't land until choice 4
  settles the radius question it's entangled with, and it should de-duplicate at the same
  time rather than restyle two copies. The `#ff9800` swatch on `/design`
  (`design.ejs:162`) goes with it.
- **Collapse the second `:root`.** `docs.css:3-10` re-declares `--deep-space`,
  `--dark-pink`, `--light-pink` and adds three link tokens that exist nowhere else.
- **Delete the debug leftover:** `site.css:171-174`, `.step > * { border: 0px solid red }`.
- **Adopt a spacing scale.** No scale exists. Proposed: `4 · 8 · 12 · 16 · 24 · 32 · 48`
  — every current value rounds to one of these within 2px except 5, 15 and 18.

---

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
8. **Re-verify the `file:line` citations in every *remaining* choice.** Resolving a choice inserts
   or deletes rules, which silently shifts every line number below it in that stylesheet. This has
   already happened twice: after choices 1 and 2 landed, essentially every citation in this file
   was stale — choice 3's nine were all wrong, choice 5's and choice 6's each off, and
   `.button-base:focus` had moved. A wrong line number sends the next session editing the wrong
   rule, and it's the one kind of rot nobody notices until they're mid-change.
   **Choice 5 (2026-08-06) shifted them a third time** — a 12-line insert at `playmat.css:172`
   moved all 8 of choice 3's citations and 5 of choice 4's, and deleting the two input `:focus`
   rules moved choice 6's. All re-verified in the same commit. Cheap way to do it: `grep -n` the
   selector rather than trusting the recorded number, and remember the citations in
   [interactions.md](interactions.md) and [architecture.md](architecture.md) shift too.
9. Commit, tagged `- claude`.
