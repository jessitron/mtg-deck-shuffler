import "./tracing.js";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { ArchidektDeck, Deck, convertArchidektToDeck, getCardImageUrl, shuffleDeck, Library, Game, Card } from "./deck.js";

async function retrieveDeck(deckNumber: string): Promise<Deck> {
  const response = await fetch(`https://archidekt.com/api/decks/${deckNumber}/`);

  if (!response.ok) {
    throw new Error(`Failed to fetch deck: ${response.status}`);
  }

  const archidektDeck: ArchidektDeck = await response.json();
  return convertArchidektToDeck(archidektDeck);
}

function formatDeckHtml(deck: Deck): string {
  const commanderInfo = formatCommanderHtml(deck.commander);

  const cardCountInfo =
    deck.excludedCards > 0
      ? `<p>This deck has ${deck.includedCards} cards, plus ${deck.excludedCards} excluded cards</p>`
      : `<p>This deck has ${deck.includedCards} cards</p>`;

  return `<div id="deck-info">
        <h2><a href="https://archidekt.com/decks/${deck.id}" target="_blank">${deck.name}</a></h2>
        ${commanderInfo}
        ${cardCountInfo}
        <button hx-post="/start-game" hx-include="closest div" hx-target="#deck-input">Start Game</button>
        <input type="hidden" name="deck-id" value="${deck.id}" />
        <a href="/">Choose another deck</a>
    </div>`;
}

function formatCommanderHtml(commander?: Card): string {
  return commander 
    ? `<div>
        <p>Commander: <strong>${commander.name}</strong></p>
        ${commander.uid ? `<img src="${getCardImageUrl(commander.uid)}" alt="${commander.name}" class="commander-image" />` : ''}
       </div>` 
    : "No commander detected"
}

function formatGameHtml(game: Game): string {
  const commanderInfo = formatCommanderHtml(game.deck.commander);

  const libraryCardList = game.library.cards
    .map(card => `<li><a href="https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=${card.multiverseid}" target="_blank">${card.name}</a></li>`)
    .join('');

  return `<div id="game-state">
        <h2>Game: <a href="https://archidekt.com/decks/${game.deck.id}" target="_blank">${game.deck.name}</a></h2>
        
        <div class="game-layout">
          <div id="commander-display">
            <h3>Commander</h3>
            ${commanderInfo}
          </div>
          
          <div id="library-display">
            <h3>Library</h3>
            <div class="library-info">
              <img src="https://backs.scryfall.io/large/2/2/222b7a3b-2321-4d4c-af19-19338b134971.jpg?1677416389" alt="Magic card back" class="card-back" />
              <p>Cards in library: <strong>${game.library.count}</strong></p>
            </div>
            
            <details class="library-details">
              <summary>View library contents (for testing)</summary>
              <ol class="library-list">
                ${libraryCardList}
              </ol>
            </details>
          </div>
        </div>
        
        <button hx-post="/end-game" hx-include="closest div" hx-target="#deck-input">End Game</button>
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
  const deckNumber = req.body["deck-number"];

  try {
    const deck = await retrieveDeck(deckNumber);
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
  const deckId = req.body["deck-id"];

  try {
    const deck = await retrieveDeck(deckId);
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
    const deck = await retrieveDeck(deckId);
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
