import { describe, test, expect } from "@jest/globals";
import * as fc from "fast-check";
import { GameState } from "../src/GameState.js";
import { minimalDeck } from "./generators.js";
import { InMemoryCardRepositoryAdapter } from "../src/port-card-repository/InMemoryCardRepositoryAdapter.js";
import { InMemoryPersistPrepAdapter } from "../src/port-persist-prep/InMemoryPersistPrepAdapter.js";
import { PERSISTED_GAME_PREP_VERSION } from "../src/port-persist-prep/types.js";

/**
 * Table info (JES-127, B1): a game optionally belongs to a table on the
 * Tabletop — tableName, playerName, and the seat's short GUID seatId. All
 * optional fields, no version bumps: solo games (no table) are the default and
 * old saves load unchanged. The Prep records the same info so a player can
 * rejoin the table on restart.
 */

describe("table info on GameState", () => {
  const tableInfo = { tableName: "Friday Night", playerName: "Jess", seatId: "abc12345" };

  test("newGame with tableInfo carries it into the persisted state and back", async () => {
    const deck = fc.sample(minimalDeck, 1)[0];
    const game = GameState.newGame(1, 1, 1, deck, undefined, tableInfo);

    const persisted = game.toPersistedGameState();
    expect(persisted.tableName).toBe("Friday Night");
    expect(persisted.playerName).toBe("Jess");
    expect(persisted.seatId).toBe("abc12345");

    const repo = new InMemoryCardRepositoryAdapter();
    await repo.saveCards([...deck.commanders, ...deck.cards]);
    const reloaded = await GameState.fromPersistedGameState(persisted, repo);
    expect(reloaded.tableName).toBe("Friday Night");
    expect(reloaded.playerName).toBe("Jess");
    expect(reloaded.seatId).toBe("abc12345");
  });

  test("newGame without tableInfo is a solo game: no table fields persisted", () => {
    const deck = fc.sample(minimalDeck, 1)[0];
    const game = GameState.newGame(1, 1, 1, deck);
    const persisted = game.toPersistedGameState();
    expect(persisted.tableName).toBeUndefined();
    expect(persisted.playerName).toBeUndefined();
    expect(persisted.seatId).toBeUndefined();
    expect(game.tableName).toBeUndefined();
  });
});

describe("table info on PersistedGamePrep", () => {
  test("prep round-trips optional tableName/playerName/seatId", async () => {
    const deck = fc.sample(minimalDeck, 1)[0];
    const repo = new InMemoryCardRepositoryAdapter();
    await repo.saveCards([...deck.commanders, ...deck.cards]);
    const prepPort = new InMemoryPersistPrepAdapter(repo);

    const prepId = prepPort.newPrepId();
    await prepPort.savePrep({
      version: PERSISTED_GAME_PREP_VERSION,
      prepId,
      deck,
      createdAt: new Date(),
      updatedAt: new Date(),
      tableName: "Friday Night",
      playerName: "Jess",
      seatId: "abc12345",
    });

    const reloaded = await prepPort.retrievePrep(prepId);
    expect(reloaded?.tableName).toBe("Friday Night");
    expect(reloaded?.playerName).toBe("Jess");
    expect(reloaded?.seatId).toBe("abc12345");
  });

  test("a prep without table info still loads (old preps stay valid)", async () => {
    const deck = fc.sample(minimalDeck, 1)[0];
    const repo = new InMemoryCardRepositoryAdapter();
    await repo.saveCards([...deck.commanders, ...deck.cards]);
    const prepPort = new InMemoryPersistPrepAdapter(repo);

    const prepId = prepPort.newPrepId();
    await prepPort.savePrep({
      version: PERSISTED_GAME_PREP_VERSION,
      prepId,
      deck,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const reloaded = await prepPort.retrievePrep(prepId);
    expect(reloaded).not.toBeNull();
    expect(reloaded?.tableName).toBeUndefined();
  });
});
