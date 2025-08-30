export interface Card {
  name: string;
  uid: string;
  multiverseid: number;
}

export interface DeckProvenance {
  retrievedDate: Date;
  sourceUrl: string;
  deckSource: string;
}

export interface Deck {
  id: number;
  name: string;
  totalCards: number;
  commanders: Card[];
  cards: Card[];
  provenance: DeckProvenance;
}

export interface Library {
  cards: Card[];
  count: number;
}

export interface Game {
  deck: Deck;
  library: Library;
}

export function getCardImageUrl(uid: string, format: "small" | "normal" | "large" | "png" | "art_crop" | "border_crop" = "normal"): string {
  const extension = format === "png" ? "png" : "jpg";
  const firstTwo = uid.substring(0, 1);
  const nextTwo = uid.substring(1, 2);
  return `https://cards.scryfall.io/${format}/front/${firstTwo}/${nextTwo}/${uid}.${extension}`;
}

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
  
  constructor(
    status: GameStatus,
    deckProvenance: DeckProvenance,
    commanders: Card[],
    gameCards: GameCard[]
  ) {
    if (commanders.length > 2) {
      throw new Error("Cannot have more than 2 commanders");
    }
    
    this.gameId = GameState.nextGameId++;
    this.status = status;
    this.deckProvenance = deckProvenance;
    this.commanders = [...commanders];
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
    const gameCards: GameCard[] = deck.cards.map((card, index) => ({
      card,
      location: { type: "Library", position: index } as LibraryLocation
    }));
    
    return new GameState(
      GameStatus.NotStarted,
      deck.provenance,
      deck.commanders,
      gameCards
    );
  }
}

export function shuffleDeck(deck: Deck): Library {
  const shuffledCards = [...deck.cards];
  
  // Fisher-Yates shuffle algorithm
  for (let i = shuffledCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]];
  }
  
  return {
    cards: shuffledCards,
    count: shuffledCards.length
  };
}

