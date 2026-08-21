import { describe, test, expect, afterEach } from "@jest/globals";
import * as fc from "fast-check";
import { randomUUID } from "node:crypto";
import { InMemoryPersistStateAdapter } from "../../src/port-persist-state/InMemoryPersistStateAdapter.js";
import { InMemoryCardRepositoryAdapter } from "../../src/port-card-repository/InMemoryCardRepositoryAdapter.js";
import { CardRepositoryPort } from "../../src/port-card-repository/types.js";
import { GameState } from "../../src/GameState.js";
import { deckWithOneCommander, createTestPersistedGameState } from "../generators.js";
import { GameStatus } from "../../src/domain-types.js";
import {
  ensureGameSpineSubscription,
  addBrowserStream,
  removeBrowserStream,
  browserStreamCountForGame,
  getGameSubscriptionRegistry,
  BrowserStream,
} from "../../src/port-spine/gameSubscriptionRegistry.js";
import { createFakeSpineServer, cardReturnedEvent, waitUntil } from "./fakeSpineServer.js";

let nextGameId = 950000;

async function setUp(spineTableId: string) {
  const cardRepository: CardRepositoryPort = new InMemoryCardRepositoryAdapter();
  const persistStatePort = new InMemoryPersistStateAdapter(cardRepository);
  const deck = fc.sample(deckWithOneCommander, { numRuns: 1 })[0];
  await cardRepository.saveCards([...deck.cards, ...deck.commanders]);

  const gameId = nextGameId++;
  await persistStatePort.save({ ...createTestPersistedGameState(gameId, deck, GameStatus.Active), spineTableId });

  return { persistStatePort, cardRepository, gameId };
}

async function loadGame(persistStatePort: InMemoryPersistStateAdapter, cardRepository: CardRepositoryPort, gameId: number): Promise<GameState> {
  const persisted = await persistStatePort.retrieve(gameId);
  return GameState.fromPersistedGameState(persisted!, cardRepository);
}

function fakeBrowserStream(): BrowserStream & { received: string[] } {
  const received: string[] = [];
  return {
    received,
    write(chunk: string) {
      received.push(chunk);
    },
  };
}

describe("browser SSE tab tracking + Spine subscription teardown (ticket 04)", () => {
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

  test("a card.returned.v1 arrival, once applied, pushes game-state-updated to every open browser tab for that game", async () => {
    fakeServer = createFakeSpineServer();
    const port = await fakeServer.listen();
    const tableId = `table-${randomUUID()}`;
    const { persistStatePort, cardRepository, gameId } = await setUp(tableId);

    ensureGameSpineSubscription(gameId, tableId, "seat-0000001", { persistStatePort, cardRepository }, `http://localhost:${port}`);
    openGameIds.push(gameId);
    await waitUntil(() => fakeServer!.connectionCount() === 1);

    const tabOne = fakeBrowserStream();
    const tabTwo = fakeBrowserStream();
    addBrowserStream(gameId, tabOne);
    addBrowserStream(gameId, tabTwo);
    expect(browserStreamCountForGame(gameId)).toBe(2);

    const game = await loadGame(persistStatePort, cardRepository, gameId);
    const libraryCard = game.listLibrary()[0];
    fakeServer.publish(cardReturnedEvent(tableId, libraryCard.gameCardIndex, libraryCard.card.scryfallId));

    await waitUntil(() => tabOne.received.length === 1 && tabTwo.received.length === 1);
    expect(tabOne.received[0]).toContain("game-state-updated");
    expect(tabTwo.received[0]).toContain("game-state-updated");
  }, 10000);

  test("closing the last open browser tab for a game tears down its Spine subscription", async () => {
    fakeServer = createFakeSpineServer();
    const port = await fakeServer.listen();
    const tableId = `table-${randomUUID()}`;
    const { persistStatePort, cardRepository, gameId } = await setUp(tableId);

    ensureGameSpineSubscription(gameId, tableId, "seat-0000001", { persistStatePort, cardRepository }, `http://localhost:${port}`);
    openGameIds.push(gameId);
    await waitUntil(() => fakeServer!.connectionCount() === 1);

    const tabOne = fakeBrowserStream();
    const tabTwo = fakeBrowserStream();
    addBrowserStream(gameId, tabOne);
    addBrowserStream(gameId, tabTwo);

    removeBrowserStream(gameId, tabOne);
    expect(getGameSubscriptionRegistry().has(String(gameId))).toBe(true); // one tab still open

    removeBrowserStream(gameId, tabTwo);
    await waitUntil(() => fakeServer!.connectionCount() === 0);
    expect(getGameSubscriptionRegistry().has(String(gameId))).toBe(false);
    expect(browserStreamCountForGame(gameId)).toBe(0);
  }, 10000);

  test("a subsequent GET /game-section/:gameId hit (ensureGameSpineSubscription) after teardown re-opens the Spine subscription", async () => {
    fakeServer = createFakeSpineServer();
    const port = await fakeServer.listen();
    const tableId = `table-${randomUUID()}`;
    const { persistStatePort, cardRepository, gameId } = await setUp(tableId);

    ensureGameSpineSubscription(gameId, tableId, "seat-0000001", { persistStatePort, cardRepository }, `http://localhost:${port}`);
    openGameIds.push(gameId);
    await waitUntil(() => fakeServer!.connectionsAcceptedCount() === 1);

    const tab = fakeBrowserStream();
    addBrowserStream(gameId, tab);
    removeBrowserStream(gameId, tab);
    await waitUntil(() => fakeServer!.connectionCount() === 0);

    ensureGameSpineSubscription(gameId, tableId, "seat-0000001", { persistStatePort, cardRepository }, `http://localhost:${port}`);
    await waitUntil(() => fakeServer!.connectionsAcceptedCount() === 2);
    expect(getGameSubscriptionRegistry().has(String(gameId))).toBe(true);
  }, 10000);
});
