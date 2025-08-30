import { CardDefinition, DeckProvenance, Deck } from "./types.js";
import { 
  PersistedGameState, 
  GameId, 
  GameStatus, 
  CardLocation, 
  GameCard, 
  LibraryLocation 
} from "./port-persist-state/types.js";

export { GameId, GameStatus, CardLocation, GameCard, LibraryLocation };

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
