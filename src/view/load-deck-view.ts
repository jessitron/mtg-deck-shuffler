import { AvailableDecks } from "../port-deck-retrieval/types.js";
import { Deck, getCardImageUrl } from "../types.js";

function formatCommanderImageHtmlFragment(commanders: any[]): string {
  return commanders.length > 0
    ? commanders
        .map((commander) => `<img src="${getCardImageUrl(commander.scryfallId)}" alt="${commander.name}" class="mtg-card-image commander-image" />`)
        .join("")
    : `<div class="commander-placeholder">No Commander</div>`;
}

function formatHtmlHeadHtmlFragment(title: string): string {
  return `<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <link rel="stylesheet" href="/styles.css" />
    <script src="/hny.js"></script>
    <script>
      Hny.initializeTracing({
        apiKey: "${process.env.HONEYCOMB_INGEST_API_KEY || process.env.HONEYCOMB_API_KEY}",
        serviceName: "mtg-deck-shuffler-web",
        debug: false,
        provideOneLinkToHoneycomb: true,
      });
    </script>
    <script src="/htmx.js"></script>
    <script src="/game.js"></script>
  </head>`;
}

function formatPageWrapperHtmlPage(title: string, content: string): string {
  const headHtml = formatHtmlHeadHtmlFragment(title);

  return `<!DOCTYPE html>
<html lang="en">
  ${headHtml}
  <body>
    <h1>*Woohoo it's Magic time!*</h1>
    ${content}
    
    <footer>
      <p>MTG Deck Shuffler | <a href="https://github.com/jessitron/mtg-deck-shuffler" target="_blank">GitHub</a></p>
    </footer>
  </body>
</html>`;
}

export function formatChooseDeckHtmlSection(availableDecks: AvailableDecks) {
  const archidektSelectionHtml = formatArchidektInputHtmlFragment();

  const localSelectionHtml = formatLocalDeckInputHtmlFragment(availableDecks);
  return `<div id="deck-input">
      ${archidektSelectionHtml}
      ${localSelectionHtml}
    </div>`;
}

function formatArchidektInputHtmlFragment() {
  return `<div class="deck-input-section">
      <form method="POST" action="/deck">
        <label for="deck-number" class="deck-label">Enter <a href="https://archidekt.com/" target="_blank">Archidekt</a> Deck Number:</label>
        <input type="text" id="deck-number" name="deck-number" value="14669648" placeholder="14669648" class="deck-input" />
        <input type="hidden" name="deck-source" value="archidekt" />
        <button type="submit" class="lets-play-button">Let's Play (from Archidekt)</button>
      </form>
   </div>`;
}

function formatLocalDeckInputHtmlFragment(availableDecks: AvailableDecks) {
  if (availableDecks.length === 0) {
    return "";
  }

  const options = availableDecks.filter((o) => o.deckSource === "local").map((o) => `<option value="${o.localFile}">${o.description}</option>`);
  return `<div class="deck-input-section">
      <form method="POST" action="/deck">
        <label for="local-deck" class="deck-label">Or choose a pre-loaded deck:</label> 
        <input type="hidden" name="deck-source" value="local" />
        <select id="local-deck" name="local-deck" class="deck-select">${options}</select>
        <button type="submit" class="lets-play-button">Let's Play</button>
      </form>
    </div>`;
}

export function formatHomepageHtmlPage(availableDecks: AvailableDecks): string {
  const deckSelectionHtml = formatChooseDeckHtmlSection(availableDecks);
  
  const content = `
    ${deckSelectionHtml}
    <div class="expository-text">
      <h3>How to use MTG Deck Shuffler</h3>
      <p>
        Want to play Magic with people who aren't in the room with you? You can play remotely using an online white board like Mural or Miro. Paste the cards in and move them around, like you would on a table. 
      </p>
      <p>
        My sister and I play that way, and our board winds up looking like this:
      </p>
      <img src="mural-board.png" class="how-to-mural" alt="a bunch of Magic cards scattered across a white board" />
      <p>
        That picture won't tell you much. We're on voice chat when we play, so we talk through what we're doing. Then it makes sense. It's fun, because we can use any fancy land or token. We can make little notes on top of the cards as counters or to track effects.
      </p>
      <p>
        This works with a physical deck; we each shuffle and draw cards from our own decks. Then when we want to put a card on the table, we find the image at Scryfall, right-click to copy, and paste it in.
      </p>
      <p>
        This app makes that easier! It manages the shuffling and drawing, and then push "Play" to copy the card image to the clipboard! Now I don't have to have a physical deck with me. I don't have to own the physical deck at all. I can play any deck on Archidekt--any <a href="https://archidekt.com/commander-precons/" target="_blank">precon</a>, anyone else's deck, or any deck I create from all cards available anywhere. My sister can play a deck full of Relentless Rats, and I can have all the Secret Lair cards.
      </p>
      <p>
        With a combination of
        <ul>
          <li>Discord for voice chat</li>
          <li>Archidekt for deck definition</li>
          <li>Mural for the board</li>
          <li>This app for library management</li>
        </ul>
        We can play any deck, anywhere, with our favorite people.
      </p>
    </div>`;

  return formatPageWrapperHtmlPage("MTG Deck Shuffler", content);
}

export function formatDeckHtmlSection(deck: Deck): string {
  const commanderImageHtml = formatCommanderImageHtmlFragment(deck.commanders);
  const cardCountInfo = `${deck.totalCards} cards`;
  const retrievedInfo = `Retrieved: ${deck.provenance.retrievedDate.toLocaleString()}`;

  return `<div id="deck-info">
        <div class="deck-details-layout">
          <div class="commander-section">
            ${commanderImageHtml}
          </div>
          <div class="deck-info-section">
            <h2><a href="https://archidekt.com/decks/${deck.id}" target="_blank">${deck.name}</a></h2>
            <p>${cardCountInfo}</p>
            <p><small>${retrievedInfo}</small></p>
          </div>
        </div>
        <div class="deck-actions">
          <input type="hidden" name="deck-id" value="${deck.id}" />
          <button hx-post="/start-game" class="start-game-button" hx-include="closest div" hx-target="#deck-input">Start Game</button>
          <form method="post" action="/" style="display: inline;">
            <button type="submit">Choose Another Deck</button>
          </form>
        </div>
    </div>`;
}
