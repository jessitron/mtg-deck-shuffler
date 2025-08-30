import { Card, DeckProvenance, Deck } from "./types.js";
import { PersistedGameState, StateId } from "./port-persist-state/types.js";

export type GameId = number;

export enum GameStatus {
  NotStarted = "NotStarted",
  Active = "Active",
  Ended = "Ended",
}

export interface LibraryLocation {
  type: "Library";
  position: number;
}

export interface HandLocation {
  type: "Hand";
  position: number;
}

export interface RevealedLocation {
  type: "Revealed";
  position: number;
}

export interface TableLocation {
  type: "Table";
}

export type CardLocation = LibraryLocation | HandLocation | RevealedLocation | TableLocation;

export interface GameCard {
  card: Card;
  location: CardLocation;
}

export class GameState {
  public readonly gameId: GameId;
  public readonly status: GameStatus;
  public readonly deckProvenance: DeckProvenance;
  public readonly commanders: Card[];
  public readonly deckName: string;
  public readonly deckId: number; // TODO: remove, once it is no longer used in the UI
  public readonly totalCards: number;
  private readonly gameCards: GameCard[];

  constructor(gameId: GameId, deck: Deck) {
    if (deck.commanders.length > 2) {
      // TODO: make a warning function
      console.log("Warning: Deck has more than two commanders. Behavior undefined");
    }

    const gameCards: GameCard[] = [...deck.cards]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((card, index) => ({
        card,
        location: { type: "Library", position: index } as LibraryLocation,
      }));

    this.gameId = gameId;
    this.status = GameStatus.NotStarted;
    this.deckProvenance = deck.provenance;
    this.commanders = [...deck.commanders];
    this.deckName = deck.name;
    this.deckId = deck.id;
    this.totalCards = deck.totalCards;
    this.gameCards = gameCards;

    this.validateInvariants();
  }

  private validateInvariants(): void {
    const positionMap = new Map<string, Set<number>>();

    for (const gameCard of this.gameCards) {
      const location = gameCard.location;
      if (location.type !== "Table") {
        const key = location.type;
        if (!positionMap.has(key)) {
          positionMap.set(key, new Set());
        }
        const positions = positionMap.get(key)!;
        if (positions.has(location.position)) {
          throw new Error(`Duplicate position ${location.position} in ${location.type}`);
        }
        positions.add(location.position);
      }
    }

    for (let i = 1; i < this.gameCards.length; i++) {
      const currentCard = this.gameCards[i].card.name;
      const previousCard = this.gameCards[i - 1].card.name;
      if (currentCard.localeCompare(previousCard) < 0) {
        throw new Error(`Cards are not sorted by display name: "${previousCard}" should come after "${currentCard}"`);
      }
    }
  }

  public getCards(): readonly GameCard[] {
    return this.gameCards;
  }

  public toPersistedGameState(): Omit<PersistedGameState, 'stateId'> {
    return {
      gameId: this.gameId,
      status: this.status,
      deckProvenance: this.deckProvenance,
      commanders: [...this.commanders],
      deckName: this.deckName,
      deckId: this.deckId,
      totalCards: this.totalCards,
      gameCards: this.gameCards.map(gc => ({ 
        card: gc.card, 
        location: gc.location 
      }))
    };
  }

  public shuffle(): GameState {
    const libraryCardIndices: number[] = [];
    
    this.gameCards.forEach((gameCard, index) => {
      if (gameCard.location.type === "Library") {
        libraryCardIndices.push(index);
      }
    });
    
    for (let i = libraryCardIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [libraryCardIndices[i], libraryCardIndices[j]] = [libraryCardIndices[j], libraryCardIndices[i]];
    }
    
    libraryCardIndices.forEach((gameCardIndex, position) => {
      this.gameCards[gameCardIndex].location = { type: "Library", position };
    });
    
    this.validateInvariants();
    return this;
  }

  public startGame(): GameState {
    (this as any).status = GameStatus.Active;
    return this.shuffle();
  }

  public static fromPersistedGameState(pgs: PersistedGameState): GameState {
    const tempDeck: Deck = {
      id: pgs.deckId,
      name: pgs.deckName,
      provenance: pgs.deckProvenance,
      commanders: pgs.commanders,
      cards: pgs.gameCards.map(gc => gc.card),
      totalCards: pgs.totalCards
    };

    const gameState = new GameState(pgs.gameId, tempDeck);
    
    (gameState as any).status = pgs.status;
    (gameState as any).gameCards = pgs.gameCards.map(gc => ({
      card: gc.card,
      location: gc.location
    }));

    gameState.validateInvariants();
    return gameState;
  }
}
