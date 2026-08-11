# 01 — Shuffler's command-zone and title backgrounds use the secondary color

Mountain: tabletop-replaces-mural
Ship: shuffler
Status: resolved

**What to build:** Today, the command-zone surround and the deck-name title on both
`/prepare` and `/game` tint their backgrounds with the player's raw sleeve color (falling
back to `--light-pink` when no sleeve is chosen), via `sleeveTintStyle()`. Add a new pure
function, `colorsForPlaymat(playmatImagePath, sleeveColor)`, that resolves a
`{ primaryColor, secondaryColor }` pair from the chosen playmat's curated `chosenTwo` colors
(`playmat-colors.json`) and the sleeve choice:

- If a sleeve is chosen: primary = the sleeve color; secondary = whichever of the playmat's
  two curated colors contrasts more with the sleeve (reuse the existing `isDarkHex` helper in
  `shared-components.ts` as the basis for the contrast/darkness comparison).
- If no sleeve is chosen: primary = the darker of the playmat's two curated colors; secondary
  = the other one.
- If the playmat has no `chosenTwo` entry: fall back to the existing fixed default pair so
  callers never receive an undefined color.

Wire this into both background spots — the command-zone surround and the game-title — on
both `/prepare` and `/game`, feeding `secondaryColor` into `sleeveTintStyle()` in place of
the raw sleeve color it takes today. The sleeve's own rendering (wherever sleeve color is
shown as itself, not as a background tint) is untouched — this ticket only changes what
feeds these two background tints.

No contract change, no Tabletop change — this is fully visible and verifiable within the
Shuffler alone (`/prepare` and `/game` in the browser, plus the unit test below).

**Blocked by:** None — can start immediately.

- [x] `colorsForPlaymat(playmatImagePath, sleeveColor)` added to `table-look.ts`, unit tested
  in `table-look.test.ts` (sleeve-chosen contrast case, no-sleeve darker-of-two case, missing
  `chosenTwo` fallback case)
- [x] Command-zone surround background on `/prepare` uses the resolved secondary color
- [x] Command-zone surround background on `/game` uses the resolved secondary color
- [x] Deck-name title background on `/prepare` uses the resolved secondary color
- [x] Deck-name title background on `/game` uses the resolved secondary color
- [x] No playmat with no `chosenTwo` entry breaks rendering (falls back cleanly)
