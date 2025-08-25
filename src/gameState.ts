import { Deck, Card } from './deck.js';

export interface DeckRetrievalSpec {
  deckId: string;
  retrievedTimestamp: Date;
} 

export type CardLocation = 
  | { type: 'CommandZone' }
  | { type: 'Library'; position: number }
  | { type: 'Hand'; position: number }
  | { type: 'Revealed'; position: number }
  | { type: 'Table' };

export interface GameCard {
  card: Card;
  location: CardLocation;
}

export interface GameState {
  deckRetrievalSpec: DeckRetrievalSpec;
  cards: GameCard[];
}

export class GameStateManager {
  private gameState: GameState;

  constructor(gameState: GameState) {
    this.gameState = gameState;
    this.validateInvariants();
  }

  private validateInvariants(): void {
    const commanders = this.cards.filter(gc => gc.location.type === 'CommandZone');
    if (commanders.length > 2) {
      throw new Error('Cannot have more than 2 commanders');
    }

    const positionsUsed = new Map<string, Set<number>>();
    for (const gameCard of this.cards) {
      const { location } = gameCard;
      if (location.type !== 'Table' && location.type !== 'CommandZone') {
        const key = location.type;
        if (!positionsUsed.has(key)) {
          positionsUsed.set(key, new Set());
        }
        const positions = positionsUsed.get(key)!;
        if (positions.has(location.position)) {
          throw new Error(`Duplicate position ${location.position} in ${location.type}`);
        }
        positions.add(location.position);
      }
    }
  }

  get cards(): GameCard[] {
    return [...this.gameState.cards];
  }

  get deckRetrievalSpec(): DeckRetrievalSpec {
    return { ...this.gameState.deckRetrievalSpec };
  }

  static initializeFromDeck(deck: Deck): GameStateManager {
    const deckRetrievalSpec: DeckRetrievalSpec = {
      deckId: deck.id.toString(),
      retrievedTimestamp: deck.retrievedDate
    };

    const cards: GameCard[] = [];
    let libraryPosition = 0;

    if (deck.commander) {
      cards.push({
        card: deck.commander,
        location: { type: 'CommandZone' }
      });
    }

    for (const card of deck.cards) {
      cards.push({
        card,
        location: { type: 'Library', position: libraryPosition++ }
      });
    }

    const gameState: GameState = {
      deckRetrievalSpec,
      cards
    };

    return new GameStateManager(gameState);
  }

  shuffle(): GameStateManager {
    const libraryCards = this.cards.filter(gc => gc.location.type === 'Library');
    const nonLibraryCards = this.cards.filter(gc => gc.location.type !== 'Library');
    
    for (let i = libraryCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [libraryCards[i], libraryCards[j]] = [libraryCards[j], libraryCards[i]];
    }

    libraryCards.forEach((gc, index) => {
      gc.location = { type: 'Library', position: index };
    });

    const newGameState: GameState = {
      deckRetrievalSpec: this.gameState.deckRetrievalSpec,
      cards: [...nonLibraryCards, ...libraryCards]
    };

    return new GameStateManager(newGameState);
  }

  draw(): GameStateManager {
    const topCard = this.cards.find(gc => 
      gc.location.type === 'Library' && gc.location.position === 0
    );
    
    if (!topCard) {
      throw new Error('No cards in library to draw');
    }

    const handCards = this.cards.filter(gc => gc.location.type === 'Hand');
    const nextHandPosition = handCards.length;

    const newCards = this.cards.map(gc => {
      if (gc === topCard) {
        return { ...gc, location: { type: 'Hand', position: nextHandPosition } as CardLocation };
      }
      if (gc.location.type === 'Library' && gc.location.position > 0) {
        return { ...gc, location: { type: 'Library', position: gc.location.position - 1 } as CardLocation };
      }
      return gc;
    });

    const newGameState: GameState = {
      deckRetrievalSpec: this.gameState.deckRetrievalSpec,
      cards: newCards
    };

    return new GameStateManager(newGameState);
  }

  reveal(): GameStateManager {
    const topCard = this.cards.find(gc => 
      gc.location.type === 'Library' && gc.location.position === 0
    );
    
    if (!topCard) {
      throw new Error('No cards in library to reveal');
    }

    const revealedCards = this.cards.filter(gc => gc.location.type === 'Revealed');
    const nextRevealedPosition = revealedCards.length;

    const newCards = this.cards.map(gc => {
      if (gc === topCard) {
        return { ...gc, location: { type: 'Revealed', position: nextRevealedPosition } as CardLocation };
      }
      if (gc.location.type === 'Library' && gc.location.position > 0) {
        return { ...gc, location: { type: 'Library', position: gc.location.position - 1 } as CardLocation };
      }
      return gc;
    });

    const newGameState: GameState = {
      deckRetrievalSpec: this.gameState.deckRetrievalSpec,
      cards: newCards
    };

    return new GameStateManager(newGameState);
  }

