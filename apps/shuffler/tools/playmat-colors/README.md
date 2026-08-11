# playmat-colors

Dev tool: extracts contrasting, saturated accent colors from a playmat image via a
local web picker. Standalone project (its own `package.json`, not an npm workspace
member) so `sharp` never touches the Shuffler's lockfile or Docker image.

## Setup (once)

```
npm install
```

## Use

```
npm start -- <image-filename>
```

`<image-filename>` is looked up in `apps/shuffler/public/images/playmats/`, e.g.:

```
npm start -- playmat-map.png
```

This prints suggested 2-color, 3-color, and 5-color (for sleeves) picks, then
starts a page at `http://localhost:4523`. It shows the image, a strip of
extracted candidate colors, and three editable slot groups prefilled with the
suggestion — or with whatever was saved for that image last time. Click a
slot to select it (highlighted border), then click a candidate swatch to
fill it — or click the 🎨 button next to a slot for the OS color picker.
Each slot group saves independently, and shows "● unsaved changes" whenever
its slots differ from what was last saved for that group.

Results are written to `apps/shuffler/public/images/playmats/playmat-colors.json`,
keyed by image filename, alongside `suggestedTwo`/`suggestedThree`/`suggestedFive`
(what the algorithm proposed) and `chosenTwo`/`chosenThree`/`chosenFive` (what
got saved). Re-running the tool on the same image preserves and re-offers the
prior choice.

Ctrl-C to stop.

## A note on `public/images/playmats/`

That directory currently holds **copies** of the playmat images — the originals stay at
`public/images/` because `table-look.ts`'s `PLAYMATS` list and `site.css` still reference
them there directly. Once the app is updated to serve playmats from `playmats/` instead,
the top-level copies can be deleted.
