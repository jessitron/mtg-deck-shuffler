# Collapse three text inputs into one

Mountain: overhead
Status: ready-for-agent

Resolves **choice 6**. Depends on [01](01-global-focus-ring.md) — the input deliberately
carries no focus rule of its own, so the global ring must exist first.

## The decision

`.candidate-input` from `design-candidates.css` becomes the one input, with two adaptations:
`4px` radius rather than `0` (an input is a thing you touch, per choice 4), and its
`:focus-visible` block **dropped** so issue 01's global ring applies.

## Steps

1. Add `--radius-soft: 4px` to `styles.css` `:root`. First consumer; issue 04 uses it broadly.

2. Move the candidate into `styles.css` as `.text-input` — **not** into `deck-selection.css`
   or `prepare.css`, because both site and play pages use inputs. Keep `2px solid
   var(--deep-space)`, Orbitron, white fill, `--deep-space` text. Set `border-radius:
   var(--radius-soft)`. Do not carry over its `:focus-visible` block.

3. Add a compact size variant for the short fields (deck number, join-table).

4. Replace the three existing treatments:
   - `deck-selection.css:49-68` — `.precon-search-input` + `:focus` + `::placeholder`. Delete.
   - `deck-selection.css:78-90` — `.archidekt-input-section input` + `:focus`. Delete. Keep
     `#deck-number:92-99`'s layout properties (`flex`, `min-width`, `height`) or fold its
     sizing into the compact variant.
   - `prepare.css:311-318` — `.join-table-fields input`. Delete. It inherits **Ovo**, which
     breaks the chrome/content font rule (fields are chrome), and it has **no focus rule at
     all** — it's been keeping the browser default while the other two suppressed theirs.

5. Add the class in the views: the precon and Archidekt partials under `views/partials/`, and
   the join-table fields in `views/prepare.ejs`. **Confirm the exact files before editing** —
   they weren't verified while planning.

6. Delete `.candidate-input`, `.candidate-input::placeholder` and `.candidate-input:focus-visible`
   from `design-candidates.css`.

## Flag

The candidate's `::placeholder` is `#7a7285`, an orphan hex. Either give it a token or derive
it from `--deep-space` — don't let it in raw. The whole point of picking this candidate was
that it's the only one built from tokens.

## Verify

`/choose-any-deck` — the deck search and the Archidekt number field. `/prepare` — the
join-table fields. All three should now be one thing in Orbitron, and all three should show
the light-pink ring on keyboard focus and **not** on mouse click.

## Then

Run the "When a choice is resolved" checklist in
`owners/shuffler-looks-like-itself/open-choices.md`, including the citation re-verification.
