# Give the Shuffler one global focus ring

Mountain: safe-harbor
Status: ready-for-agent

Resolves **choice 5**. Do this first: it's the accessibility item, it's purely additive, and
it removes two live regressions. See [spec.md](../spec.md) for the decision and its reasoning.

## The decision

`3px solid var(--light-pink)` with `outline-offset: 3px`, as a global `:focus-visible` rule.

## Steps

1. Add to `apps/shuffler/public/styles.css` — the only sheet every page loads, the same
   reasoning that put `.pushable-flat` there:

   ```css
   a:focus-visible, button:focus-visible, input:focus-visible,
   select:focus-visible, textarea:focus-visible, summary:focus-visible,
   [tabindex]:focus-visible {
     outline: 3px solid var(--light-pink);
     outline-offset: 3px;
   }
   ```

2. Delete the two `outline: none` regressions **and** their mismatched glows in
   `deck-selection.css`: `:59-63` (`.precon-search-input:focus`, pink glow) and `:86-90`
   (`.archidekt-input-section input:focus`, **Material green** glow on a pink border — a
   bug, not a treatment anyone chose).

3. Remove `.button-base:focus` (`site.css:325`). It's a plain `:focus`, so it fires on mouse
   clicks; the global `:focus-visible` supersedes it.

4. Delete `.candidate-focus-dark-pink`, `.candidate-focus-light-pink` and
   `.candidate-focus-double` from `design-candidates.css`.

No shipped stylesheet uses `:focus-visible` today, so this is greenfield — there is no
existing rule to edit.

## Watch

`.begin-button` (`site.css:345`) carries a `10px solid var(--light-pink)` border, so the ring
is light-pink separated from a light-pink border by a 3px gap. On the dark gradient that gap
reads as a dark line and it should hold — but it's the one place this treatment could mush.
Look at it.

## Verify

Tab through `/`, `/choose-any-deck`, `/prepare` and `/game` with the keyboard. Expect ~10.9:1
on the site pages' dark gradient.

The real question is the play pages: `.playmat` and `.page-container` are background
**images** (`aeoe-43-cascading-cataracts.png`, a Scryfall PNG), so confirm the ring survives
their light passages. If it doesn't, the fix is a hairline `--deep-space` companion — not a
different color. The decision stands.

## Then

Run the "When a choice is resolved" checklist in
`owners/shuffler-looks-like-itself/open-choices.md`, including the citation re-verification.
`apps/shuffler/CLAUDE.md` → UI Style already states the focus-visible rule; make sure it now
names the actual treatment.
