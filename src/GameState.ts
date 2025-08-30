import { Card, DeckProvenance, Deck } from './types.js';

export enum GameStatus {
  NotStarted = "NotStarted",
  Active = "Active", 
  Ended = "Ended"
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
  private static nextGameId = 1;
  
  public readonly gameId: number;
  public readonly status: GameStatus;
  public readonly deckProvenance: DeckProvenance;
  public readonly commanders: Card[];
  private readonly gameCards: GameCard[];
  
  constructor(gameId: number, deck: Deck) {
    if (deck.commanders.length > 2) {
      throw new Error("Cannot have more than 2 commanders");
    }
    
    const gameCards: GameCard[] = deck.cards.map((card, index) => ({
      card,
      location: { type: "Library", position: index } as LibraryLocation
    }));
    
    this.gameId = gameId;
    this.status = GameStatus.NotStarted;
    this.deckProvenance = deck.provenance;
    this.commanders = [...deck.commanders];
    this.gameCards = [...gameCards].sort((a, b) => a.card.name.localeCompare(b.card.name));
    
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
  }
  
  public getCards(): readonly GameCard[] {
    return this.gameCards;
  }
  
  static initialize(deck: Deck): GameState {
    return new GameState(GameState.nextGameId++, deck);
  }
}