import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GameStateAdapter } from '../src/gameState.js';
import { InMemoryGameStateAdapter } from '../src/gameStateInMemory.js';
import { SQLiteGameStateAdapter } from '../src/gameStateSqlite.js';

async function testGameStateLifecycle(adapter: GameStateAdapter, adapterName: string) {
  const gameId = `test-game-${Date.now()}`;
  const deckId = 'test-deck-123';

  describe(`${adapterName} - Game State Lifecycle`, () => {
    it('should start a new game', async () => {
      const gameState = await adapter.startGame(gameId, deckId);
      
      assert.strictEqual(gameState.id, gameId);
      assert.strictEqual(gameState.status, 'active');
      assert.strictEqual(gameState.deckId, deckId);
      assert.ok(gameState.startDate instanceof Date);
      assert.ok(gameState.lastUpdated instanceof Date);
    });

    it('should retrieve the started game', async () => {
      const retrieved = await adapter.retrieveGame(gameId);
      
      assert.ok(retrieved);
      assert.strictEqual(retrieved.id, gameId);
      assert.strictEqual(retrieved.status, 'active');
      assert.strictEqual(retrieved.deckId, deckId);
    });

    it('should update the game state', async () => {
      const libraryCards = [
        { name: 'Lightning Bolt', count: 4 },
        { name: 'Counterspell', count: 2 }
      ];

      const updated = await adapter.updateGame(gameId, { 
        libraryCards,
        status: 'active'
      });

      assert.strictEqual(updated.id, gameId);
      assert.deepStrictEqual(updated.libraryCards, libraryCards);
      assert.ok(updated.lastUpdated > updated.startDate);
    });

    it('should retrieve the updated game', async () => {
      const retrieved = await adapter.retrieveGame(gameId);
      
      assert.ok(retrieved);
      assert.strictEqual(retrieved.libraryCards?.length, 2);
      assert.strictEqual(retrieved.libraryCards?.[0].name, 'Lightning Bolt');
      assert.strictEqual(retrieved.libraryCards?.[0].count, 4);
    });

    it('should delete the game', async () => {
      await adapter.endGame(gameId);
    });

    it('should fail to retrieve deleted game', async () => {
      const retrieved = await adapter.retrieveGame(gameId);
      assert.strictEqual(retrieved, null);
    });

    it('should throw error when starting game with existing id', async () => {
      const newGameId = `duplicate-test-${Date.now()}`;
      await adapter.startGame(newGameId, deckId);
      
      try {
        await adapter.startGame(newGameId, deckId);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('already exists'));
      }
      
      await adapter.endGame(newGameId);
    });

    it('should throw error when updating non-existent game', async () => {
      try {
        await adapter.updateGame('non-existent-game', { status: 'active' });
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('not found'));
      }
    });

    it('should throw error when ending non-existent game', async () => {
      try {
        await adapter.endGame('non-existent-game');
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('not found'));
      }
    });
  });
}

describe('GameState Adapters', () => {
  describe('InMemory Implementation', () => {
    const adapter = new InMemoryGameStateAdapter();
    testGameStateLifecycle(adapter, 'InMemory');
  });

  describe('SQLite Implementation', () => {
    const adapter = new SQLiteGameStateAdapter(':memory:');
    testGameStateLifecycle(adapter, 'SQLite');
    
    // Clean up after tests
    setTimeout(() => {
      adapter.close();
    }, 100);
  });
});