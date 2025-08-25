import { Deck } from "../deck.js";
import { DeckRetrievalRequest } from "../deck-retrieval/types.js";
import { GameStateData, GameCard, DeckRetrievalSpec, CardLocation } from "./types.js";
import { assertInvariants } from "./invariants.js";

// Step 1.3: Create GameState class
export class GameState {
  private data: GameStateData;

  // Step 2.1: Initialize operation (from deck to game state) in constructor
  constructor(deck: Deck, request: DeckRetrievalRequest) {
    const deckRetrievalSpec: DeckRetrievalSpec = {
      ...request,
      retrievedAt: deck.retrievedDate
    };

    // Create game cards from deck
    const gameCards: GameCard[] = [];
    
    // Add commander(s) to command zone
    if (deck.commander) {
      gameCards.push({
        definition: deck.commander,
        location: { type: "CommandZone" }
      });
    }

    // Add all other cards to library with incrementing positions
    deck.cards.forEach((cardDef, index) => {
      gameCards.push({
        definition: cardDef,
        location: { type: "Library", position: index }
      });
    });

    // Sort by display name (card name) to maintain order invariant
    gameCards.sort((a, b) => a.definition.name.localeCompare(b.definition.name));

    this.data = {
      deckRetrievalSpec,
      cards: gameCards
    };

    // Validate invariants after initialization
    assertInvariants(this.data.cards);
  }

  // Getter for game state data (immutable view)
  public getState(): Readonly<GameStateData> {
    return { ...this.data };
  }

  // Getter for cards (immutable view)
  public getCards(): ReadonlyArray<Readonly<GameCard>> {
    return [...this.data.cards];
  }

  // Getter for deck retrieval spec
  public getDeckRetrievalSpec(): Readonly<DeckRetrievalSpec> {
    return { ...this.data.deckRetrievalSpec };
  }
}