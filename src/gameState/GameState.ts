import { Deck, CardDefinition } from "../deck.js";
import { DeckProvenance, GameCard, CardLocation } from "./types.js";
import { validateInvariants } from "./invariants.js";

export class GameState {
  public readonly deckProvenance: DeckProvenance;
  public readonly cards: GameCard[];

  constructor(deck: Deck) {
    this.deckProvenance = {
      id: deck.id,
      name: deck.name,
      retrievedDate: deck.retrievedDate
    };

    this.cards = this.initializeFromDeck(deck);
    
    validateInvariants(this);
  }

  private initializeFromDeck(deck: Deck): GameCard[] {
    const gameCards: GameCard[] = [];

    // Add commander(s) to command zone
    if (deck.commander) {
      gameCards.push({
        cardDefinition: deck.commander,
        location: { type: "CommandZone" }
      });
    }

    // Add all other cards to library with incrementing positions
    deck.cards.forEach((cardDefinition, index) => {
      gameCards.push({
        cardDefinition,
        location: { type: "Library", position: index }
      });
    });

    // Sort by display name for consistent ordering
    gameCards.sort((a, b) => a.cardDefinition.name.localeCompare(b.cardDefinition.name));

    return gameCards;
  }

  shuffle(): GameState {
    // Get all cards currently in Library
    const libraryCards = this.cards.filter(card => card.location.type === "Library");
    
    // Create shuffled positions array
    const positions = libraryCards.map((_, index) => index);
    
    // Fisher-Yates shuffle algorithm for positions
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    // Create new cards array with shuffled library positions
    const newCards = this.cards.map(card => {
      if (card.location.type === "Library") {
        const currentIndex = libraryCards.findIndex(libCard => libCard === card);
        return {
          ...card,
          location: { type: "Library", position: positions[currentIndex] }
        };
      }
      return card;
    });

    const newGameState = Object.create(GameState.prototype) as GameState;
    (newGameState as any).deckProvenance = this.deckProvenance;
    (newGameState as any).cards = newCards;
    
    validateInvariants(newGameState);
    
    return newGameState;
  }
}