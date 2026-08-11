import { describe, test, expect } from "@jest/globals";
import * as fc from "fast-check";
import { GameState } from "../src/GameState.js";
import { minimalDeck, deckWithOneCommander } from "./generators.js";
import { InMemoryCardRepositoryAdapter } from "../src/port-card-repository/InMemoryCardRepositoryAdapter.js";
import { Deck } from "../src/types.js";


const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function repoWithCards(deck: Deck): Promise<InMemoryCardRepositoryAdapter> {
  const repo = new InMemoryCardRepositoryAdapter();
  await repo.saveCards([...deck.commanders, ...deck.cards]);
  return repo;
}

describe("cardInstanceId minting", () => {
  test("newGame mints a unique GUID cardInstanceId on every card", () => {
    fc.assert(
      fc.property(deckWithOneCommander, (deck) => {
        const game = GameState.newGame(1, 1, 1, deck);
        const ids = game.getCards().map((gc) => gc.cardInstanceId);
        for (const id of ids) {
          expect(id).toMatch(GUID_RE);
        }
        expect(new Set(ids).size).toBe(ids.length);
      })
    );
  });

  test("cardInstanceId survives persist + reload unchanged", async () => {
    const deck = fc.sample(minimalDeck, 1)[0];
    const game = GameState.newGame(2, 1, 1, deck);
    const originalIds = game.getCards().map((gc) => gc.cardInstanceId);

    const repo = await repoWithCards(deck);
    const reloaded = await GameState.fromPersistedGameState(game.toPersistedGameState(), repo);
    expect(reloaded.getCards().map((gc) => gc.cardInstanceId)).toEqual(originalIds);
  });

  test("fromPersistedGameState mints-on-load for old saves missing cardInstanceId, and the minted ids persist on next save", async () => {
    const deck = fc.sample(minimalDeck, 1)[0];
    const game = GameState.newGame(3, 1, 1, deck);

    // Simulate a save from before cardInstanceId existed
    const oldSave = game.toPersistedGameState();
    for (const pgc of oldSave.gameCards) {
      delete (pgc as any).cardInstanceId;
    }

    const repo = await repoWithCards(deck);
    const reloaded = await GameState.fromPersistedGameState(oldSave, repo);

    const mintedIds = reloaded.getCards().map((gc) => gc.cardInstanceId);
    for (const id of mintedIds) {
      expect(id).toMatch(GUID_RE);
    }
    expect(new Set(mintedIds).size).toBe(mintedIds.length);

    const resaved = reloaded.toPersistedGameState();
    expect(resaved.gameCards.map((pgc) => pgc.cardInstanceId)).toEqual(mintedIds);
  });
});
