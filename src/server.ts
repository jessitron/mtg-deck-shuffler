import "./tracing.js";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { ArchidektDeck, Deck, convertArchidektToDeck, getCardImageUrl } from "./deck.js";

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

  return `<div id="deck-input">
        <h2><a href="https://archidekt.com/decks/${deck.id}" target="_blank">${deck.name}</a></h2>
        ${commanderInfo}
        ${cardCountInfo}
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
