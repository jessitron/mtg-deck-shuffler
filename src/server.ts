import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { shuffleDeck, Game } from "./types.js";
import {
  ArchidektGateway,
  ArchidektDeckToDeckAdapter,
  LocalDeckAdapter,
  CascadingDeckRetrievalAdapter,
  RetrieveDeckPort,
  DeckRetrievalRequest,
} from "./deck-retrieval/index.js";
import { formatChooseDeckHtml, formatDeckHtml, formatGameHtml } from "./html-formatters.js";
import { setCommonSpanAttributes } from "./tracing_util.js";

const deckRetriever: RetrieveDeckPort = new CascadingDeckRetrievalAdapter(new LocalDeckAdapter(), new ArchidektDeckToDeckAdapter(new ArchidektGateway()));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..")));

app.get("/choose-deck", async (req, res) => {
  try {
    const availableDecks = deckRetriever.listAvailableDecks();
    const html = formatChooseDeckHtml(availableDecks);

    res.send(html);
  } catch (error) {
    console.error("Error fetching deck:", error);
    res.send(`<div>
        <p>Error: Could not figure out how you might load a deck</p>
        <a href="/">Try another deck</a>
    </div>`);
  }
});

app.post("/deck", async (req, res) => {
  const deckNumber: string = req.body["deck-number"];
  const deckSource: string = req.body["deck-source"];
  const localFile: string = req.body["local-deck"];
  setCommonSpanAttributes({ archidektDeckId: deckNumber, deckSource });
  const deckRequest: DeckRetrievalRequest = deckSource === "archidekt" ? { archidektDeckId: deckNumber } : { localFile };

  try {
    const deck = await deckRetriever.retrieveDeck(deckRequest);
    const html = formatDeckHtml(deck);

    res.send(html);
  } catch (error) {
    console.error("Error fetching deck:", error);
    res.send(`<div>
        <p>Error: Could not fetch deck ${deckNumber || localFile} from ${deckSource}</p>
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
