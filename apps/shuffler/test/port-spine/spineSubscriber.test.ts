import { describe, test, expect, afterEach } from "@jest/globals";
import * as fc from "fast-check";
import { randomUUID } from "node:crypto";
import { InMemoryPersistStateAdapter } from "../../src/port-persist-state/InMemoryPersistStateAdapter.js";
import { InMemoryCardRepositoryAdapter } from "../../src/port-card-repository/InMemoryCardRepositoryAdapter.js";
import { CardRepositoryPort } from "../../src/port-card-repository/types.js";
import { GameState } from "../../src/GameState.js";
import { deckWithOneCommander, createTestPersistedGameState } from "../generators.js";
import { GameStatus } from "../../src/domain-types.js";
import { ensureGameSpineSubscription, getGameSubscriptionRegistry } from "../../src/port-spine/gameSubscriptionRegistry.js";
import { createFakeSpineServer, cardReturnedEvent, waitUntil } from "./fakeSpineServer.js";

let nextGameId = 900000;

async function setUp(spineTableId: string) {
  const cardRepository: CardRepositoryPort = new InMemoryCardRepositoryAdapter();
  const persistStatePort = new InMemoryPersistStateAdapter(cardRepository);
  // At least 2 non-commander cards — the reconnect test needs a second library card to return.
  const deck = fc.sample(deckWithOneCommander.filter((d) => d.cards.length >= 2), { numRuns: 1 })[0];
  await cardRepository.saveCards([...deck.cards, ...deck.commanders]);

  const gameId = nextGameId++;
  await persistStatePort.save({ ...createTestPersistedGameState(gameId, deck, GameStatus.Active), spineTableId });

  return { persistStatePort, cardRepository, gameId };
}

async function loadGame(persistStatePort: InMemoryPersistStateAdapter, cardRepository: CardRepositoryPort, gameId: number): Promise<GameState> {
  const persisted = await persistStatePort.retrieve(gameId);
  return GameState.fromPersistedGameState(persisted!, cardRepository);
}

describe("the Shuffler's Spine SSE subscriber + registry", () => {
  let fakeServer: ReturnType<typeof createFakeSpineServer> | undefined;
  let openGameIds: number[] = [];

  afterEach(async () => {
    for (const gameId of openGameIds) {
      getGameSubscriptionRegistry().get(String(gameId))?.subscription.close();
    }
    openGameIds = [];
    await fakeServer?.close();
    fakeServer = undefined;
  });

  test(
    "a card.returned.v1 arrival moves the identified card into Revealed",
    async () => {
      fakeServer = createFakeSpineServer();
      const port = await fakeServer.listen();
      const tableId = `table-${randomUUID()}`;

      const { persistStatePort, cardRepository, gameId } = await setUp(tableId);
      const gameBefore = await loadGame(persistStatePort, cardRepository, gameId);
      const libraryCard = gameBefore.listLibrary()[0];

      ensureGameSpineSubscription(gameId, tableId, { persistStatePort, cardRepository }, `http://localhost:${port}`);
      openGameIds.push(gameId);
      await waitUntil(() => fakeServer!.connectionCount() === 1);

      fakeServer.publish(cardReturnedEvent(tableId, libraryCard.gameCardIndex, libraryCard.card.scryfallId));

      await waitUntil(async () => (await loadGame(persistStatePort, cardRepository, gameId)).listRevealed().length === 1);
      const gameAfter = await loadGame(persistStatePort, cardRepository, gameId);
      expect(gameAfter.listRevealed()[0].gameCardIndex).toBe(libraryCard.gameCardIndex);
    },
    10000
  );

  test(
    "dedups the same event id delivered twice: one move to Revealed",
    async () => {
      fakeServer = createFakeSpineServer();
      const port = await fakeServer.listen();
      const tableId = `table-${randomUUID()}`;

      const { persistStatePort, cardRepository, gameId } = await setUp(tableId);
      const gameBefore = await loadGame(persistStatePort, cardRepository, gameId);
      const libraryCard = gameBefore.listLibrary()[0];

      ensureGameSpineSubscription(gameId, tableId, { persistStatePort, cardRepository }, `http://localhost:${port}`);
      openGameIds.push(gameId);
      await waitUntil(() => fakeServer!.connectionCount() === 1);

      const event = cardReturnedEvent(tableId, libraryCard.gameCardIndex, libraryCard.card.scryfallId);
      fakeServer.publish(event);
      await waitUntil(async () => (await loadGame(persistStatePort, cardRepository, gameId)).listRevealed().length === 1);

      fakeServer.publish(event);
      await new Promise((r) => setTimeout(r, 150)); // give a would-be second move time to land

      const gameAfter = await loadGame(persistStatePort, cardRepository, gameId);
      expect(gameAfter.listRevealed()).toHaveLength(1);
    },
    10000
  );

  test(
    "reconnects after a dropped connection and keeps applying events, with no catch-up of what was missed",
    async () => {
      fakeServer = createFakeSpineServer();
      const port = await fakeServer.listen();
      const tableId = `table-${randomUUID()}`;

      const { persistStatePort, cardRepository, gameId } = await setUp(tableId);
      const gameBefore = await loadGame(persistStatePort, cardRepository, gameId);
      const [firstCard, secondCard] = gameBefore.listLibrary();

      ensureGameSpineSubscription(gameId, tableId, { persistStatePort, cardRepository }, `http://localhost:${port}`);
      openGameIds.push(gameId);
      await waitUntil(() => fakeServer!.connectionCount() === 1);

      fakeServer.publish(cardReturnedEvent(tableId, firstCard.gameCardIndex, firstCard.card.scryfallId));
      await waitUntil(async () => (await loadGame(persistStatePort, cardRepository, gameId)).listRevealed().length === 1);

      fakeServer.dropConnections();
      await waitUntil(() => fakeServer!.connectionCount() === 1); // reconnected on its own

      fakeServer.publish(cardReturnedEvent(tableId, secondCard.gameCardIndex, secondCard.card.scryfallId));
      await waitUntil(async () => (await loadGame(persistStatePort, cardRepository, gameId)).listRevealed().length === 2);

      const gameAfter = await loadGame(persistStatePort, cardRepository, gameId);
      const revealedIndexes = gameAfter.listRevealed().map((gc) => gc.gameCardIndex);
      expect(revealedIndexes).toContain(firstCard.gameCardIndex);
      expect(revealedIndexes).toContain(secondCard.gameCardIndex);
    },
    10000
  );

  test(
    "opens the game's Spine subscription idempotently: a second call with no new game.section hit opens no second connection",
    async () => {
      fakeServer = createFakeSpineServer();
      const port = await fakeServer.listen();
      const tableId = `table-${randomUUID()}`;

      const { persistStatePort, cardRepository, gameId } = await setUp(tableId);

      ensureGameSpineSubscription(gameId, tableId, { persistStatePort, cardRepository }, `http://localhost:${port}`);
      openGameIds.push(gameId);
      await waitUntil(() => fakeServer!.connectionsAcceptedCount() === 1);

      ensureGameSpineSubscription(gameId, tableId, { persistStatePort, cardRepository }, `http://localhost:${port}`);
      await new Promise((r) => setTimeout(r, 150)); // give a would-be second connection time to land

      expect(fakeServer.connectionsAcceptedCount()).toBe(1);
      expect(getGameSubscriptionRegistry().get(String(gameId))?.spineTableId).toBe(tableId);
    },
    10000
  );
});
