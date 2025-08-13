import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ArchidektDeck, Deck, convertArchidektToDeck } from '../src/deck.js';

describe('convertArchidektToDeck', () => {
  test('converts basic deck without commander', () => {
    const archidektDeck: ArchidektDeck = {
      id: 123,
      name: "Test Deck",
      cards: [
        {
          card: { name: "Lightning Bolt" },
          quantity: 4,
          categories: ["Instant"]
        },
        {
          card: { name: "Mountain" },
          quantity: 20,
          categories: ["Land"]
        }
      ]
    };

    const result = convertArchidektToDeck(archidektDeck);

    assert.strictEqual(result.id, 123);
    assert.strictEqual(result.name, "Test Deck");
    assert.strictEqual(result.totalCards, 24);
    assert.strictEqual(result.commander, undefined);
  });

  test('converts deck with commander', () => {
    const archidektDeck: ArchidektDeck = {
      id: 456,
      name: "Commander Deck",
      cards: [
        {
          card: { name: "Urza, Lord High Artificer" },
          quantity: 1,
          categories: ["Commander"]
        },
        {
          card: { name: "Island" },
          quantity: 30,
          categories: ["Land"]
        },
        {
          card: { name: "Counterspell" },
          quantity: 1,
          categories: ["Instant"]
        }
      ]
    };

    const result = convertArchidektToDeck(archidektDeck);

    assert.strictEqual(result.id, 456);
    assert.strictEqual(result.name, "Commander Deck");
    assert.strictEqual(result.totalCards, 32);
    assert.strictEqual(result.commander, "Urza, Lord High Artificer");
  });

  test('handles empty deck', () => {
    const archidektDeck: ArchidektDeck = {
      id: 789,
      name: "Empty Deck",
      cards: []
    };

    const result = convertArchidektToDeck(archidektDeck);

    assert.strictEqual(result.id, 789);
    assert.strictEqual(result.name, "Empty Deck");
    assert.strictEqual(result.totalCards, 0);
    assert.strictEqual(result.commander, undefined);
  });
});