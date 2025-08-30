import { CardDefinition, DeckProvenance, Deck } from "./types.js";
import { PersistedGameState } from "./port-persist-state/types.js";

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
  card: CardDefinition;
  location: CardLocation;
}

export class GameState {
  public readonly gameId: GameId;
  public readonly status: GameStatus;
  public readonly deckProvenance: DeckProvenance;
  public readonly commanders: CardDefinition[];
  public readonly deckName: string;
  public readonly deckId: number; // TODO: remove, once it is no longer used in the UI
  public readonly totalCards: number;
  private readonly gameCards: GameCard[];

  constructor(gameId: GameId, deck: Deck);
  constructor(persistedState: PersistedGameState);
  constructor(gameIdOrState: GameId | PersistedGameState, deck?: Deck) {
    if (typeof gameIdOrState === "object") {
      // Constructor from persisted state
      const persistedState = gameIdOrState;
      this.gameId = persistedState.gameId;
      this.status = persistedState.status;
      this.deckProvenance = persistedState.deckProvenance;
      this.commanders = [...persistedState.commanders];
      this.deckName = persistedState.deckName;
      this.deckId = persistedState.deckId;
      this.totalCards = persistedState.totalCards;
      this.gameCards = persistedState.gameCards.map(gc => ({
        card: { ...gc.card },
        location: { ...gc.location } as CardLocation
      }));
    } else {
      // Original constructor from deck
      const gameId = gameIdOrState;
      if (!deck) {
        throw new Error("Deck is required when constructing from gameId");
      }
      
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
    }

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

  public toPersistedState(): PersistedGameState {
    return {
      gameId: this.gameId,
      status: this.status,
      deckProvenance: this.deckProvenance,
      commanders: [...this.commanders],
      deckName: this.deckName,
      deckId: this.deckId,
      totalCards: this.totalCards,
      gameCards: this.gameCards.map(gc => ({
        card: { ...gc.card },
        location: { ...gc.location }
      }))
    };
  }

  public static fromPersistedState(persistedState: PersistedGameState): GameState {
    return new GameState(persistedState);
  }
}
