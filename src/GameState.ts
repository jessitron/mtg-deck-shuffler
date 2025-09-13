import { CardDefinition, DeckProvenance, Deck, WhatHappened } from "./types.js";
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
  PERSISTED_GAME_STATE_VERSION,
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

  static newGame(gameId: GameId, deck: Deck) {
    if (deck.commanders.length > 2) {
      // TODO: make a warning function
      console.log("Warning: Deck has more than two commanders. Behavior undefined");
    }

    const gameCards: GameCard[] = [...deck.cards]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((card, index) => ({
        card,
        location: { type: "Library", position: index } as LibraryLocation,
        gameCardIndex: index,
      }));

    return new GameState({
      gameId,
      gameStatus: GameStatus.NotStarted,
      deckId: deck.id,
      deckName: deck.name,
      deckProvenance: deck.provenance,
      commanders: [...deck.commanders],
      cards: gameCards,
    });
  }

  constructor(params: {
    gameId: GameId;
    gameStatus: GameStatus;
    deckId: number;
    deckName: string;
    deckProvenance: DeckProvenance;
    commanders: CardDefinition[];
    cards: GameCard[];
  }) {
    this.gameId = params.gameId;
    this.status = params.gameStatus;
    this.deckProvenance = params.deckProvenance;
    this.commanders = params.commanders;
    this.deckName = params.deckName;
    this.deckId = params.deckId;
    this.totalCards = params.cards.length;
    this.gameCards = params.cards;
  }

  static fromPersistedGameState(psg: PersistedGameState): GameState {
    return new GameState({
      ...psg,
      gameStatus: psg.status, // todo: use gameStatus in both places
      cards: psg.gameCards, // todo: use gameCards in both places
    });
  }

  private validateInvariants(): void {
    const positionMap = new Map<string, Set<number>>();

    // note that positions must be unique, but they are not required to be a contiguous set. There can be gaps.
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

  public listLibrary(): readonly (GameCard & { location: LibraryLocation })[] {
    return this.gameCards.filter(isInLibrary).sort((a, b) => a.location.position - b.location.position);
  }

  public listHand(): readonly (GameCard & { location: HandLocation })[] {
    return this.gameCards.filter(isInHand).sort((a, b) => a.location.position - b.location.position);
  }

  public listRevealed(): readonly (GameCard & { location: RevealedLocation })[] {
    return this.gameCards.filter(isRevealed).sort((a, b) => a.location.position - b.location.position);
  }

  public listTable(): readonly (GameCard & { location: TableLocation })[] {
    return this.gameCards.filter(isOnTable);
  }

  public shuffle(): WhatHappened {
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
    return { shuffling: true };
  }

  public startGame(): this {
    if (this.status !== GameStatus.NotStarted) {
      throw new Error(`Cannot start game: current status is ${this.status}`);
    }

    (this as any).status = GameStatus.Active;
    this.shuffle(); // We don't need the return value here, just the side effect

    return this;
  }

  private addToRevealed(gameCard: GameCard): this {
    const revealedCards = this.listRevealed();
    const maxPosition = revealedCards.length > 0 ? Math.max(...revealedCards.map((gc) => gc.location.position)) : -1;
    const nextPosition = maxPosition + 1;
    gameCard.location = { type: "Revealed", position: nextPosition };
    return this;
  }

  private addToHand(gameCard: GameCard): this {
    const handCards = this.listHand();
    const maxHandPosition = handCards.length > 0 ? Math.max(...handCards.map((gc) => gc.location.position)) : -1;
    const nextHandPosition = maxHandPosition + 1;
    gameCard.location = { type: "Hand", position: nextHandPosition };
    return this;
  }

  private addToTopOfLibrary(gameCard: GameCard): this {
    const libraryCards = this.listLibrary();

    // Shift all existing library cards down by 1 position
    libraryCards.forEach((libCard) => {
      (libCard.location as LibraryLocation).position += 1;
    });

    // Put the new card at position 0 (top of library)
    gameCard.location = { type: "Library", position: 0 };
    return this;
  }

  private addToBottomOfLibrary(gameCard: GameCard): this {
    const libraryCards = this.listLibrary();
    const maxLibraryPosition = libraryCards.length > 0 ? Math.max(...libraryCards.map((gc) => gc.location.position)) : -1;
    const nextLibraryPosition = maxLibraryPosition + 1;
    gameCard.location = { type: "Library", position: nextLibraryPosition };
    return this;
  }

  public draw(): this {
    const libraryCards = this.listLibrary();

    if (libraryCards.length === 0) {
      throw new Error("Cannot draw: Library is empty");
    }

    // Find the top card (position 0)
    const topCard = libraryCards[0];

    // Find the next available hand position
    this.addToHand(topCard);

    this.validateInvariants();
    return this;
  }

  public playCard(gameCardIndex: number): WhatHappened {
    if (gameCardIndex < 0 || gameCardIndex >= this.gameCards.length) {
      throw new Error(`Invalid gameCardIndex: ${gameCardIndex}`);
    }

    const cardToPlay = this.gameCards[gameCardIndex];

    if (!isInHand(cardToPlay) && !isRevealed(cardToPlay)) {
      throw new Error(`Card at gameCardIndex ${gameCardIndex} is not in hand or revealed`);
    }

    const cardsToMoveLeft = this.gameCards
      .filter((gc) => gc.location.type === cardToPlay.location.type)
      .filter((gc) => isInHand(gc) || isRevealed(gc)) // this is for type happiness
      .filter((gc) => gc.location.position > cardToPlay.location.position);

    // Move card to table
    (cardToPlay as any).location = { type: "Table" };

    this.validateInvariants();

    return {
      movedLeft: cardsToMoveLeft,
    };
  }

  public reveal(position: number): this {
    const libraryCards = this.listLibrary();
    const cardToReveal = libraryCards.find((gc) => (gc.location as LibraryLocation).position === position);

    if (!cardToReveal) {
      throw new Error(`No card found at library position ${position}`);
    }

    this.addToRevealed(cardToReveal);

    this.validateInvariants();
    return this;
  }

  public revealByGameCardIndex(gameCardIndex: number): this {
    const allCards = this.getCards();
    if (gameCardIndex < 0 || gameCardIndex >= allCards.length) {
      throw new Error(`Invalid game card index: ${gameCardIndex}`);
    }

    const cardToReveal = allCards[gameCardIndex];

    this.addToRevealed(cardToReveal);

    this.validateInvariants();
    return this;
  }

  public putInHandByGameCardIndex(gameCardIndex: number): this {
    const allCards = this.getCards();
    if (gameCardIndex < 0 || gameCardIndex >= allCards.length) {
      throw new Error(`Invalid game card index: ${gameCardIndex}`);
    }

    const cardToPutInHand = allCards[gameCardIndex];

    this.addToHand(cardToPutInHand);

    this.validateInvariants();
    return this;
  }

  public putOnTopByGameCardIndex(gameCardIndex: number): this {
    const allCards = this.getCards();
    if (gameCardIndex < 0 || gameCardIndex >= allCards.length) {
      throw new Error(`Invalid game card index: ${gameCardIndex}`);
    }

    const cardToPutOnTop = allCards[gameCardIndex];

    this.addToTopOfLibrary(cardToPutOnTop);

    this.validateInvariants();
    return this;
  }

  public putOnBottomByGameCardIndex(gameCardIndex: number): this {
    const allCards = this.getCards();
    if (gameCardIndex < 0 || gameCardIndex >= allCards.length) {
      throw new Error(`Invalid game card index: ${gameCardIndex}`);
    }

    const cardToPutOnBottom = allCards[gameCardIndex];

    this.addToBottomOfLibrary(cardToPutOnBottom);

    this.validateInvariants();
    return this;
  }

  public swapHandCardWithNext(handPosition: number): WhatHappened {
    const handCards = this.listHand();

    if (handPosition < 0 || handPosition >= handCards.length - 1) {
      throw new Error(`Invalid hand position for swap: ${handPosition}. Must be between 0 and ${handCards.length - 2}`);
    }

    const cardToSwap = handCards[handPosition];
    const cardToRight = handCards[handPosition + 1];

    // Swap their positions
    const tempPosition = cardToSwap.location.position;
    (cardToSwap.location as HandLocation).position = cardToRight.location.position;
    (cardToRight.location as HandLocation).position = tempPosition;

    this.validateInvariants();

    return {
      movedRight: [cardToSwap],
      movedLeft: [cardToRight],
    };
  }

  public toPersistedGameState(): PersistedGameState {
    return {
      version: PERSISTED_GAME_STATE_VERSION,
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