  returnToBottom(cardToMove: GameCard): GameStateManager {
    if (cardToMove.location.type !== 'Revealed') {
      throw new Error('Can only return revealed cards to library');
    }

    const libraryCards = this.cards.filter(gc => gc.location.type === 'Library');
    const maxLibraryPosition = Math.max(-1, ...libraryCards.map(gc => 
      gc.location.type === 'Library' ? gc.location.position : -1
    ));
    const newLibraryPosition = maxLibraryPosition + 1;

    const newCards = this.cards.map(gc => {
      if (gc === cardToMove) {
        return { ...gc, location: { type: 'Library', position: newLibraryPosition } as CardLocation };
      }
      if (gc.location.type === 'Revealed' && 'position' in cardToMove.location && 'position' in gc.location && gc.location.position > cardToMove.location.position) {
        return { ...gc, location: { type: 'Revealed', position: gc.location.position - 1 } as CardLocation };
      }
      return gc;
    });

    const newGameState: GameState = {
      deckRetrievalSpec: this.gameState.deckRetrievalSpec,
      cards: newCards
    };

    return new GameStateManager(newGameState);
  }

  returnToTop(cardToMove: GameCard): GameStateManager {
    if (cardToMove.location.type !== 'Revealed') {
      throw new Error('Can only return revealed cards to library');
    }

    const newCards = this.cards.map(gc => {
      if (gc === cardToMove) {
        return { ...gc, location: { type: 'Library', position: 0 } as CardLocation };
      }
      if (gc.location.type === 'Library') {
        return { ...gc, location: { type: 'Library', position: gc.location.position + 1 } as CardLocation };
      }
      if (gc.location.type === 'Revealed' && 'position' in cardToMove.location && 'position' in gc.location && gc.location.position > cardToMove.location.position) {
        return { ...gc, location: { type: 'Revealed', position: gc.location.position - 1 } as CardLocation };
      }
      return gc;
    });

    const newGameState: GameState = {
      deckRetrievalSpec: this.gameState.deckRetrievalSpec,
      cards: newCards
    };

    return new GameStateManager(newGameState);
  }

  moveToHand(cardToMove: GameCard): GameStateManager {
    if (cardToMove.location.type !== 'Revealed') {
      throw new Error('Can only move revealed cards to hand');
    }

    const handCards = this.cards.filter(gc => gc.location.type === 'Hand');
    const nextHandPosition = handCards.length;

    const newCards = this.cards.map(gc => {
      if (gc === cardToMove) {
        return { ...gc, location: { type: 'Hand', position: nextHandPosition } as CardLocation };
      }
      if (gc.location.type === 'Revealed' && 'position' in cardToMove.location && 'position' in gc.location && gc.location.position > cardToMove.location.position) {
        return { ...gc, location: { type: 'Revealed', position: gc.location.position - 1 } as CardLocation };
      }
      return gc;
    });

    const newGameState: GameState = {
      deckRetrievalSpec: this.gameState.deckRetrievalSpec,
      cards: newCards
    };

    return new GameStateManager(newGameState);
  }

  moveToTable(cardToMove: GameCard): GameStateManager {
    if (cardToMove.location.type !== 'Revealed' && cardToMove.location.type !== 'Hand') {
      throw new Error('Can only move revealed cards or hand cards to table');
    }

    const originalLocation = cardToMove.location;
    const newCards = this.cards.map(gc => {
      if (gc === cardToMove) {
        return { ...gc, location: { type: 'Table' } as CardLocation };
      }
      
      if (originalLocation.type === 'Hand' && gc.location.type === 'Hand' && gc.location.position > originalLocation.position) {
        return { ...gc, location: { type: 'Hand', position: gc.location.position - 1 } as CardLocation };
      }
      if (originalLocation.type === 'Revealed' && gc.location.type === 'Revealed' && gc.location.position > originalLocation.position) {
        return { ...gc, location: { type: 'Revealed', position: gc.location.position - 1 } as CardLocation };
      }
      return gc;
    });

    const newGameState: GameState = {
      deckRetrievalSpec: this.gameState.deckRetrievalSpec,
      cards: newCards
    };

    return new GameStateManager(newGameState);
  }

