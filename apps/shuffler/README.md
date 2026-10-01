# Shuffle your deck

**Deployed at: https://mtg.jessitron.honeydemo.io**

My real objective is to play Magic with my sister remotely. Here's our simplest-possible plan:
We create a Mural and paste pictures of the cards in there. Then we move them around the same way as when we're playing.
We have VC open so we're talking to each other as we do this, so we can communicate about what is happening.

Now, I want to try this today, but I don't have my deck with me. Also I want to make it easy to paste pictures of the cards in.

So, given a deck in archidekt.com, this web app will

- download the deck information from archidekt. https://archidekt.com/api/decks/14669648/ retrieves a bunch of JSON, including the cards, including a scryfall UID that we can use to get an image.
- tell me how many cards are in the deck
- put an image of my commander on the screen for me to copy into Mural
- shuffle the deck into a library.

... that's enough for now.

## Modes

- **Solo (default)** — no table name. Play/Discard copy the card image to the
  clipboard; play in Mural or wherever. The original workflow, unchanged.
- **At a table** — enter a table name + player name on the Prep screen. Play and
  Discard mutate immediately and send `card.played` to the Spine's event log,
  best-effort (`src/port-spine/`) — never blocking on the Tabletop. The Tabletop
  picks the card up over its own live subscription to the Spine's per-table SSE
  stream (`apps/tabletop`, `/t/:tableName`); there is no direct Shuffler→Tabletop
  call anymore. The game page shows an "at table _name_" link — share that URL
  for spectators.
- **Spectating** — open the table URL with no Shuffler game at all.

Env vars: `SPINE_URL` (server-to-server `card.played` sends; default
`http://localhost:4600`) and `TABLETOP_PUBLIC_URL` (the browser-facing
"at table" link, used only as a fallback when a game has no Spine-minted
`tableUrl`; default `https://table.jessitron.honeydemo.io`).

## Running

The Shuffler is one ship in a monorepo (see the [fleet README](../../README.md)).
Install from the repo root, run from here:

`npm install` (from the repo root — that's where the workspaces lockfile lives)

`./run` (from `apps/shuffler/`)

## Testing

### Unit Tests

`npm test` - Run unit tests (`test/**/*.test.ts`). Also works from the repo root.

### Verification Tests

`./verify.sh` - Build, start the app on port 3001, run the Playwright specs in
`test/verification/`, shut down. This is how user-visible changes get verified.

### No snapshot tests

There used to be HTML snapshot tests and `npm run test:snapshot*` scripts. They were
removed in January 2026 — high maintenance, unclear signal, and the end-to-end
verification tests cover user-facing behavior better. See
[notes/snapshot-tests-removed.md](../../notes/snapshot-tests-removed.md).

## Technical notes

This app uses TypeScript, with tsc for converting to JS. It's a toy.

It will use htmx only, and no JS unless absolutely necessary (such as for OTel instrumentation).

For that, it'll need a Node backend with express.

We'll use npm for dependencies and for running its scripts.

We will eventually deploy to a toy EKS cluster.

## Downloading precon decks

### From MTGJSON (Recommended)

To pick up newly released precons, run from the repo root (or this directory):

`npm run precons:fetch-mtgjson -- --convert --skip-existing`

This downloads `https://mtgjson.com/api/v5/AllDeckFiles.tar.gz` (plus `AllIdentifiers.json`, stream-parsed, for two-faced back-face lookups), converts each Commander Deck to our internal format (`cardTypes`, `twoFaced`, etc.), fetches Scryfall image URLs (`imageUris`/`backImageUris`) via `port-card-images/`, and saves the result to `decks/`. MTGJSON provides accurate release dates and complete metadata without rate limiting.

Options:

- `--convert` - Convert and save decks to the decks directory (without it, the script only lists what it found)
- `--skip-existing` - Convert only decks that aren't already in `decks/`; existing files stay untouched, so the diff is clean. Without it, every file is rewritten, including a fresh `provenance.retrievedDate` (a noisy diff).
- `--keep-temp` - Keep temporary downloaded files for inspection

### Repairing existing decks

The fetch already adds image URLs and full set names to every deck it converts, so a `--skip-existing` run needs no follow-up. These commands repair decks that are already in `decks/`. Backfill-images rewrites the cache-busting `?timestamp` on every image URL it touches, so run it on specific files unless you want churn across all decks.

- `npm run decks:backfill-images [-- <file>...]` - Add or refresh Scryfall `imageUris` on existing `decks/*.json` without re-downloading from MTGJSON or Archidekt. The diff is additive (only image-URL fields). Defaults to all decks; pass filenames to target specific ones. Throttled, with retries on Scryfall 429s. Use it to pick up image URLs for freshly released cards.
- `npm run decks:backfill-set-names` - Rewrite the `set` field in `precon-mtgjson-*.json` from set codes to full set names (e.g. `SLD` → `Secret Lair Drop`) using Scryfall's `/sets`. Deck tiles display the commander's `set`; MTGJSON gives only codes. Idempotent, with a clean diff (only `set` lines), and Archidekt decks are left untouched. The fetch script already produces set names, so you only need this for old files.

### From a specific Archidekt deck

`npm run deck:download -- <archidektDeckId>`

This will download a specific deck from Archidekt and save it to the decks directory.
You need to redo this every time the Deck structure changes!

## Downloading the database of cards

Note: we aren't using this yet but I gotta document it while it's here.
This is how to update the card database:

```
cd mtgjson

wget https://mtgjson.com/api/v5/AllPrintings.json.gz

gunzip AllPrintings.json.gz
```

These files are ignored in git because they are big, and they are reproducible.

When we use them, they'll need to go into the Docker image I guess? That's gonna take some uploading.
We could put them on a persistent volume instead. Right now, they're not deployed, just hanging out until I need them.
