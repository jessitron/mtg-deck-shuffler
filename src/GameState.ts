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
  CommandZoneLocation,
  PERSISTED_GAME_STATE_VERSION,
  printLocation,
} from "./port-persist-state/types.js";
import { CardMove, GameEvent, GameEventLog, StartGameEvent, compactShuffleMoves, expandCompactShuffleMoves } from "./GameEvents.js";

export { GameId, GameStatus, CardLocation, GameCard, LibraryLocation, CommandZoneLocation };

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

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

export function isInCommandZone(gameCard: GameCard): gameCard is GameCard & { location: CommandZoneLocation } {
  return gameCard.location.type === "CommandZone";
}

export interface WhatHappened {
  shuffling?: boolean;
  movedRight?: GameCard[];
  movedLeft?: GameCard[];
}

export class GameState {
  public readonly gameId: GameId;
  private status: GameStatus;
  public readonly deckProvenance: DeckProvenance;
  public readonly deckName: string;
  public readonly deckId: number; // TODO: remove, once it is no longer used in the UI
  public readonly totalCards: number;
  private readonly gameCards: GameCard[];
  private readonly eventLog: GameEventLog;
  private readonly randomSeed?: number;

  static newGame(gameId: GameId, deck: Deck, randomSeed?: number) {
    if (deck.commanders.length > 2) {
      // TODO: make a warning function, somehow get it into WhatHappened?
      console.log("Warning: Deck has more than two commanders. Behavior undefined");
    }

    // Combine all cards and sort alphabetically (maintaining existing invariant)
    const allCards = [...deck.commanders.map((card) => ({ card, isCommander: true })), ...deck.cards.map((card) => ({ card, isCommander: false }))].sort(
      (a, b) => a.card.name.localeCompare(b.card.name)
    );

    let commanderPositionCounter = 0;
    let libraryPositionCounter = 0;

    const gameCards: GameCard[] = allCards.map((item, index) => ({
      card: item.card,
      isCommander: item.isCommander,
      location: item.isCommander
        ? ({ type: "CommandZone", position: commanderPositionCounter++ } as CommandZoneLocation)
        : ({ type: "Library", position: libraryPositionCounter++ } as LibraryLocation),
      gameCardIndex: index,
      currentFace: "front" as const,
    }));

    return new GameState({
      gameId,
      gameStatus: GameStatus.NotStarted,
      deckId: deck.id,
      deckName: deck.name,
      deckProvenance: deck.provenance,
      cards: gameCards,
      events: [],
      randomSeed,
    });
  }

  private constructor(params: {
    gameId: GameId;
    gameStatus: GameStatus;
    deckId: number;
    deckName: string;
    deckProvenance: DeckProvenance;
    cards: GameCard[];
    events: GameEvent[];
    randomSeed?: number;
  }) {
    this.gameId = params.gameId;
    this.status = params.gameStatus;
    this.deckProvenance = params.deckProvenance;
    this.deckName = params.deckName;
    this.deckId = params.deckId;
    this.totalCards = params.cards.length;
    this.gameCards = params.cards;
    this.eventLog = GameEventLog.fromPersisted(params.events);
    this.randomSeed = params.randomSeed;
  }

  static fromPersistedGameState(psg: PersistedGameState | any): GameState {
    // Handle migration from version 3 to version 4
    if (psg.version === 3) {
      const legacyPsg = psg; // Legacy format with commanders property
      const commanders: CardDefinition[] = legacyPsg.commanders || [];

      // Add isCommander flag to existing game cards
      const migratedGameCards: GameCard[] = legacyPsg.gameCards.map((gc: any) => ({
        ...gc,
        isCommander: false,
        currentFace: gc.currentFace || ("front" as const),
      }));

      // Add commanders as game cards in command zone
      const commanderCards: GameCard[] = commanders.map((commander, index) => {
        const gameCardIndex = migratedGameCards.length + index;
        return {
          card: commander,
          location: { type: "CommandZone", position: index } as CommandZoneLocation,
          gameCardIndex,
          isCommander: true,
          currentFace: "front" as const,
        };
      });

      // Combine and re-sort to maintain alphabetical invariant
      const allCards = [...migratedGameCards, ...commanderCards]
        .sort((a, b) => a.card.name.localeCompare(b.card.name))
        .map((card, index) => ({ ...card, gameCardIndex: index }));

      return new GameState({
        gameId: psg.gameId,
        gameStatus: psg.status,
        deckId: legacyPsg.deckId,
        deckName: psg.deckName,
        deckProvenance: psg.deckProvenance,
        cards: allCards,
        events: psg.events || [],
      });
    }

    return new GameState({
      ...psg,
      gameStatus: psg.status, // todo: use gameStatus in both places
      cards: psg.gameCards, // todo: use gameCards in both places
      events: psg.events || [],
    });
  }

