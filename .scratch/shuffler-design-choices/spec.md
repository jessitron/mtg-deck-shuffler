# Resolve the four open Shuffler design choices

Mountain: safe-harbor
Status: ready-for-agent

Jess answered choices 3, 4, 5 and 6 on **2026-08-06**. Choices 1 and 2 landed 2026-08-02.
This spec records the decisions and their reasoning; the four issues execute them, one
commit each.

The authority on options, call sites and the resolve checklist remains
`owners/shuffler-looks-like-itself/open-choices.md`. This spec does not replace it — it
supplies the answers it was waiting for, and corrects its stale citations (below).

## The decisions

### 3 — Card-modal action buttons: **split by kind**

Destinations (where the card goes) are `--dark-pink` primary; utilities (Gatherer, Copy,
Flip, Recover) are `--deep-space` secondary.

**This was neither staged option.** `/design` offered A (keep seven Material hues) and B
(one primary, everything else secondary). Jess chose a third: two families, split so the
color carries meaning — *this moves the card* vs *this is a tool*. Record it that way when
marking the choice DECIDED, so a future reader doesn't go looking for it on the old page.

### 4 — Chrome radius: **soften what you press**

`--radius-soft: 4px` on pressables; `0` on flat surfaces; physical objects keep their real
radii.

Jess's rationale, worth keeping verbatim because it's the rule agents will follow:

> While I want square corners, there are times when the square gets painfully pointy. So on
> buttons and stuff, there is a "not too pointy" minimal border radius. (4px is acceptable.)
> Of course cards have their border radius, that's how they really are.

So square is the aesthetic and the softening is a **concession applied exactly where the
pointiness reason applies** — things that are raised or that you press. This is why the line
falls at "do you touch it", not at "is it small": a size test would make the next agent
guess, and this one they can apply.

### 5 — Focus ring: **`3px solid var(--light-pink)`, `outline-offset: 3px`**

Global `:focus-visible` in `styles.css`.

Measured while deciding: light-pink on the site pages' dark gradient (`#221534`) is about
**10.9:1**. An earlier framing in the discussion called this option "faint on white" — that
was wrong; `site.css:8` overrides the body to a dark purple gradient, so the site pages are
this option's *strongest* ground, not its weakest.

The residual risk is **pale passages in card art** behind `.playmat` and `.page-container`,
which are background *images*. That risk is identical under all three options. If the ring
fails there, the fix is a hairline `--deep-space` companion — **not** a different color. The
decision stands.

### 6 — Text input: **the tokenized candidate**, adapted

`.candidate-input` from `design-candidates.css` becomes the one input, with two changes from
the staged version: `4px` radius rather than `0` (an input is a thing you touch, per choice
4), and **no focus rule of its own** so choice 5's global ring applies.

It's the only candidate built from a token. The other two rest on `#ddd` and `#888`, each of
which would need a color invented for it.

## Audit corrections (verified 2026-08-06)

`open-choices.md`'s choice-4 list was stale and incomplete:

- **`.table-cards-button` 2px does not exist.** No `border-radius` on it at all.
- **Three rules the doc never listed:** `.card-buttons button, .library-buttons button` 4px
  (`playmat.css:71`), `.cool-command-zone-surround .multiple-cards` 2px (`:138`), and
  `.end-game-actions a`, which shares the grouped rule at `game.css:559-569` with
  `.menu-section button`.
- **Three listed rules are duplicated across files** — two edits each, not one:
  `.modal-dialog` and `.modal-close` (`playmat.css` + `prepare.css`),
  `.commander-placeholder` (`game.css` + `prepare.css`).
- **12 distinct non-zero values, not 13.** The doc's own two lists never summed to its number.

Choice 6's citations were mostly right; `deck-selection.css:78-98` conflates three separate
rules (the shared input, its `:focus`, and `#deck-number`'s sizing).

## Order

Ordered so structural churn lands last and each commit leaves the app coherent.

| # | Issue | Why here |
| --- | --- | --- |
| 01 | Global focus ring | Accessibility first; purely additive; removes two live regressions |
| 02 | One text input | Introduces `--radius-soft`; rewrites the rules 01 just touched |
| 03 | Modal buttons by kind | Restructures `playmat.css` — shifts every line below it |
| 04 | Radius sweep | Value-only edits, so no line churn; catches what 02 and 03 introduced |

## Per-commit ritual

`open-choices.md` → "When a choice is resolved" is the authority, and every issue runs all
of it. The step most likely to be skipped and most costly to skip is the last one:
**re-verify the `file:line` citations in every remaining choice.** That has already rotted
twice, and issue 03 will shift everything below it in `playmat.css`.

Consult the owner's `-review` skill before implementing each, and `-update` after.

## Verification

From `apps/shuffler/`: `npm run build && npm test` per commit;
`npx playwright test verify-design-gallery` against a running server (it asserts computed
values, so 03 and 04 will legitimately break it — update the spec in the same commit);
`./verify.sh` before the last commit lands.

Manual, `PORT=3344 ./run` — **tab through every page with the keyboard.** That is the real
test of issue 01 and nothing automated here covers it.

## Out of scope — capture separately

- `404.html`'s inline `<style>` radii (15px, 8px), governed by no stylesheet.
- `game-modals.ts:245`'s inline `color: #333`, the only non-gallery inline hex.
- Flip-button de-duplication and the two-arrows restyle — unblocked by this work, not part
  of it.
