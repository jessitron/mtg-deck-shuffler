# Shuffle your deck

My real objective is to play Magic with my sister remotely. Here's our simplest-possible plan:
We create a Mural and paste pictures of the cards in there. Then we move them around the same way as when we're playing.
We have VC open so we're talking to each other as we do this, so we can communicate about what is happening.

Now, I want to try this today, but I don't have my deck with me. Also I want to make it easy to paste pictures of the cards in.

So, given a deck in archidekt.com, this web app will

- download the deck information from archidekt. https://archidekt.com/api/decks/14669648/ retrieves a bunch of JSON, including the cards, including a scryfall image hash.
- tell me how many cards are in the library
- put an image of my commander on the screen for me to copy into Mural

... that's enough for now.

## Technical notes

This app uses TypeScript, with esbuild for converting to JS. It's a toy, so keep it dead simple.

It will use htmx only, and no JS frameworks.

For that, it'll need a Node backend with express.

We'll use npm for dependencies and for run scripts.

We'll deploy it to Github Pages eventually. It is a toy.
