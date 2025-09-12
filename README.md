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

This project uses snapshot testing (golden master testing) for HTML output verification. Snapshot tests capture the complete HTML output of view functions and detect any changes during refactoring.

### Running Tests

```bash
npm test                    # Run all tests
npm test <test-file>       # Run specific test file
```

### Working with Snapshot Tests

**Normal workflow:**
1. Run tests after making changes: `npm test`
2. If snapshot tests fail, review the differences shown in the output
3. If changes are intentional, update the snapshot (see below)
4. If changes are unintentional, fix your code

**Updating snapshots:**
When you intentionally change HTML output and want to update the snapshot:
1. Delete the snapshot file (e.g., `test/view/snapshots/formatHomepageHtml.html`)
2. Run the test again: `npm test test/view/formatHomepageHtml.snapshot.test.ts`
3. The test will create a new snapshot with your current output
4. Review the new snapshot file to ensure it looks correct
5. Commit both your code changes and the updated snapshot

**Example workflow:**
```bash
# Make changes to view function
# Run test to see what changed
npm test test/view/formatHomepageHtml.snapshot.test.ts

# If changes look good, update snapshot
rm test/view/snapshots/formatHomepageHtml.html
npm test test/view/formatHomepageHtml.snapshot.test.ts

# Commit both code and snapshot
git add . && git commit -m "Update homepage layout - claude"
```

## Technical notes

This app uses TypeScript, with esbuild for converting to JS. It's a toy.

It will use htmx only, and no JS unless absolutely necessary (such as for OTel instrumentation).

For that, it'll need a Node backend with express.

We'll use npm for dependencies and for running its scripts.

We will eventually deploy to a toy EKS cluster.

# Downloading decks for local use

`npm run deck:download -- <archidektDeckId>`

This will download the deck from archidekt and save it to the decks directory.
