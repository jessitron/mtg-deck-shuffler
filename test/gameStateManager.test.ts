import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GameStateManager, GameCard, CardLocation } from '../src/gameState.js';
import { Deck, Card } from '../src/deck.js';

function createMockCard(name: string, uid: string = name.toLowerCase().replace(/\s/g, ''), multiverseid: number = 1): Card {
  return { name, uid, multiverseid };
}

function createMockDeck(cards: Card[], commander?: Card): Deck {
  return {
    id: 12345,
    name: 'Test Deck',
    totalCards: cards.length + (commander ? 1 : 0),
    includedCards: cards.length + (commander ? 1 : 0),
    excludedCards: 0,
    commander,
    cards,
    retrievedDate: new Date()
  };
}

describe('GameStateManager', () => {
  describe('Initialization and Invariants', () => {
    it('should initialize from deck with commander', () => {
      const commander = createMockCard('Sol Ring');
      const cards = [
        createMockCard('Lightning Bolt'),
        createMockCard('Counterspell'),
        createMockCard('Giant Growth')
      ];
      const deck = createMockDeck(cards, commander);
      
      const gsm = GameStateManager.initializeFromDeck(deck);
      
      assert.strictEqual(gsm.listCommanders().length, 1);
      assert.strictEqual(gsm.listCommanders()[0].name, 'Sol Ring');
      assert.strictEqual(gsm.listLibrary().length, 3);
      assert.strictEqual(gsm.listHand().length, 0);
      assert.strictEqual(gsm.listRevealed().length, 0);
      assert.strictEqual(gsm.listTable().length, 0);
    });

    it('should initialize from deck without commander', () => {
      const cards = [
        createMockCard('Lightning Bolt'),
        createMockCard('Counterspell')
      ];
      const deck = createMockDeck(cards);
      
      const gsm = GameStateManager.initializeFromDeck(deck);
      
      assert.strictEqual(gsm.listCommanders().length, 0);
      assert.strictEqual(gsm.listLibrary().length, 2);
    });

    it('should validate commander count invariant', () => {
      const cards: GameCard[] = [
        { card: createMockCard('Commander 1'), location: { type: 'CommandZone' } },
        { card: createMockCard('Commander 2'), location: { type: 'CommandZone' } },
        { card: createMockCard('Commander 3'), location: { type: 'CommandZone' } }
      ];
      
      const gameState = {
        deckRetrievalSpec: { deckId: '123', retrievedTimestamp: new Date() },
        cards
      };

      assert.throws(() => new GameStateManager(gameState), /Cannot have more than 2 commanders/);
    });

    it('should validate no duplicate positions invariant', () => {
      const cards: GameCard[] = [
        { card: createMockCard('Card 1'), location: { type: 'Library', position: 0 } },
        { card: createMockCard('Card 2'), location: { type: 'Library', position: 0 } }
      ];
      
      const gameState = {
        deckRetrievalSpec: { deckId: '123', retrievedTimestamp: new Date() },
        cards
      };

      assert.throws(() => new GameStateManager(gameState), /Duplicate position 0 in Library/);
    });

    it('should allow multiple cards in Table with no position tracking', () => {
      const cards: GameCard[] = [
        { card: createMockCard('Card 1'), location: { type: 'Table' } },
        { card: createMockCard('Card 2'), location: { type: 'Table' } },
        { card: createMockCard('Card 3'), location: { type: 'Table' } }
      ];
      
      const gameState = {
        deckRetrievalSpec: { deckId: '123', retrievedTimestamp: new Date() },
        cards
      };

      const gsm = new GameStateManager(gameState);
      assert.strictEqual(gsm.listTable().length, 3);
    });
  });

  describe('Shuffle Operation', () => {
    it('should randomize library positions while keeping other zones unchanged', () => {
      const cards = [
        createMockCard('Card 1'),
        createMockCard('Card 2'),
        createMockCard('Card 3'),
        createMockCard('Card 4'),
        createMockCard('Card 5')
      ];
      const deck = createMockDeck(cards);
      let gsm = GameStateManager.initializeFromDeck(deck);

      const originalLibrarySize = gsm.listLibrary().length;
      gsm = gsm.shuffle();

      assert.strictEqual(gsm.listLibrary().length, originalLibrarySize);
      assert.strictEqual(gsm.listCommanders().length, 0);
      assert.strictEqual(gsm.listHand().length, 0);
      assert.strictEqual(gsm.listRevealed().length, 0);
      assert.strictEqual(gsm.listTable().length, 0);

      const libraryAfterShuffle = gsm.listLibrary();
      const hasAllOriginalCards = cards.every(card => 
        libraryAfterShuffle.some(libCard => libCard.name === card.name)
      );
      assert.ok(hasAllOriginalCards);
    });
  });

  describe('Draw Operation', () => {
    it('should move top card from library to hand', () => {
      const cards = [
        createMockCard('Top Card'),
        createMockCard('Second Card'),
        createMockCard('Third Card')
      ];
      const deck = createMockDeck(cards);
      let gsm = GameStateManager.initializeFromDeck(deck);

      const topCard = gsm.listLibrary()[0];
      gsm = gsm.draw();

      assert.strictEqual(gsm.listLibrary().length, 2);
      assert.strictEqual(gsm.listHand().length, 1);
      assert.strictEqual(gsm.listHand()[0].name, topCard.name);
    });

    it('should throw error when library is empty', () => {
      const gameState = {
        deckRetrievalSpec: { deckId: '123', retrievedTimestamp: new Date() },
        cards: []
      };
      const gsm = new GameStateManager(gameState);

      assert.throws(() => gsm.draw(), /No cards in library to draw/);
    });
  });

  describe('Reveal Operation', () => {
    it('should move top card from library to revealed', () => {
      const cards = [
        createMockCard('Top Card'),
        createMockCard('Second Card')
      ];
      const deck = createMockDeck(cards);
      let gsm = GameStateManager.initializeFromDeck(deck);

      const topCard = gsm.listLibrary()[0];
      gsm = gsm.reveal();

      assert.strictEqual(gsm.listLibrary().length, 1);
      assert.strictEqual(gsm.listRevealed().length, 1);
      assert.strictEqual(gsm.listRevealed()[0].name, topCard.name);
    });

    it('should throw error when library is empty', () => {
      const gameState = {
        deckRetrievalSpec: { deckId: '123', retrievedTimestamp: new Date() },
        cards: []
      };
      const gsm = new GameStateManager(gameState);

      assert.throws(() => gsm.reveal(), /No cards in library to reveal/);
    });
  });

  describe('Return to Bottom Operation', () => {
    it('should move revealed card to bottom of library', () => {
      const cards = [
        createMockCard('Library Card 1'),
        createMockCard('Library Card 2')
      ];
      const deck = createMockDeck(cards);
      let gsm = GameStateManager.initializeFromDeck(deck);
      
      gsm = gsm.reveal();
      const revealedCard = gsm.listRevealed()[0];
      gsm = gsm.returnToBottom(gsm.cards.find(gc => gc.card === revealedCard)!);

      assert.strictEqual(gsm.listLibrary().length, 2);
      assert.strictEqual(gsm.listRevealed().length, 0);
      const library = gsm.listLibrary();
      assert.strictEqual(library[library.length - 1].name, revealedCard.name);
    });

    it('should throw error for non-revealed cards', () => {
      const cards = [createMockCard('Card')];
      const deck = createMockDeck(cards);
      let gsm = GameStateManager.initializeFromDeck(deck);
      gsm = gsm.draw();
      const handCard = gsm.cards.find(gc => gc.location.type === 'Hand')!;

      assert.throws(() => gsm.returnToBottom(handCard), /Can only return revealed cards to library/);
    });
  });

  describe('Return to Top Operation', () => {
    it('should move revealed card to top of library', () => {
      const cards = [
        createMockCard('Library Card 1'),
        createMockCard('Library Card 2')
      ];
      const deck = createMockDeck(cards);
      let gsm = GameStateManager.initializeFromDeck(deck);
      
      gsm = gsm.reveal();
      const revealedCard = gsm.listRevealed()[0];
      gsm = gsm.returnToTop(gsm.cards.find(gc => gc.card === revealedCard)!);

      assert.strictEqual(gsm.listLibrary().length, 2);
      assert.strictEqual(gsm.listRevealed().length, 0);
      const library = gsm.listLibrary();
      assert.strictEqual(library[0].name, revealedCard.name);
    });
  });

  describe('Move to Hand Operation', () => {
    it('should move revealed card to hand', () => {
      const cards = [createMockCard('Card to Reveal')];
      const deck = createMockDeck(cards);
      let gsm = GameStateManager.initializeFromDeck(deck);
      
      gsm = gsm.reveal();
      const revealedCard = gsm.listRevealed()[0];
      gsm = gsm.moveToHand(gsm.cards.find(gc => gc.card === revealedCard)!);

      assert.strictEqual(gsm.listLibrary().length, 0);
      assert.strictEqual(gsm.listRevealed().length, 0);
      assert.strictEqual(gsm.listHand().length, 1);
      assert.strictEqual(gsm.listHand()[0].name, revealedCard.name);
    });
  });

  describe('Move to Table Operation', () => {
    it('should move revealed card to table', () => {
      const cards = [createMockCard('Card to Reveal')];
      const deck = createMockDeck(cards);
      let gsm = GameStateManager.initializeFromDeck(deck);
      
      gsm = gsm.reveal();
      const revealedCard = gsm.listRevealed()[0];
      gsm = gsm.moveToTable(gsm.cards.find(gc => gc.card === revealedCard)!);

      assert.strictEqual(gsm.listRevealed().length, 0);
      assert.strictEqual(gsm.listTable().length, 1);
      assert.strictEqual(gsm.listTable()[0].name, revealedCard.name);
    });

    it('should move hand card to table', () => {
      const cards = [createMockCard('Card to Draw')];
      const deck = createMockDeck(cards);
      let gsm = GameStateManager.initializeFromDeck(deck);
      
      gsm = gsm.draw();
      const handCard = gsm.listHand()[0];
      gsm = gsm.moveToTable(gsm.cards.find(gc => gc.card === handCard)!);

      assert.strictEqual(gsm.listHand().length, 0);
      assert.strictEqual(gsm.listTable().length, 1);
      assert.strictEqual(gsm.listTable()[0].name, handCard.name);
    });
  });

  describe('Return from Table Operation', () => {
    it('should move table card to revealed', () => {
      const cards = [createMockCard('Card')];
      const deck = createMockDeck(cards);
      let gsm = GameStateManager.initializeFromDeck(deck);
      
      gsm = gsm.reveal();
      const gameCard = gsm.cards.find(gc => gc.location.type === 'Revealed')!;
      gsm = gsm.moveToTable(gameCard);
      const tableCard = gsm.cards.find(gc => gc.location.type === 'Table')!;
      gsm = gsm.returnFromTable(tableCard);

      assert.strictEqual(gsm.listTable().length, 0);
      assert.strictEqual(gsm.listRevealed().length, 1);
    });
  });

  describe('Hand Movement Operations', () => {
    it('should move card left in hand', () => {
      const cards = [
        createMockCard('Card 1'),
        createMockCard('Card 2'),
        createMockCard('Card 3')
      ];
      const deck = createMockDeck(cards);
      let gsm = GameStateManager.initializeFromDeck(deck);
      
      gsm = gsm.draw();
      gsm = gsm.draw();
      gsm = gsm.draw();

      const hand = gsm.listHand();
      assert.strictEqual(hand.length, 3);
      
      const middleCard = gsm.cards.find(gc => gc.location.type === 'Hand' && gc.location.position === 1)!;
      gsm = gsm.moveLeftInHand(middleCard);

      const newHand = gsm.listHand();
      assert.strictEqual(newHand[0].name, middleCard.card.name);
    });

    it('should move card right in hand', () => {
      const cards = [
        createMockCard('Card 1'),
        createMockCard('Card 2'),
        createMockCard('Card 3')
      ];
      const deck = createMockDeck(cards);
      let gsm = GameStateManager.initializeFromDeck(deck);
      
      gsm = gsm.draw();
      gsm = gsm.draw();
      gsm = gsm.draw();

      const firstCard = gsm.cards.find(gc => gc.location.type === 'Hand' && gc.location.position === 0)!;
      gsm = gsm.moveRightInHand(firstCard);

      const newHand = gsm.listHand();
      assert.strictEqual(newHand[1].name, firstCard.card.name);
    });

    it('should throw error when moving leftmost card further left', () => {
      const cards = [createMockCard('Card')];
      const deck = createMockDeck(cards);
      let gsm = GameStateManager.initializeFromDeck(deck);
      gsm = gsm.draw();

      const handCard = gsm.cards.find(gc => gc.location.type === 'Hand')!;
      assert.throws(() => gsm.moveLeftInHand(handCard), /Cannot move leftmost card further left/);
    });

    it('should throw error when moving rightmost card further right', () => {
      const cards = [createMockCard('Card')];
      const deck = createMockDeck(cards);
      let gsm = GameStateManager.initializeFromDeck(deck);
      gsm = gsm.draw();

      const handCard = gsm.cards.find(gc => gc.location.type === 'Hand')!;
      assert.throws(() => gsm.moveRightInHand(handCard), /Cannot move rightmost card further right/);
    });
  });

  describe('Views', () => {
    it('should list library cards in position order', () => {
      const cards = [
        createMockCard('Card 1'),
        createMockCard('Card 2'),
        createMockCard('Card 3')
      ];
      const deck = createMockDeck(cards);
      const gsm = GameStateManager.initializeFromDeck(deck);

      const library = gsm.listLibrary();
      assert.strictEqual(library.length, 3);
      assert.strictEqual(library[0].name, 'Card 1');
      assert.strictEqual(library[1].name, 'Card 2');
      assert.strictEqual(library[2].name, 'Card 3');
    });

    it('should list hand cards in position order', () => {
      const cards = [
        createMockCard('Card 1'),
        createMockCard('Card 2'),
        createMockCard('Card 3')
      ];
      const deck = createMockDeck(cards);
      let gsm = GameStateManager.initializeFromDeck(deck);
      
      gsm = gsm.draw();
      gsm = gsm.draw();
      gsm = gsm.draw();

      const hand = gsm.listHand();
      assert.strictEqual(hand.length, 3);
      assert.strictEqual(hand[0].name, 'Card 1');
      assert.strictEqual(hand[1].name, 'Card 2');
      assert.strictEqual(hand[2].name, 'Card 3');
    });

    it('should list revealed cards in position order', () => {
      const cards = [
        createMockCard('Card 1'),
        createMockCard('Card 2')
      ];
      const deck = createMockDeck(cards);
      let gsm = GameStateManager.initializeFromDeck(deck);
      
      gsm = gsm.reveal();
      gsm = gsm.reveal();

      const revealed = gsm.listRevealed();
      assert.strictEqual(revealed.length, 2);
      assert.strictEqual(revealed[0].name, 'Card 1');
      assert.strictEqual(revealed[1].name, 'Card 2');
    });

    it('should list table cards sorted by name', () => {
      const cards = [
        createMockCard('Zebra'),
        createMockCard('Apple')
      ];
      const deck = createMockDeck(cards);
      let gsm = GameStateManager.initializeFromDeck(deck);
      
      gsm = gsm.reveal();
      let revealedCard = gsm.cards.find(gc => gc.location.type === 'Revealed')!;
      gsm = gsm.moveToTable(revealedCard);
      
      gsm = gsm.reveal();
      revealedCard = gsm.cards.find(gc => gc.location.type === 'Revealed')!;
      gsm = gsm.moveToTable(revealedCard);

      const table = gsm.listTable();
      assert.strictEqual(table.length, 2);
      assert.strictEqual(table[0].name, 'Apple');
      assert.strictEqual(table[1].name, 'Zebra');
    });
  });
});