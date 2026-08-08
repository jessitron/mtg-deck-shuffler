# Harden the playmat: one appearance, two scales

Mountain: overhead
Type: task
Status: done — landed in a4991f3; kept as rationale for the open `playmat-drop-shadow` TODO item

## Why now

The `.page-container` → `.playmat` rename (`7487393`) put the domain word on both play
screens, but deliberately left the two treatments behind page modifiers and dropped a buoy
(`playmat-two-visual-metaphors`) asking whether they should converge.

Jess answered directly (2026-08-07): **"The playmat is a concept we haven't hardened yet.
The inconsistencies are historical reasons, they're not good."** Plus a bug: the game
playmat's background art doesn't load for her. It loads in headless Chromium, so this is
not reproduced — the likely cause is that the art is **hotlinked from Scryfall's CDN**
(`cards.scryfall.io`), which an extension or Scryfall's own hotlink/rate-limit protection
can block. Switching to the local asset removes the third-party dependency regardless of
what exactly blocked it.

## What Jess decided

1. **Local image, not Scryfall.** Use the asset already in the repo.
2. **Both borders 10px.**
3. **Border radius stays different** — "a matter of scale; the playmat representation on
   /prepare is smaller, that's all." So radius is legitimately per-page, not drift.

## The change

Shared appearance moves into the bare `.playmat` slot in `playmat.css` — the slot the
rename left empty with a comment saying "this is where shared appearance goes the day the
two treatments converge." That day is today.

### `playmat.css` — new bare `.playmat` rule

```css
.playmat {
  background-image: url('/images/aeoe-43-cascading-cataracts.png');
  background-size: cover;
  background-position: center;
  border: 10px solid black;
}
```

Replaces the placeholder comment.

### `game.css` — `.playmat-game` keeps only what is game-specific

Removes: `background-image` (the Scryfall hotlink), `background-size`, `border: 5px black solid`.
Keeps: `width`, `max-width: 1800px`, `margin: 0 auto`, `margin-bottom: 5px`,
`box-shadow: 5px 5px black`, `padding-bottom: 20px`, `border-radius: 80px`.

### `prepare.css` — `.playmat-prepare` keeps only what is prepare-specific

Removes: `background-image`, `background-size`, `background-position`,
`outline: 10px solid black`.
Keeps: the grid (`display`, `grid-template-columns`, `grid-template-rows`), `margin`,
`min-height`, `padding`, `max-width`, `border-radius: 20px`.

Note this swaps an **outline** for a **border** on /prepare. `styles.css` sets a global
`* { box-sizing: border-box }`, so the mat's outer footprint is unchanged and its content
box shrinks by 20px. That is the intended consequence of the two mats sharing one edge.

## Deliberately NOT changed

- **`box-shadow: 5px 5px black` stays game-only.** Jess named three convergences; this
  wasn't one, and it isn't obviously drift — it may be part of the "giant Magic card"
  reading on /game. Flagging it as the one remaining difference for her to call rather
  than converging it unasked. (This is the scope-of-approval rule: don't let extra
  appearance changes ride along.)
- Radius stays 80px/20px, per Jess: scale, not drift.

## Verification

- `npm run build`, `npm test`
- `./verify.sh verify-design-gallery verify-deck-title-placement verify-prep-commander-flip`
- Screenshots of /prepare, /game, /design compared against the pre-change set
- Confirm no request to `cards.scryfall.io` remains for the mat art