  returnFromTable(cardToMove: GameCard): GameStateManager {
    if (cardToMove.location.type !== 'Table') {
      throw new Error('Can only return table cards to revealed');
    }

    const revealedCards = this.cards.filter(gc => gc.location.type === 'Revealed');
    const nextRevealedPosition = revealedCards.length;

    const newCards = this.cards.map(gc => {
      if (gc === cardToMove) {
        return { ...gc, location: { type: 'Revealed', position: nextRevealedPosition } as CardLocation };
      }
      return gc;
    });

    const newGameState: GameState = {
      deckRetrievalSpec: this.gameState.deckRetrievalSpec,
      cards: newCards
    };

    return new GameStateManager(newGameState);
  }

  moveLeftInHand(cardToMove: GameCard): GameStateManager {
    if (cardToMove.location.type !== 'Hand') {
      throw new Error('Can only move hand cards within hand');
    }
    
    if (cardToMove.location.position === 0) {
      throw new Error('Cannot move leftmost card further left');
    }

    const newCards = this.cards.map(gc => {
      if (gc === cardToMove && 'position' in cardToMove.location) {
        return { ...gc, location: { type: 'Hand', position: cardToMove.location.position - 1 } as CardLocation };
      }
      if (gc.location.type === 'Hand' && 'position' in cardToMove.location && 'position' in gc.location && gc.location.position === cardToMove.location.position - 1) {
        return { ...gc, location: { type: 'Hand', position: gc.location.position + 1 } as CardLocation };
      }
      return gc;
    });

    const newGameState: GameState = {
      deckRetrievalSpec: this.gameState.deckRetrievalSpec,
      cards: newCards
    };

    return new GameStateManager(newGameState);
  }

  moveRightInHand(cardToMove: GameCard): GameStateManager {
    if (cardToMove.location.type !== 'Hand') {
      throw new Error('Can only move hand cards within hand');
    }

    const handCards = this.cards.filter(gc => gc.location.type === 'Hand');
    const maxHandPosition = Math.max(-1, ...handCards.map(gc => 
      gc.location.type === 'Hand' ? gc.location.position : -1
    ));
    
    if (cardToMove.location.position === maxHandPosition) {
      throw new Error('Cannot move rightmost card further right');
    }

    const newCards = this.cards.map(gc => {
      if (gc === cardToMove && 'position' in cardToMove.location) {
        return { ...gc, location: { type: 'Hand', position: cardToMove.location.position + 1 } as CardLocation };
      }
      if (gc.location.type === 'Hand' && 'position' in cardToMove.location && 'position' in gc.location && gc.location.position === cardToMove.location.position + 1) {
        return { ...gc, location: { type: 'Hand', position: gc.location.position - 1 } as CardLocation };
      }
      return gc;
    });

    const newGameState: GameState = {
      deckRetrievalSpec: this.gameState.deckRetrievalSpec,
      cards: newCards
    };

    return new GameStateManager(newGameState);
  }

  listCommanders(): Card[] {
    return this.cards
      .filter(gc => gc.location.type === 'CommandZone')
      .map(gc => gc.card);
  }

  listLibrary(): Card[] {
    return this.cards
      .filter(gc => gc.location.type === 'Library')
      .sort((a, b) => {
        const aPos = a.location.type === 'Library' ? a.location.position : 0;
        const bPos = b.location.type === 'Library' ? b.location.position : 0;
        return aPos - bPos;
      })
      .map(gc => gc.card);
  }

  listHand(): Card[] {
    return this.cards
      .filter(gc => gc.location.type === 'Hand')
      .sort((a, b) => {
        const aPos = a.location.type === 'Hand' ? a.location.position : 0;
        const bPos = b.location.type === 'Hand' ? b.location.position : 0;
        return aPos - bPos;
      })
      .map(gc => gc.card);
  }

  listRevealed(): Card[] {
    return this.cards
      .filter(gc => gc.location.type === 'Revealed')
      .sort((a, b) => {
        const aPos = a.location.type === 'Revealed' ? a.location.position : 0;
        const bPos = b.location.type === 'Revealed' ? b.location.position : 0;
        return aPos - bPos;
      })
      .map(gc => gc.card);
  }

  listTable(): Card[] {
    return this.cards
      .filter(gc => gc.location.type === 'Table')
      .map(gc => gc.card)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}

export interface OldGameState {
  id: string;
  status: 'active' | 'ended';
  deckId?: string;
  libraryCards?: Array<{ name: string; count: number }>;
  startDate: Date;
  lastUpdated: Date;
}

export interface GameStateAdapter {
  startGame(gameId: string, deckId?: string): Promise<OldGameState>;
  retrieveGame(gameId: string): Promise<OldGameState | null>;
  updateGame(gameId: string, updates: Partial<Omit<OldGameState, 'id' | 'startDate'>>): Promise<OldGameState>;
  endGame(gameId: string): Promise<void>;
}