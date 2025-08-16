import "./tracing.js";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { ArchidektDeck, Deck, convertArchidektToDeck, getCardImageUrl, shuffleDeck, Library, Game } from "./deck.js";

async function retrieveDeck(deckNumber: string): Promise<Deck> {
  const response = await fetch(`https://archidekt.com/api/decks/${deckNumber}/`);

  if (!response.ok) {
    throw new Error(`Failed to fetch deck: ${response.status}`);
  }

  const archidektDeck: ArchidektDeck = await response.json();
  return convertArchidektToDeck(archidektDeck);
}

function formatDeckHtml(deck: Deck): string {
  const commanderInfo = deck.commander 
    ? `<div>
        <p>Commander: <strong>${deck.commander.name}</strong></p>
        ${deck.commander.uid ? `<img src="${getCardImageUrl(deck.commander.uid)}" alt="${deck.commander.name}" style="max-width: 300px; height: auto;" />` : ''}
       </div>` 
    : "No commander detected";

  const cardCountInfo =
    deck.excludedCards > 0
      ? `<p>This deck has ${deck.includedCards} cards, plus ${deck.excludedCards} excluded cards</p>`
      : `<p>This deck has ${deck.includedCards} cards</p>`;

  return `<div>
        <h2><a href="https://archidekt.com/decks/${deck.id}" target="_blank">${deck.name}</a></h2>
        ${commanderInfo}
        ${cardCountInfo}
        <button hx-post="/start-game" hx-include="closest div" hx-target="#deck-input">Start Game</button>
        <input type="hidden" name="deck-id" value="${deck.id}" />
        <a href="/">Choose another deck</a>
    </div>`;
}

function formatGameHtml(game: Game): string {
  const commanderInfo = game.deck.commander 
    ? `<div>
        <p>Commander: <strong>${game.deck.commander.name}</strong></p>
        ${game.deck.commander.uid ? `<img src="${getCardImageUrl(game.deck.commander.uid)}" alt="${game.deck.commander.name}" style="max-width: 300px; height: auto;" />` : ''}
       </div>` 
    : "No commander detected";

  const libraryCardList = game.library.cards
    .map(card => `<li>${card.name}</li>`)
    .join('');

  return `<div id="game-state">
        <h2>Game: <a href="https://archidekt.com/decks/${game.deck.id}" target="_blank">${game.deck.name}</a></h2>
        ${commanderInfo}
        
        <div id="library-display">
          <h3>Library</h3>
          <div style="display: flex; align-items: center; gap: 20px;">
            <div style="background-color: #4a4a4a; border-radius: 10px; width: 80px; height: 120px; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 2px 2px 8px rgba(0,0,0,0.5);">
              <span style="font-size: 24px;">${game.library.count}</span>
            </div>
            <p>Cards in library: <strong>${game.library.count}</strong></p>
          </div>
          
          <details style="margin-top: 20px;">
            <summary>View library contents (for testing)</summary>
            <ol style="max-height: 300px; overflow-y: auto;">
              ${libraryCardList}
            </ol>
          </details>
        </div>
        
        <button hx-post="/end-game" hx-target="#deck-input">End Game</button>
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

app.post("/end-game", (req, res) => {
  res.send(`<div id="deck-input">
      <label for="deck-number">Archidekt Deck Number:</label>
      <input type="text" id="deck-number" name="deck-number" value="14669648" placeholder="14669648" />
      <button hx-post="/deck" hx-include="#deck-number" hx-target="#deck-input">Load Deck</button>
    </div>`);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
