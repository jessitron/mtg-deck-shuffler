import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { shuffleDeck, Game } from "./deck.js";
import { ArchidektGateway, ArchidektDeckToDeckAdapter, LocalDeckAdapter, CascadingDeckRetrievalAdapter, RetrieveDeckPort } from "./deck-retrieval/index.js";
import { formatDeckHtml, formatGameHtml } from "./html-formatters.js";

const deckRetriever: RetrieveDeckPort = new CascadingDeckRetrievalAdapter(new LocalDeckAdapter(), new ArchidektDeckToDeckAdapter(new ArchidektGateway()));

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
