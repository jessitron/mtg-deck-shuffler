# design-playmat-specimen: plan

## Problem

`.design-page .stage-playmat` in `apps/shuffler/public/design-gallery.css` hand-copies the
real playmat's look (art URL, `background-size: cover`, `background-position: center`, and
its own `3px solid black` border) instead of inheriting the real `.playmat` rule now defined
in `apps/shuffler/public/playmat.css` (unified 2026-08-07/2026-08-10: shared art + fill +
`border: 10px solid black`, radius stays per-page, no box-shadow on either page as of
today). This is exactly the drift `/design` exists to prevent.

## Change

1. **`apps/shuffler/views/design.ejs`** — every specimen stage currently marked
   `class="stage stage-playmat"` (13 occurrences: buttons section ×5, table-look ×1, focus
   ×1, inputs ×2, surfaces ×2, cards ×2) becomes `class="stage playmat"`. This drops the
   lookalike class entirely and puts the real `.playmat` class directly on the stage
   wrapper, so it inherits background-image/size/position and the black border from the
   real rule in `playmat.css` (already loaded on `/design`).

2. **`apps/shuffler/public/design-gallery.css`** — delete the old `.design-page
   .stage-playmat` block (background-image/size/position/border, all hand-copied). Add a
   narrow override:

   ```css
   .design-page .stage.playmat {
     border-width: 3px;
   }
   ```

   This only thins the border for the specimen's smaller scale — color and style (`solid
   black`) still come from the real `.playmat` rule; nothing about the mat's *look* is
   redeclared. `.design-page .stage.playmat` (3 classes, specificity 0,3,0) beats the bare
   `.playmat` rule (0,1,0) regardless of load order, so this is safe even though
   `design-gallery.css` already loads after `playmat.css` in `design.ejs`'s
   `additionalStyles`.

   This follows the gallery's existing convention (seen with `.table-look-panel`,
   `.cool-command-zone-surround`, `.game-title`, `.modal-dialog`, `.game-menu-panel`,
   `.precon-tile`): a `.stage-*`/`.stage` wrapper supplies only gallery layout chrome, and
   the actual component keeps its own real class unmodified. The one thing new here is that
   the *wrapper itself* also doubles as the real component (the playmat *is* the backdrop
   these other specimens sit on), rather than the component being a child element inside a
   generic stage.

3. **`apps/shuffler/test/verification/verify-design-gallery.spec.ts`** — add a test
   asserting `.design-page .stage.playmat` computes: `backgroundImage` containing
   `aeoe-43-cascading-cataracts.png`, `backgroundSize: cover`, border-top-style `solid`,
   border-top-color `rgb(0, 0, 0)`, border-top-width `3px`, and `boxShadow: none` (the
   2026-08-10 shadow removal must not silently regress here).

## Not in scope

- No change to `playmat.css` itself.
- No change to the 13 specimens' *content* (buttons, table-look panel, focus targets,
  inputs, surfaces, cards) — only the wrapper class.
- Doesn't touch `.playmat-mock` (design-candidates.css) — that's a Tabletop mock, unrelated.
