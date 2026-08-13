# Deck title: on-brand Orbitron + deck-color text, baseline remeasured

Jess's calls (both explicit this session):
- Move the editable deck title to **Orbitron** (`--font-chrome`) — the on-brand restyle
  that was deliberately deferred when the label became the `mtg-title` shape.
- Color the text with **the darker of the deck's primary/secondary identity colors**.
- Keep the life counter + commander-damage counters resting on the title's text baseline
  ("make the life counter align with the baseline again"). Jess's insight: it's the
  `<input>`, not the font, that moved the baseline — the browser input positions its text
  differently than tldraw's old stock-text render, so `NAME_TEXT_BASELINE = 50` (measured
  off the old stock serif render) is already stale, before Orbitron even enters.

## Facts established
- `seat.joined` payload already carries `primaryColor`/`secondaryColor` as hex
  (`^#[0-9a-fA-F]{6}$`), both optional/additive. They flow through `seatJoined.ts` →
  `PlayerAreaLook` → `ensurePlayerArea`, but are currently rendered nowhere — this is
  their first use. Contract says `primaryColor` is already "the darker of the playmat's
  curated pair," but I'll compute the darker of the two by luminance so the sleeve-fallback
  case (where `primaryColor = sleeveColor`) still honors "the darker one."
- On-canvas Orbitron precedent: `MtgZoneShapeUtil` uses `fontFamily: var(--font-chrome)`,
  `fontSize: 24`, `color: var(--deep-space)` (#221534). Confirms Orbitron resolves inside
  `HTMLContainer` and `--deep-space` is the house dark for canvas chrome.
- `--mana-G` (#2a8439) is a false friend and not involved; the color now comes from the
  deck's own identity hexes, not a palette token.

## Changes
1. `src/shared/mtgTitleShape.ts` — add `color: string` to `MtgTitleShapeProps` and
   `mtgTitleShapeProps` (`T.string`). Single source; `rooms.ts` already imports
   `mtgTitleShapeProps` for the server `createTLSchema`, so both client and server pick up
   the new prop.
2. `src/server/tableFurniture.ts` — a pure `darkerColor(a?, b?)` helper (relative-luminance
   compare, pick darker; fall back to `var(--deep-space)` when neither present). Pass its
   result as the new `color` prop when putting the `mtg-title` shape. Unit-tested.
3. `src/client/shapes/MtgTitleShapeUtil.tsx` — `fontFamily: var(--font-chrome)`,
   `color: shape.props.color`; drop the "faithful reproduction" comment. `getDefaultProps`
   color defaults to `var(--deep-space)`. Keep fontSize 28 unless it clips in the 40px band
   (verify live).
4. `src/server/cardLayout.ts` — remeasure `NAME_TEXT_BASELINE` against the live input
   render (Orbitron, fontSize 28, lineHeight 40 inside the `<input>`), update the comment
   to say the metric is the input's text baseline, not the old stock-text baseline.

## Verify
- Unit: `darkerColor` picks the darker hex; falls back when a color is missing.
- Unit: the `mtg-title` shape carries the computed `color` prop.
- Existing `cardLayout.test.ts` baseline assertion updates to the remeasured value.
- Playwright: title renders Orbitron in the deck's darker color; counters' bottoms sit on
  the text baseline (screenshot check with a descender title + a commander-damage counter).
