import { describe, test, expect, afterEach } from "@jest/globals";
import * as fc from "fast-check";
import { randomUUID } from "node:crypto";
import http from "node:http";
import { InMemoryPersistStateAdapter } from "../../src/port-persist-state/InMemoryPersistStateAdapter.js";
import { InMemoryCardRepositoryAdapter } from "../../src/port-card-repository/InMemoryCardRepositoryAdapter.js";
import { CardRepositoryPort } from "../../src/port-card-repository/types.js";
import { GameState } from "../../src/GameState.js";
import { deckWithOneCommander, createTestPersistedGameState } from "../generators.js";
import { GameStatus } from "../../src/domain-types.js";
import { ensureGameSpineSubscription, getGameSubscriptionRegistry } from "../../src/port-spine/gameSubscriptionRegistry.js";

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

function fakeTraceparent(): string {
  return `00-${randomUUID().replace(/-/g, "")}-${randomUUID().replace(/-/g, "").slice(0, 16)}-01`;
}

function cardReturnedEvent(tableId: string, gameCardIndex: number, scryfallId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    tableId,
    name: "card.returned",
    occurredAt: new Date().toISOString(),
    initiator: { seatId: "seat-0000001", playerName: "Jess" },
    occurredIn: "tabletop",
    origin: "tabletop.cardShapeHook",
    significance: "domain",
    traceparent: fakeTraceparent(),
    schemaVersion: 1,
    payload: {
      card: { scryfallId },
      gameCardIndex,
      seat: "seat-0000001",
      fromZone: "battlefield",
    },
    ...overrides,
  };
}

async function waitUntil(predicate: () => boolean | Promise<boolean>, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error("timed out waiting for condition");
}

/**
 * A minimal fake SSE server standing in for the Spine's `GET /tables/:tableId/events/stream`,
 * mirroring `apps/tabletop/test/spineSubscriber.test.ts`'s fake server (including the Spine's
 * heartbeat behavior, `services/spine/lib/sse_stream.rb`).
 */
function createFakeSpineServer() {
  let clients: http.ServerResponse[] = [];
  let connectionsAccepted = 0;
  const server = http.createServer((req, res) => {
    connectionsAccepted++;
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
    res.write(": heartbeat\n\n");
    clients.push(res);
    req.on("close", () => {
      clients = clients.filter((c) => c !== res);
    });
  });

  return {
    publish(event: unknown): void {
      const frame = `data: ${JSON.stringify({ event })}\n\n`;
      for (const res of clients) res.write(frame);
    },
    connectionCount(): number {
      return clients.length;
    },
    connectionsAcceptedCount(): number {
      return connectionsAccepted;
    },
    dropConnections(): void {
      for (const res of clients.splice(0)) res.destroy();
    },
    listen(): Promise<number> {
      return new Promise((resolve) => {
        server.listen(0, () => {
          const address = server.address();
          resolve(typeof address === "object" && address ? address.port : 0);
        });
      });
    },
    close(): Promise<void> {
      for (const res of clients.splice(0)) res.destroy();
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
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
