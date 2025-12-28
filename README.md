# Shuffle your deck

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

## Running

`npm install`

`./run`

## Testing

### Unit Tests

`npm test` - Run unit tests

### Snapshot Tests

`npm run test:snapshot` - Run HTML output snapshot tests

**Important**: Snapshot tests capture the current HTML output to detect unintended changes during refactoring.

- **For HTML changes that are NOT intended**: Run `npm run test:snapshot` to verify no changes occurred
- **For HTML changes that ARE intended**: Only run snapshot tests manually to review and approve changes by inspecting the generated `.actual` files

`npm run test:snapshot:update` - Update snapshots (moves .actual files to replace snapshots)
`npm run test:snapshot:diff` - View differences between snapshots and actual output

## Technical notes

This app uses TypeScript, with tsc for converting to JS. It's a toy.

It will use htmx only, and no JS unless absolutely necessary (such as for OTel instrumentation).

For that, it'll need a Node backend with express.

We'll use npm for dependencies and for running its scripts.

We will eventually deploy to a toy EKS cluster.

## Downloading precon decks

`npm run deck:download -- <archidektDeckId>`

This will download the deck from archidekt and save it to the decks directory.
You need to redo this every time the Deck structure changes!

## Downloading all precon decks

`npm run precons:fetch -- --download`

This will download all Archidekt precon decks to the decks directory.

`npm run precons:fetch -- --download --force`

Use the `--force` flag to overwrite existing decks (useful when the Deck structure changes).

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
