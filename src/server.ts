import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { Deck, getCardImageUrl, shuffleDeck, Game, Card } from "./deck.js";
import {
  ArchidektGateway,
  ArchidektDeckToDeckAdapter,
  LocalDeckAdapter,
  CascadingDeckRetrievalAdapter,
  ArchidektDeckRetrievalRequest,
  RetrieveDeckPort,
} from "./deck-retrieval/index.js";

const deckRetriever: RetrieveDeckPort = new CascadingDeckRetrievalAdapter(new LocalDeckAdapter(), new ArchidektDeckToDeckAdapter(new ArchidektGateway()));

function formatDeckHtml(deck: Deck): string {
  const commanderImageHtml =
    deck.commander && deck.commander.uid
      ? `<img src="${getCardImageUrl(deck.commander.uid)}" alt="${deck.commander.name}" class="commander-image" />`
      : `<div class="commander-placeholder">No Commander Image</div>`;

  const cardCountInfo = deck.excludedCards > 0 ? `${deck.includedCards} cards, plus ${deck.excludedCards} excluded cards` : `${deck.includedCards} cards`;

  const retrievedInfo = `Retrieved: ${deck.retrievedDate.toLocaleString()}`;

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
          <button hx-post="/start-game" hx-include="closest div" hx-target="#deck-input">Start Game</button>
          <button onclick="location.reload()">Choose Another Deck</button>
        </div>
    </div>`;
}

function formatCommanderHtml(commander?: Card): string {
  return commander
    ? `<div>
        <p>Commander: <strong>${commander.name}</strong></p>
        ${commander.uid ? `<img src="${getCardImageUrl(commander.uid)}" alt="${commander.name}" class="commander-image" />` : ""}
       </div>`
    : "No commander detected";
}

function formatGameHtml(game: Game): string {
  const commanderImageHtml =
    game.deck.commander && game.deck.commander.uid
      ? `<img src="${getCardImageUrl(game.deck.commander.uid)}" alt="${game.deck.commander.name}" class="commander-image" />`
      : `<div class="commander-placeholder">No Commander</div>`;

  const cardCountInfo =
    game.deck.excludedCards > 0 ? `${game.deck.includedCards} cards, plus ${game.deck.excludedCards} excluded cards` : `${game.deck.includedCards} cards`;

  const libraryCardList = game.library.cards
    .map((card) => `<li><a href="https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=${card.multiverseid}" target="_blank">${card.name}</a></li>`)
    .join("");

  return `<div id="game-state">
        <div class="game-header">
          <div class="commander-info">
            ${commanderImageHtml}
          </div>
          <div class="deck-info-right">
            <h2><a href="https://archidekt.com/decks/${game.deck.id}" target="_blank">${game.deck.name}</a></h2>
            <p>${cardCountInfo}</p>
            <p><strong>Game ID:</strong> ${game.deck.id}</p>
          </div>
        </div>
        
        <div class="game-board">
          <div class="library-section">
            <div class="library-stack">
              <div class="card-back card-back-1"></div>
              <div class="card-back card-back-2"></div>
              <div class="card-back card-back-3"></div>
            </div>
            <p>Library</p>
          </div>
          
          <div class="revealed-cards-section">
            <h3>Revealed Cards</h3>
            <div class="revealed-cards-area">
              <div class="card-placeholder">Card</div>
              <div class="card-placeholder">Card</div>
            </div>
          </div>
        </div>
        
        <div class="hand-section">
          <h3>Hand</h3>
          <div class="hand-cards">
            <div class="card-placeholder">Card</div>
            <div class="card-placeholder">Card</div>
            <div class="card-placeholder">Card</div>
          </div>
        </div>
        
        <details class="library-details">
          <summary>⏵ View library contents (for testing)</summary>
          <ol class="library-list">
            ${libraryCardList}
          </ol>
        </details>
        
        <div class="game-actions">
          <button hx-post="/end-game" hx-include="closest div" hx-target="#deck-input">End Game</button>
        </div>
        <input type="hidden" name="deck-id" value="${game.deck.id}" />
    </div>`;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..")));

app.post("/deck", async (req, res) => {
  const deckNumber: string = req.body["deck-number"];

  try {
    const deck = await deckRetriever.retrieveDeck({ archidektDeckId: deckNumber });
    const html = formatDeckHtml(deck);

    res.send(html);
  } catch (error) {
    console.error("Error fetching deck:", error);
    res.send(`<div>
        <p>Error: Could not fetch deck ${deckNumber}</p>
        <a href="/">Try another deck</a>
    </div>`);
  }
});

app.post("/start-game", async (req, res) => {
  const deckId: string = req.body["deck-id"];

  try {
    const deck = await deckRetriever.retrieveDeck({ archidektDeckId: deckId });
    const library = shuffleDeck(deck);
    const game: Game = { deck, library };
    const html = formatGameHtml(game);

    res.send(html);
  } catch (error) {
    console.error("Error starting game:", error);
    res.send(`<div>
        <p>Error: Could not start game with deck ${deckId}</p>
        <a href="/">Try another deck</a>
    </div>`);
  }
});

app.post("/end-game", async (req, res) => {
  const deckId = req.body["deck-id"];

  try {
    const deck = await deckRetriever.retrieveDeck({ archidektDeckId: deckId });
    const html = formatDeckHtml(deck);
    res.send(html);
  } catch (error) {
    console.error("Error ending game:", error);
    res.send(`<div>
        <p>Error: Could not reload deck ${deckId}</p>
        <a href="/">Try another deck</a>
    </div>`);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
