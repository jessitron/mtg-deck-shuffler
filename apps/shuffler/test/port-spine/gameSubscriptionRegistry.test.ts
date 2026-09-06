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
import { createFakeSpineTable, cardReturnedEvent, waitUntil, FakeSpineTable } from "./FakeSpineTable.js";

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

/** A second game sharing the persistStatePort + cardRepository + Spine table, for cross-seat tests. */
async function setUpSecondGame(persistStatePort: InMemoryPersistStateAdapter, cardRepository: CardRepositoryPort, spineTableId: string) {
  const deck = fc.sample(deckWithOneCommander.filter((d) => d.cards.length >= 2), { numRuns: 1 })[0];
  await cardRepository.saveCards([...deck.cards, ...deck.commanders]);

  const gameId = nextGameId++;
  await persistStatePort.save({ ...createTestPersistedGameState(gameId, deck, GameStatus.Active), spineTableId });

  return { gameId };
}

async function loadGame(persistStatePort: InMemoryPersistStateAdapter, cardRepository: CardRepositoryPort, gameId: number): Promise<GameState> {
  const persisted = await persistStatePort.retrieve(gameId);
  return GameState.fromPersistedGameState(persisted!, cardRepository);
}

describe("the Shuffler's Spine SSE subscriber + registry", () => {
  let fakeTable: FakeSpineTable | undefined;
  let openGameIds: number[] = [];

  afterEach(() => {
    for (const gameId of openGameIds) {
      getGameSubscriptionRegistry().get(String(gameId))?.subscription.close();
    }
    openGameIds = [];
    fakeTable?.close();
    fakeTable = undefined;
  });

  test(
    "a card.returned.v1 arrival moves the identified card into Revealed",
    async () => {
      fakeTable = createFakeSpineTable();
      const tableId = `table-${randomUUID()}`;

      const { persistStatePort, cardRepository, gameId } = await setUp(tableId);
      const gameBefore = await loadGame(persistStatePort, cardRepository, gameId);
      const libraryCard = gameBefore.listLibrary()[0];

      ensureGameSpineSubscription(gameId, tableId, "seat-0000001", [], { persistStatePort, cardRepository }, fakeTable);
      openGameIds.push(gameId);
      await waitUntil(() => fakeTable!.connectionCount() === 1);

      fakeTable.publish(cardReturnedEvent(tableId, libraryCard.gameCardIndex, libraryCard.card.scryfallId));

      await waitUntil(async () => (await loadGame(persistStatePort, cardRepository, gameId)).listRevealed().length === 1);
      const gameAfter = await loadGame(persistStatePort, cardRepository, gameId);
      expect(gameAfter.listRevealed()[0].gameCardIndex).toBe(libraryCard.gameCardIndex);
    },
    10000
  );

  test(
    "dedups the same event id delivered twice: one move to Revealed",
    async () => {
      fakeTable = createFakeSpineTable();
      const tableId = `table-${randomUUID()}`;

      const { persistStatePort, cardRepository, gameId } = await setUp(tableId);
      const gameBefore = await loadGame(persistStatePort, cardRepository, gameId);
      const libraryCard = gameBefore.listLibrary()[0];

      ensureGameSpineSubscription(gameId, tableId, "seat-0000001", [], { persistStatePort, cardRepository }, fakeTable);
      openGameIds.push(gameId);
      await waitUntil(() => fakeTable!.connectionCount() === 1);

      const event = cardReturnedEvent(tableId, libraryCard.gameCardIndex, libraryCard.card.scryfallId);
      fakeTable.publish(event);
      await waitUntil(async () => (await loadGame(persistStatePort, cardRepository, gameId)).listRevealed().length === 1);

      fakeTable.publish(event);
      await new Promise((r) => setTimeout(r, 150)); // give a would-be second move time to land

      const gameAfter = await loadGame(persistStatePort, cardRepository, gameId);
      expect(gameAfter.listRevealed()).toHaveLength(1);
    },
    10000
  );

  test(
    "reconnects after a dropped connection and catches up on an event published while disconnected",
    async () => {
      fakeTable = createFakeSpineTable();
      const tableId = `table-${randomUUID()}`;

      const { persistStatePort, cardRepository, gameId } = await setUp(tableId);
      const gameBefore = await loadGame(persistStatePort, cardRepository, gameId);
      const [firstCard, secondCard] = gameBefore.listLibrary();

      ensureGameSpineSubscription(gameId, tableId, "seat-0000001", [], { persistStatePort, cardRepository }, fakeTable);
      openGameIds.push(gameId);
      await waitUntil(() => fakeTable!.connectionCount() === 1);
      expect(fakeTable.lastEventIdsSeen()).toEqual([undefined]); // first connection: nothing applied yet

      fakeTable.publish(cardReturnedEvent(tableId, firstCard.gameCardIndex, firstCard.card.scryfallId));
      await waitUntil(async () => (await loadGame(persistStatePort, cardRepository, gameId)).listRevealed().length === 1);

      fakeTable.dropConnections();
      // Published while the subscriber has no live connection — the Spine's stream has
      // this stored regardless, so it's available for the next connect to replay.
      fakeTable.publish(cardReturnedEvent(tableId, secondCard.gameCardIndex, secondCard.card.scryfallId));

      await waitUntil(() => fakeTable!.connectionCount() === 1); // reconnected on its own
      await waitUntil(async () => (await loadGame(persistStatePort, cardRepository, gameId)).listRevealed().length === 2);

      const gameAfter = await loadGame(persistStatePort, cardRepository, gameId);
      const revealedIndexes = gameAfter.listRevealed().map((gc) => gc.gameCardIndex);
      expect(revealedIndexes).toContain(firstCard.gameCardIndex);
      expect(revealedIndexes).toContain(secondCard.gameCardIndex);

      // The reconnect sent back the seq of the first (already-applied) event.
      const seqsSeen = fakeTable.lastEventIdsSeen();
      expect(seqsSeen).toHaveLength(2);
      expect(seqsSeen[1]).toBe(1);
    },
    10000
  );

  test(
    "a card.returned.v1 for another seat on the same table is ignored: only the matching game's Shuffler applies it",
    async () => {
      fakeTable = createFakeSpineTable();
      const tableId = `table-${randomUUID()}`;

      const { persistStatePort, cardRepository, gameId: ownGameId } = await setUp(tableId);
      const { gameId: otherGameId } = await setUpSecondGame(persistStatePort, cardRepository, tableId);
      const gameBefore = await loadGame(persistStatePort, cardRepository, ownGameId);
      const libraryCard = gameBefore.listLibrary()[0];

      ensureGameSpineSubscription(ownGameId, tableId, "seat-owner", [], { persistStatePort, cardRepository }, fakeTable);
      openGameIds.push(ownGameId);
      ensureGameSpineSubscription(otherGameId, tableId, "seat-other", [], { persistStatePort, cardRepository }, fakeTable);
      openGameIds.push(otherGameId);
      await waitUntil(() => fakeTable!.connectionCount() === 2);

      fakeTable.publish(
        cardReturnedEvent(tableId, libraryCard.gameCardIndex, libraryCard.card.scryfallId, {
          initiator: { seatId: "seat-owner", playerName: "Jess" },
          payload: { card: { scryfallId: libraryCard.card.scryfallId }, gameCardIndex: libraryCard.gameCardIndex, seat: "seat-owner", fromZone: "battlefield" },
        })
      );

      await waitUntil(async () => (await loadGame(persistStatePort, cardRepository, ownGameId)).listRevealed().length === 1);
      const otherGameAfter = await loadGame(persistStatePort, cardRepository, otherGameId);
      expect(otherGameAfter.listRevealed()).toHaveLength(0);
    },
    10000
  );

  test(
    "opens the game's Spine subscription idempotently: a second call with no new game.section hit opens no second connection",
    async () => {
      fakeTable = createFakeSpineTable();
      const tableId = `table-${randomUUID()}`;

      const { persistStatePort, cardRepository, gameId } = await setUp(tableId);

      ensureGameSpineSubscription(gameId, tableId, "seat-0000001", [], { persistStatePort, cardRepository }, fakeTable);
      openGameIds.push(gameId);
      await waitUntil(() => fakeTable!.connectionsAcceptedCount() === 1);

      ensureGameSpineSubscription(gameId, tableId, "seat-0000001", [], { persistStatePort, cardRepository }, fakeTable);
      await new Promise((r) => setTimeout(r, 150)); // give a would-be second connection time to land

      expect(fakeTable.connectionsAcceptedCount()).toBe(1);
      expect(getGameSubscriptionRegistry().get(String(gameId))?.spineTableId).toBe(tableId);
    },
    10000
  );

  test(
    "a game resumed after its Spine subscription was fully torn down still resumes from its last applied seq (ticket 05's durable seed)",
    async () => {
      fakeTable = createFakeSpineTable();
      const tableId = `table-${randomUUID()}`;

      const { persistStatePort, cardRepository, gameId } = await setUp(tableId);
      const gameBefore = await loadGame(persistStatePort, cardRepository, gameId);
      const [firstCard, secondCard] = gameBefore.listLibrary();

      ensureGameSpineSubscription(gameId, tableId, "seat-0000001", [], { persistStatePort, cardRepository }, fakeTable);
      openGameIds.push(gameId);
      await waitUntil(() => fakeTable!.connectionCount() === 1);

      fakeTable.publish(cardReturnedEvent(tableId, firstCard.gameCardIndex, firstCard.card.scryfallId));
      await waitUntil(async () => (await loadGame(persistStatePort, cardRepository, gameId)).listRevealed().length === 1);

      // Full teardown — every browser tab closed, registry entry gone — not a mid-stream drop.
      getGameSubscriptionRegistry().get(String(gameId))?.subscription.close();
      getGameSubscriptionRegistry().delete(String(gameId));
      openGameIds = openGameIds.filter((id) => id !== gameId);

      // Published while nobody is subscribed — the Spine keeps it regardless.
      fakeTable.publish(cardReturnedEvent(tableId, secondCard.gameCardIndex, secondCard.card.scryfallId));

      // A resumed game (server restart, or every tab closed then a new one opened) starts a
      // fresh subscription, seeded from the highest `spineSeq` recorded in the persisted
      // game's own event log — the durable seed from ticket 05.
      const persistedAfterFirst = await persistStatePort.retrieve(gameId);
      ensureGameSpineSubscription(gameId, tableId, "seat-0000001", persistedAfterFirst!.events, { persistStatePort, cardRepository }, fakeTable);
      openGameIds.push(gameId);
      await waitUntil(() => fakeTable!.connectionCount() === 1);

      expect(fakeTable.lastEventIdsSeen()[1]).toBe(1);

      await waitUntil(async () => (await loadGame(persistStatePort, cardRepository, gameId)).listRevealed().length === 2);
      const gameAfter = await loadGame(persistStatePort, cardRepository, gameId);
      const revealedIndexes = gameAfter.listRevealed().map((gc) => gc.gameCardIndex);
      expect(revealedIndexes).toContain(firstCard.gameCardIndex);
      expect(revealedIndexes).toContain(secondCard.gameCardIndex);
    },
    10000
  );
});
