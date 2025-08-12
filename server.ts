import "./tracing.js";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

interface ArchidektDeck {
  id: number;
  name: string;
  cards: Array<{
    card: {
      name: string;
    };
    quantity: number;
    categories: string[];
  }>;
}

interface Deck {
  id: number;
  name: string;
  totalCards: number;
  commander?: string;
}

function convertArchidektToDeck(archidektDeck: ArchidektDeck): Deck {
  const totalCards = archidektDeck.cards.reduce((sum, card) => sum + card.quantity, 0);
  
  const commanderCard = archidektDeck.cards.find(card => 
    card.categories.includes("Commander")
  );
  
  return {
    id: archidektDeck.id,
    name: archidektDeck.name,
    totalCards,
    commander: commanderCard?.card.name
  };
}

function formatDeckHtml(deck: Deck): string {
  const commanderInfo = deck.commander ? `<p>Commander: <strong>${deck.commander}</strong></p>` : '';
  
  return `<div id="deck-input">
        <h2>${deck.name}</h2>
        ${commanderInfo}
        <p>This deck has ${deck.totalCards} cards</p>
        <a href="/">Choose another deck</a>
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
    const response = await fetch(`https://archidekt.com/api/decks/${deckNumber}/`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch deck: ${response.status}`);
    }
    
    const archidektDeck: ArchidektDeck = await response.json();
    const deck = convertArchidektToDeck(archidektDeck);
    const html = formatDeckHtml(deck);
    
    res.send(html);
  } catch (error) {
    console.error("Error fetching deck:", error);
    res.send(`<div id="deck-input">
        <p>Error: Could not fetch deck ${deckNumber}</p>
        <a href="/">Try another deck</a>
    </div>`);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
