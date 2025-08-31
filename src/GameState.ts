import { CardDefinition, DeckProvenance, Deck } from "./types.js";
import {
  PersistedGameState,
  GameId,
  GameStatus,
  CardLocation,
  GameCard,
  LibraryLocation,
  HandLocation,
  RevealedLocation,
  TableLocation,
} from "./port-persist-state/types.js";

export { GameId, GameStatus, CardLocation, GameCard, LibraryLocation };

// Type guard functions for GameCard location filtering
export function isInLibrary(gameCard: GameCard): gameCard is GameCard & { location: LibraryLocation } {
  return gameCard.location.type === "Library";
}

export function isInHand(gameCard: GameCard): gameCard is GameCard & { location: HandLocation } {
  return gameCard.location.type === "Hand";
}

export function isRevealed(gameCard: GameCard): gameCard is GameCard & { location: RevealedLocation } {
  return gameCard.location.type === "Revealed";
}

export function isOnTable(gameCard: GameCard): gameCard is GameCard & { location: TableLocation } {
  return gameCard.location.type === "Table";
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

  static fromPersistedGameState(psg: PersistedGameState): GameState {
    const gameState = Object.create(GameState.prototype);
    gameState.gameId = psg.gameId;
    gameState.status = psg.status;
    gameState.deckProvenance = psg.deckProvenance;
    gameState.commanders = [...psg.commanders];
    gameState.deckName = psg.deckName;
    gameState.deckId = psg.deckId;
    gameState.totalCards = psg.totalCards;
    gameState.gameCards = [...psg.gameCards];

    gameState.validateInvariants();
    return gameState;
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

  public listLibrary(): readonly GameCard[] {
    return this.gameCards.filter(isInLibrary).sort((a, b) => a.location.position - b.location.position);
  }

  public listHand(): readonly GameCard[] {
    return this.gameCards.filter(isInHand).sort((a, b) => a.location.position - b.location.position);
  }

  public shuffle(): this {
    const libraryCards = this.gameCards.filter(isInLibrary);

    // Fisher-Yates shuffle for the library cards array
    for (let i = libraryCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [libraryCards[i], libraryCards[j]] = [libraryCards[j], libraryCards[i]];
    }

    // Update positions after shuffle - top card is position 0
    libraryCards.forEach((gameCard, index) => {
      (gameCard.location as LibraryLocation).position = index;
    });

    this.validateInvariants();
    return this;
  }

  public startGame(): this {
    if (this.status !== GameStatus.NotStarted) {
      throw new Error(`Cannot start game: current status is ${this.status}`);
    }

    (this as any).status = GameStatus.Active;
    this.shuffle();

    return this;
  }

  public draw(): this {
    const libraryCards = this.gameCards.filter(isInLibrary);

    if (libraryCards.length === 0) {
      throw new Error("Cannot draw: Library is empty");
    }

    // Find the top card (position 0)
    const topCard = libraryCards.find((gc) => gc.location.position === 0);
    if (!topCard) {
      throw new Error("Cannot draw: No card at Library position 0");
    }

    // Find the next available hand position
    const handCards = this.gameCards.filter(isInHand);
    const maxHandPosition = handCards.length > 0 ? Math.max(...handCards.map((gc) => gc.location.position)) : -1;
    const nextHandPosition = maxHandPosition + 1;

    // Move the card from Library to Hand
    (topCard as GameCard).location = { type: "Hand", position: nextHandPosition } as HandLocation;

    // Adjust positions of remaining library cards - shift all down by 1
    libraryCards
      .filter((gc) => gc !== topCard) // exclude the card we just moved
      .forEach((gc) => {
        const libLocation = gc.location as LibraryLocation;
        libLocation.position = libLocation.position - 1;
      });

    this.validateInvariants();
    return this;
  }

  public toPersistedGameState(): PersistedGameState {
    return {
      gameId: this.gameId,
      status: this.status,
      deckProvenance: this.deckProvenance,
      commanders: [...this.commanders],
      deckName: this.deckName,
      deckId: this.deckId,
      totalCards: this.totalCards,
      gameCards: [...this.gameCards],
    };
  }
}
