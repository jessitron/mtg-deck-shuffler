import { describe, test, expect } from "@jest/globals";
import * as fc from "fast-check";
import { GameState } from "../src/GameState.js";
import { minimalDeck } from "./generators.js";
import { InMemoryCardRepositoryAdapter } from "../src/port-card-repository/InMemoryCardRepositoryAdapter.js";

/**
 * Table look (sleeve/playmat carry-through): the /prepare picker's choice is
 * snapshotted onto the game at newGame time, same as tableInfo — optional
 * fields, no version bump, solo/old games unaffected.
 */

describe("table look on GameState", () => {
  test("newGame with a sleeve/playmat carries it into the persisted state and back", async () => {
    const deck = fc.sample(minimalDeck, 1)[0];
    const game = GameState.newGame(1, 1, 1, deck, undefined, undefined, "#bd0a0a", "/images/aeoe-43-cascading-cataracts.png");

    const persisted = game.toPersistedGameState();
    expect(persisted.sleeveColor).toBe("#bd0a0a");
    expect(persisted.playmatImagePath).toBe("/images/aeoe-43-cascading-cataracts.png");

    const repo = new InMemoryCardRepositoryAdapter();
    await repo.saveCards([...deck.commanders, ...deck.cards]);
    const reloaded = await GameState.fromPersistedGameState(persisted, repo);
    expect(reloaded.sleeveColor).toBe("#bd0a0a");
    expect(reloaded.playmatImagePath).toBe("/images/aeoe-43-cascading-cataracts.png");
  });

  test("newGame without a sleeve/playmat pick persists neither (unsleeved, default mat)", () => {
    const deck = fc.sample(minimalDeck, 1)[0];
    const game = GameState.newGame(1, 1, 1, deck);
    const persisted = game.toPersistedGameState();
    expect(persisted.sleeveColor).toBeUndefined();
    expect(persisted.playmatImagePath).toBeUndefined();
    expect(game.sleeveColor).toBeUndefined();
    expect(game.playmatImagePath).toBeUndefined();
  });
});