  public gameStatus() {
    return this.status;
  }

  public getEventLog() {
    return this.eventLog;
  }

  public getEvent(gameEventIndex: number): GameEvent {
    return this.eventLog.getEvents()[gameEventIndex];
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

  public listCommandZone(): readonly (GameCard & { location: CommandZoneLocation })[] {
    return this.gameCards.filter(isInCommandZone).sort((a, b) => a.location.position - b.location.position);
  }

  public listCommanders(): readonly GameCard[] {
    return this.gameCards.filter((gc) => gc.isCommander);
  }

  public shuffle(): WhatHappened {
    const libraryCards = this.gameCards.filter(isInLibrary);

    // Create random number generator (seeded if randomSeed is provided)
    const random = this.randomSeed !== undefined ? new SeededRandom(this.randomSeed) : null;
    const getRandom = () => (random ? random.next() : Math.random());

    // Fisher-Yates shuffle for the library cards array
    for (let i = libraryCards.length - 1; i > 0; i--) {
      const j = Math.floor(getRandom() * (i + 1));
      [libraryCards[i], libraryCards[j]] = [libraryCards[j], libraryCards[i]];
    }

    const moves: CardMove[] = libraryCards.map((gameCard, index) => ({
      gameCardIndex: gameCard.gameCardIndex,
      fromLocation: gameCard.location,
      toLocation: { type: "Library", position: index },
    }));

    moves.forEach((move) => this.executeMove(move, false));

    this.validateInvariants();

    this.eventLog.record({
      eventName: "shuffle library",
      compactMoves: compactShuffleMoves(moves),
    });
    return { shuffling: true };
  }

  public startGame(): this {
    if (this.status !== GameStatus.NotStarted) {
      throw new Error(`Cannot start game: current status is ${this.status}`);
    }

    this.status = GameStatus.Active;
    this.eventLog.record(StartGameEvent);
    this.shuffle(); // We don't need the return value here, just the side effect

    return this;
  }

  /**
   * Grouch if the card isn't where it's supposed to be, then move it. Record the event.
   * @param move
   * @param recording - Shuffling or un-shuffling sets it to false, since that's recorded in its own way.
   */
  private executeMove(move: CardMove, recording: boolean = true) {
    function verifyLocationsAreIdentical(expected: CardLocation, actual: CardLocation) {
      // hmm, this only matters for UNDO, or any sort of move replay. When I have that, move it
      const identical = expected.type == actual.type && (expected as any).position == (expected as any).position;
      if (!identical) {
        warn(
          `Warning! I'm supposed to move card ${move.gameCardIndex} (${gameCard.card.name}) from ${printLocation(
            move.toLocation
          )} but I found it in ${printLocation(gameCard.location)} `
        );
      }
    }
    const gameCard = this.gameCards[move.gameCardIndex];
    verifyLocationsAreIdentical(move.fromLocation, gameCard.location);
    gameCard.location = move.toLocation;
    if (recording) {
      this.eventLog.record({ eventName: "move card", move });
    }
  }
  // TODO: parallel moveCard for flipCard

  private moveCard(gameCard: GameCard, toLocation: CardLocation) {
    const move = {
      gameCardIndex: gameCard.gameCardIndex,
      fromLocation: gameCard.location,
      toLocation,
    };
    return this.executeMove(move);
  }

  private addToRevealed(gameCard: GameCard): this {
    const revealedCards = this.listRevealed();
    const maxPosition = revealedCards.length > 0 ? Math.max(...revealedCards.map((gc) => gc.location.position)) : -1;
    const nextPosition = maxPosition + 1;
    this.moveCard(gameCard, { type: "Revealed", position: nextPosition });
    return this;
  }

  private addToHand(gameCard: GameCard): this {
    const handCards = this.listHand();
    const maxHandPosition = handCards.length > 0 ? Math.max(...handCards.map((gc) => gc.location.position)) : -1;
    const nextHandPosition = maxHandPosition + 1;
    this.moveCard(gameCard, { type: "Hand", position: nextHandPosition });
    return this;
  }

  private addToTopOfLibrary(gameCard: GameCard): this {
    const libraryCards = this.listLibrary();

    // Shift all existing library cards down by 1 position
    libraryCards.forEach((libCard) => {
      (libCard.location as LibraryLocation).position += 1;
    });

    // Put the new card at position 0 (top of library)
    this.moveCard(gameCard, { type: "Library", position: 0 });
    return this;
  }

  private addToBottomOfLibrary(gameCard: GameCard): this {
    const libraryCards = this.listLibrary();
    const maxLibraryPosition = libraryCards.length > 0 ? Math.max(...libraryCards.map((gc) => gc.location.position)) : -1;
    const nextLibraryPosition = maxLibraryPosition + 1;
    this.moveCard(gameCard, { type: "Library", position: nextLibraryPosition });
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
    this.moveCard(cardToPlay, { type: "Table" });

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

    const cardToSwap = handCards[handPosition];
    const cardToRight = handCards[handPosition + 1];
    if (!cardToRight) {
      throw new Error(`No card to right of ${cardToSwap.card.name}`);
    }
    var nextPosition = cardToRight.location.position + 1;

    const cardPastThat = handCards[handPosition + 2];
    if (cardPastThat && cardPastThat.location.position <= nextPosition) {
      // stick this one right in between them. Fractions are numbers!
      nextPosition = (cardPastThat.location.position - cardToRight.location.position) / 2 + cardToRight.location.position;
    }

    const move: CardMove = {
      gameCardIndex: cardToSwap.gameCardIndex,
      fromLocation: cardToSwap.location,
      toLocation: { type: "Hand", position: nextPosition },
    };
    this.executeMove(move);

    this.validateInvariants();

    return {
      movedRight: [cardToSwap],
      movedLeft: [cardToRight],
    };
  }

  public flipCard(gameCardIndex: number): WhatHappened {
    const gameCard = this.gameCards[gameCardIndex];
    if (!gameCard) {
      throw new Error(`Game card with index ${gameCardIndex} not found`);
    }

    if (!gameCard.card.twoFaced) {
      throw new Error(`Card ${gameCard.card.name} is not a two-faced card`);
    }

    const newFace = gameCard.currentFace === "front" ? "back" : "front";
    if (gameCard.currentFace === newFace) {
      warn(`Card ${gameCard.card.name} is already on face ${newFace}`);
    }

    // Update the current face without recording an event
    gameCard.currentFace = newFace;
    return {};
  }

  public findCardByIndex(gameCardIndex: number): GameCard | null {
    if (gameCardIndex < 0 || gameCardIndex >= this.gameCards.length) {
      return null;
    }
    return this.gameCards[gameCardIndex];
  }

  public undo(gameEventIndex: number): GameState {
    const event = this.eventLog.getEvents()[gameEventIndex];
    const applyToState = this.eventLog.reverse(event);

    if (applyToState.eventName === "shuffle library") {
      const moves = expandCompactShuffleMoves(applyToState.compactMoves);
      moves.forEach((move) => this.executeMove(move, false));
    } else if (applyToState.eventName === "move card") {
      this.executeMove(applyToState.move, false);
    } else {
      throw new Error(`Cannot undo event ${event.eventName}`);
    }

    this.eventLog.recordUndo(event);
    return this;
  }

  public toPersistedGameState(): PersistedGameState {
    return {
      version: PERSISTED_GAME_STATE_VERSION,
      gameId: this.gameId,
      status: this.status,
      deckProvenance: this.deckProvenance,
      deckName: this.deckName,
      deckId: this.deckId,
      totalCards: this.totalCards,
      gameCards: [...this.gameCards],
      events: this.eventLog.getEvents(),
    };
  }
}
function warn(message: string) {
  console.log(message);
}
