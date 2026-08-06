---
name: shuffler-looks-like-itself-update
description: >
  Update the fleet design-language knowledge base after a change landed. Use after
  implementing anything that added or changed UI on any ship, edited a Shuffler
  stylesheet (styles.css, site.css, playmat.css, game.css, prepare.css,
  deck-selection.css, docs.css, design-candidates.css) or any Tabletop CSS, added or
  renamed a CSS token, changed the /design gallery, added a stylesheet or font, resolved
  one of the open design choices, hit a tldraw styling limit worth recording, or touched
  views/partials/head.ejs or src/view/common/html-layout.ts.
context: fork
background: false
---

# Update: the Shuffler looks like itself

A change has landed. Bring the knowledge base back in line with reality — a KB that
drifts becomes a confident lie, which is worse than no owner.

## Procedure

1. **Read all five KB files first:** `owners/shuffler-looks-like-itself/README.md`,
   `open-choices.md`, `interactions.md`, `architecture.md`, `history.md`.

2. **Read the actual diff, not the summary.** `git diff` / `git show` on the changed
   files. Descriptions of CSS changes are unreliable — a summary saying "styled the new
   button" tells you nothing about whether it used a token or a raw hex. Look.

3. **Check the change against the rules while you're in there.** If it introduced a raw
   hex, a round corner on chrome, a missing focus state, or a fourth typeface, say so in
   your report. Don't silently document a violation as though it were the standard —
   that's exactly how the drift replicates. Offer to fix it, or drop a buoy.

4. **Update what actually moved:**

   - **`README.md`** — if the design language itself changed (a new token, a settled
     rule, a new component family), or if an **open choice was resolved**. When a choice
     is resolved: remove its row from the open-choices table and state the decision in the
     design-language section.
   - **`open-choices.md`** — mark the resolved choice **DECIDED** with the date and the
     reasoning (don't delete it — the reasoning is the valuable part), and tick off any
     mechanical cleanup that landed. Follow its "when a choice is resolved" checklist; it
     is the authority on what else must move.
   - **`architecture.md`** — if a stylesheet was added/removed, a component moved between
     files, a duplicated block was fixed (**delete it from the traps list**), the
     `<head>`s changed, the z-index ladder changed, or the gallery's structure changed.
   - **`interactions.md`** — if the edges moved: a new dependency, a new watch point, a
     watch point that no longer applies, or a new owner overlap. Keep watch points
     concrete ("if X changes, update `file:line`"), never "be careful with X".
   - **`history.md`** — add an entry for anything with a *why*: a resolved choice, a
     convergence pass, an approach tried and abandoned. Group under a dated heading.
     Include the commit sha once it exists.

5. **Keep `/design` honest.** This is the part most likely to be skipped and most costly
   to skip:
   - New component? It needs a specimen in `apps/shuffler/views/design.ejs`.
   - New token? It needs a swatch in the "Named tokens" grid — and if it replaced an
     orphan hex, remove that orphan's swatch.
   - Choice resolved? Convert the `.choice` block into a plain specimen tagged
     `badge-standard`, move the winning CSS out of `design-candidates.css` into the
     stylesheet that owns the component, and delete the losing candidates.
   - New stylesheet? Add it to `design.ejs` **and** to `APP_STYLESHEETS` in
     `test/verification/verify-design-gallery.spec.ts`.

6. **Update `apps/shuffler/CLAUDE.md` → "UI Style"** if a stated rule changed. That
   section is the short public version of this owner.

7. **Run the gallery test** — `npx playwright test verify-design-gallery` against a
   running server (see `verify.sh`) — so you know the gallery still renders and still
   agrees with the app.

8. **Commit** the KB updates, tagging the message `- claude`.

## Report back

What you changed in the KB, anything the diff revealed that contradicts the design
language, and anything you left as a gap.
