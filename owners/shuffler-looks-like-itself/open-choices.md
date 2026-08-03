# Open choices — the work list

**Status: in progress.** Choices 1 and 2 are DECIDED (2026-08-02). Choices 3–6 await Jess's
answers, one commit at a time. Tracked as
**[JES-155](https://linear.app/honeycombio/issue/JES-155)**.

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

Seven unrelated Material hues, none of them brand colors:
`playmat.css:443` (recover), `:448` (gatherer), `:458` (copy), `:463` (flip), `:544`
(play), `:549` (put-in-hand), `:554` (put-on-top), `:559` (put-on-bottom), `:564`
(secondary).

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

## 5. Focus ring

**This is the accessibility item, and it's worse than "missing".** The app has one focus
*outline* (`site.css:330`, `.button-base:focus`). Two more rules —
`deck-selection.css:59` and `:86` — actively set `outline: none` and replace it with a
border-colour change, which is a regression for keyboard users, not a style choice.
Everything else has nothing.

| Option | |
| --- | --- |
| A | `3px solid var(--dark-pink)`, flush — matches the one existing rule; can vanish on dark playmat art |
| B | `3px solid var(--light-pink)`, `outline-offset: 3px` — reads on the playmat; weaker on white |
| C | light-pink outline + 6px `--deep-space` halo — visible on every background; heaviest |

**Decision:** _(pending)_

**Implementation:** this one is global, so it goes in `styles.css` (the only sheet every
page loads), as a `:focus-visible` rule on `a, button, input, select, textarea, summary,
[tabindex]`. Then remove the `outline: none` at `deck-selection.css:60` and `:88`. Keep
`site.css:330` or let the global rule supersede it.

---

## 6. Text input treatment

| Option | |
| --- | --- |
| A | `.precon-search-input` — `deck-selection.css:49`, 2px `#ddd`, Orbitron, largest |
| B | `.join-table-fields input` — `prepare.css:311`, 1px `#888`, compact, inherits Ovo |
| **C (recommended)** | `.candidate-input` in `design-candidates.css:198` — 2px `--deep-space`, Orbitron, real focus state, one rule with a size variant |

**Decision:** _(pending)_

**Sites:** `deck-selection.css:49-68` (search), `:78-98` (Archidekt deck number),
`prepare.css:311-318` (join-table).

---

## Falls out of the above — no decision needed

Do these as their own commits once the choices are settled. They're mechanical.

- **Tokenize the orphan colors.** 57 distinct hex values today; ~14 of them are
  Material/Bootstrap defaults on single buttons. Choices 2, 3 and 6 kill most of them.
  Whatever survives needs a name in `styles.css` `:root` and a swatch on `/design`.
- **De-duplicate the three copy-pasted blocks** (see `architecture.md` → Traps): modal
  styles in `playmat.css` + `prepare.css`; flip styles in `game.css` + `prepare.css`;
  library-list styles in `playmat.css` + `prepare.css`. Prepare loads `playmat.css`
  already, so in each case the `prepare.css` copy can likely just go — verify the
  `font-family: "Ovo"` addition on its `.card-name-link` isn't load-bearing first.
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
8. Commit, tagged `- claude`.
