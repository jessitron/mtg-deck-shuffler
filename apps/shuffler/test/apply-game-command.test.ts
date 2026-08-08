import { describe, test, expect } from "@jest/globals";
import * as fc from "fast-check";
import { applyGameCommand, TableSendFailedError } from "../src/apply-game-command.js";
import { InMemoryPersistStateAdapter } from "../src/port-persist-state/InMemoryPersistStateAdapter.js";
import { InMemoryCardRepositoryAdapter } from "../src/port-card-repository/InMemoryCardRepositoryAdapter.js";
import { GameStatus } from "../src/domain-types.js";
import { CardRepositoryPort } from "../src/port-card-repository/types.js";
import { GameState } from "../src/GameState.js";
import { deckWithOneCommander, createTestPersistedGameState } from "./generators.js";

async function setUp(status: GameStatus = GameStatus.Active) {
  const cardRepository: CardRepositoryPort = new InMemoryCardRepositoryAdapter();
  const persistStatePort = new InMemoryPersistStateAdapter(cardRepository);
  const deck = fc.sample(deckWithOneCommander, { numRuns: 1 })[0];
  await cardRepository.saveCards([...deck.cards, ...deck.commanders]);

  const gameId = 1;
  await persistStatePort.save(createTestPersistedGameState(gameId, deck, status));

  return { persistStatePort, cardRepository, gameId };
}

describe("applyGameCommand", () => {
  test("returns not-found for an unknown gameId", async () => {
    const { persistStatePort, cardRepository } = await setUp();

    const outcome = await applyGameCommand({ persistStatePort, cardRepository }, 999999, undefined, () => {});

    expect(outcome.kind).toBe("not-found");
  });

  test("applies the mutation and persists it", async () => {
    const { persistStatePort, cardRepository, gameId } = await setUp();

    const outcome = await applyGameCommand({ persistStatePort, cardRepository }, gameId, undefined, (game) => {
      const card = game.listLibrary()[0];
      game.moveByGameCardIndex(card.gameCardIndex, "Revealed");
    });

    expect(outcome.kind).toBe("applied");
    if (outcome.kind === "applied") {
      expect(outcome.game.listRevealed().length).toBe(1);
    }

    const reloaded = await persistStatePort.retrieve(gameId);
    const reloadedGame = await GameState.fromPersistedGameState(reloaded!, cardRepository);
    expect(reloadedGame.listRevealed().length).toBe(1);
  });

  test("passes through whatHappened returned by mutate", async () => {
    const { persistStatePort, cardRepository, gameId } = await setUp();

    const outcome = await applyGameCommand({ persistStatePort, cardRepository }, gameId, undefined, (game) => {
      return game.shuffle();
    });

    expect(outcome.kind).toBe("applied");
    if (outcome.kind === "applied") {
      expect(outcome.whatHappened?.shuffling).toBe(true);
    }
  });

  test("whatHappened is undefined when mutate doesn't return one", async () => {
    const { persistStatePort, cardRepository, gameId } = await setUp();

    const outcome = await applyGameCommand({ persistStatePort, cardRepository }, gameId, undefined, (game) => {
      const card = game.listLibrary()[0];
      game.moveByGameCardIndex(card.gameCardIndex, "Hand");
    });

    expect(outcome.kind).toBe("applied");
    if (outcome.kind === "applied") {
      expect(outcome.whatHappened).toBeUndefined();
    }
  });

  test("returns not-active for a game that has ended", async () => {
    const { persistStatePort, cardRepository, gameId } = await setUp(GameStatus.Ended);

    const outcome = await applyGameCommand({ persistStatePort, cardRepository }, gameId, undefined, () => {});

    expect(outcome.kind).toBe("not-active");
  });

  test("returns version-conflict when expectedVersion is stale, without applying the mutation", async () => {
    const { persistStatePort, cardRepository, gameId } = await setUp();

    // advance the game's version by one prior command
    await applyGameCommand({ persistStatePort, cardRepository }, gameId, undefined, (game) => {
      const card = game.listLibrary()[0];
      game.moveByGameCardIndex(card.gameCardIndex, "Revealed");
    });

    let mutateCalled = false;
    const outcome = await applyGameCommand({ persistStatePort, cardRepository }, gameId, 0, () => {
      mutateCalled = true;
    });

    expect(outcome.kind).toBe("version-conflict");
    expect(mutateCalled).toBe(false);
  });

  test("propagates an error thrown by mutate, without persisting", async () => {
    const { persistStatePort, cardRepository, gameId } = await setUp();

    await expect(
      applyGameCommand({ persistStatePort, cardRepository }, gameId, undefined, () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");

    const reloaded = await persistStatePort.retrieve(gameId);
    expect(reloaded?.events.length).toBe(0);
  });

  test("beforeMutate runs before mutate, with the live game", async () => {
    const { persistStatePort, cardRepository, gameId } = await setUp();
    const calls: string[] = [];

    await applyGameCommand(
      { persistStatePort, cardRepository },
      gameId,
      undefined,
      () => {
        calls.push("mutate");
      },
      async (game) => {
        expect(game.gameStatus()).toBe("Active");
        calls.push("beforeMutate");
      }
    );

    expect(calls).toEqual(["beforeMutate", "mutate"]);
  });

  test("returns send-failed and does not mutate or persist when beforeMutate throws TableSendFailedError", async () => {
    const { persistStatePort, cardRepository, gameId } = await setUp();
    let mutateCalled = false;

    const outcome = await applyGameCommand(
      { persistStatePort, cardRepository },
      gameId,
      undefined,
      () => {
        mutateCalled = true;
      },
      async () => {
        throw new TableSendFailedError("<div>the table said no</div>");
      }
    );

    expect(outcome.kind).toBe("send-failed");
    if (outcome.kind === "send-failed") {
      expect(outcome.errorHtml).toBe("<div>the table said no</div>");
    }
    expect(mutateCalled).toBe(false);

    const reloaded = await persistStatePort.retrieve(gameId);
    expect(reloaded?.events.length).toBe(0);
  });

  test("propagates a non-TableSendFailedError thrown by beforeMutate, without persisting", async () => {
    const { persistStatePort, cardRepository, gameId } = await setUp();

    await expect(
      applyGameCommand(
        { persistStatePort, cardRepository },
        gameId,
        undefined,
        () => {},
        async () => {
          throw new Error("network exploded");
        }
      )
    ).rejects.toThrow("network exploded");

    const reloaded = await persistStatePort.retrieve(gameId);
    expect(reloaded?.events.length).toBe(0);
  });
});
