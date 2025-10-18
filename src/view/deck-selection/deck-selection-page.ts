import { AvailableDecks } from "../../port-deck-retrieval/types.js";
import { Deck } from "../../types.js";
import { formatPageWrapper } from "../common/html-layout.js";
import { formatCommanderImageHtmlFragmentFromCards } from "../common/shared-components.js";

const homepage_title = "MTG Deck Shuffler";

function formatArchidektInputHtmlFragment() {
  return `
      <form class="deck-input-section" method="POST" action="/deck">
        <label for="deck-number" class="deck-label">Play any deck on <a href="https://archidekt.com/" target="_blank">Archidekt</a></label>
        <input type="text" id="deck-number" name="deck-number"placeholder="deck number" />
        <input type="hidden" name="deck-source" value="archidekt" />
        <button type="submit" class="lets-play-button">Load Deck</button>
      </form>
`;
}

function formatLocalDeckInputHtmlFragment(availableDecks: AvailableDecks) {
  if (availableDecks.length === 0) {
    return "";
  }

  const options = availableDecks.filter((o) => o.deckSource === "local").map((o) => `<option value="${o.localFile}">${o.description}</option>`);
  return `
      <form method="POST" action="/deck" class="deck-input-section">
        <label for="local-deck" class="deck-label">Choose a preconstructed deck to play</label>
        <input type="hidden" name="deck-source" value="local" />
        <select id="local-deck" name="local-deck">${options}</select>
        <button type="submit" class="lets-play-button">Play</button>
      </form>`;
}

function formatLoadStateHtmlFragment() {
  // TODO: make this a small link in the footer instead of a whole button
  return `<div class="debug-section">
      <button id="load-state-button" class="debug-button"
              hx-get="/load-state-modal"
              hx-target="#modal-container"
              hx-swap="innerHTML">Load Game State</button>
    </div>`;
}

export function formatHomepageHtmlPage(availableDecks: AvailableDecks): string {
  const loadStateHtml = formatLoadStateHtmlFragment();
  const deckSelectionHtml = `<div id="deck-inputs">
  ${formatLocalDeckInputHtmlFragment(availableDecks)}
  ${formatArchidektInputHtmlFragment()}
    </div>`;

  const title = `<h1 class="homepage-title">${homepage_title}</h1>`;
  const content = `
  <div id="homepage-content">
    ${title}
    ${deckSelectionHtml}
    <div id="modal-container"></div>
    <div class="expository-text">
      <h3>What does this do?</h3>
      <p> Play Magic, The Gathering remotely with friends -- using any deck!
      </p>
      <h5>You need</h5>
      <ul>
        <li>A friend (or two or three) to play with</li>
        <li>A shared voice chat, like Discord</li></li>
        <li>A shared online white board, like <a href="https://www.mural.co/" target="_blank">Mural</a>, which serves as the table</li>
        <li>Decks defined in Archidekt (or use the preconstructed decks we've downloaded)
        <li>This app for each of you to manage your library and hand
      </ul>
      <p>Each of you can choose a deck in this app, then shuffle up. Draw cards to your hand, then click on them to do more. When you play a card in MTG Deck Shuffler, it gets copied to your clipboard. Then paste it into Mural!</p>
      <p>
        My sister and I play this way, and our board winds up looking like this:
      </p>
      <img src="mural-board.png" class="how-to-mural" alt="a bunch of Magic cards scattered across a white board" />
      <p>
        That picture won't tell you much. We're on voice chat when we play, so we talk through what we're doing. It's fun, because we use fancy lands and tokens. We make little notes on top of the cards as counters or to track effects.
      </p> <p>
        Play any deck, anywhere, with your favorite people!
      </p>
      ${loadStateHtml}
    </div>
    </div>`;

  return formatPageWrapper("MTG Deck Shuffler", content);
}

export function formatDeckHtmlSection(deck: Deck, gameId: number): string {
  const commanderImageHtml = formatCommanderImageHtmlFragmentFromCards(deck.commanders, gameId);
  const cardCountInfo = `${deck.totalCards} cards`;
  const retrievedInfo = `Retrieved: ${deck.provenance.retrievedDate.toLocaleString()}`;

  return `<div id="deck-info">
        <div class="deck-details-layout">
            ${commanderImageHtml}
          <div class="deck-info-section">
            <h2><a href="https://archidekt.com/decks/${deck.id}" target="_blank">${deck.name}</a></h2>
            <p>${cardCountInfo}</p>
            <p><small>${retrievedInfo}</small></p>
          </div>
        </div>
        <div class="deck-actions">
          <input type="hidden" name="deck-id" value="${deck.id}" />
          <button hx-post="/start-game" class="start-game-button" hx-include="closest div" hx-target="#deck-input">Start Game</button>
          <form method="post" action="/" class="inline-form">
            <button type="submit">Choose Another Deck</button>
          </form>
        </div>
    </div>`;
}
