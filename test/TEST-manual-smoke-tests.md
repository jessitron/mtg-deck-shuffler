# How to manually test the app, a quick check

1. Run the app

`PORT=3001 ./run`

2. Open a browser (such as with the playwright mcp) to http://localhost:3001

[] Check that the load deck screen appears. At the top it says "Woohoo, it's Magic time"

[] There's an input box for an Archidekt deck number. It's pre-filled with 14669648. There's a "Load Deck" button next to it.

[] There's a dropdown box to select a local deck. There's a "Load Deck" button next to it.

## Check Archidekt deck loading

3. Load the default deck from Archidekt: Click the "Load Deck" button.

[] Check that the commander appears. The image URL is https://cards.scryfall.io/normal/front/b/9/b9ac7673-eae8-4c4b-889e-5025213a6151.jpg

[] Check that the deck name is "Ygra EATS IT ALL"

4. Click "Start Game"

[] Check that a library appears: there's an element with data-testid is "card-back"

## Check local deck loading

5. Return to https://localhost:3001

6. The default for the dropdown is fine. Click "Load Deck" in the local deck loading section.

[] Check that the deck name is "Rat Girl's Food Hoarding"

[] Check that two commander cards appear.
