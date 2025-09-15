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

`???` - Update snapshots

## Technical notes

This app uses TypeScript, with tsc for converting to JS. It's a toy.

It will use htmx only, and no JS unless absolutely necessary (such as for OTel instrumentation).

For that, it'll need a Node backend with express.

We'll use npm for dependencies and for running its scripts.

We will eventually deploy to a toy EKS cluster.

## Downloading decks for local use

`npm run deck:download -- <archidektDeckId>`

This will download the deck from archidekt and save it to the decks directory.
You need to redo this every time the Deck structure changes!

##
