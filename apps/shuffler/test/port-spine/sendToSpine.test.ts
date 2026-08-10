import { GameState, TableInfo } from "../../src/GameState.js";
import { FakeSpineGateway } from "../../src/port-spine/FakeSpineGateway.js";
import { sendCardPlayedToSpineBestEffort } from "../../src/port-spine/sendToSpine.js";
import { zoneHintForPlay } from "../../src/port-tabletop/sendToTable.js";
import { CardPlayedEvent } from "../../src/port-tabletop/types.js";
import { CardDefinition, Deck, PERSISTED_DECK_VERSION } from "../../src/types.js";
import { lightningBolt, testProvenance } from "../generators.js";

const forest: CardDefinition = {
  name: "Forest",
  scryfallId: "def456",
  multiverseid: 54321,
  twoFaced: false,
  oracleCardName: "Forest",
  colorIdentity: ["G"],
  set: "LEA",
  cardTypes: ["Land"],
};

const testDeck: Deck = {
  version: PERSISTED_DECK_VERSION,
  id: 77,
  name: "Test Deck",
  totalCards: 2,
  commanders: [],
  cards: [lightningBolt, forest],
  provenance: testProvenance,
};

const tableInfo: TableInfo = { tableName: "Friday Night", playerName: "Jess", seatId: "abc12345" };

function cardNamed(game: GameState, name: string) {
  return game.getCards().find((gc) => gc.card.name === name)!;
}

describe("sendCardPlayedToSpineBestEffort", () => {
  it("ensures the Spine table by name, then sends card.played addressed to its tableId", async () => {
    const game = GameState.newGame(101, 1, 1, testDeck, undefined, tableInfo);
    const bolt = cardNamed(game, "Lightning Bolt");
    const fake = new FakeSpineGateway();

    await sendCardPlayedToSpineBestEffort(fake, game, bolt, zoneHintForPlay(bolt));

    expect(fake.sentEvents).toHaveLength(1);
    const { tableId, event } = fake.sentEvents[0] as { tableId: string; event: CardPlayedEvent };
    expect(event.tableId).toBe(tableId);
    expect(event.name).toBe("card.played");
    expect(event.initiator).toEqual({ seatId: "abc12345", playerName: "Jess" });
    expect(event.payload.card).toEqual({ scryfallId: lightningBolt.scryfallId, instanceId: bolt.cardInstanceId });
    expect(event.payload.zoneHint).toBe("stack");
  });

  it("reuses the same Spine tableId across sends for the same table name", async () => {
    const game = GameState.newGame(102, 1, 1, testDeck, undefined, tableInfo);
    const bolt = cardNamed(game, "Lightning Bolt");
    const fake = new FakeSpineGateway();

    await sendCardPlayedToSpineBestEffort(fake, game, bolt, "stack");
    await sendCardPlayedToSpineBestEffort(fake, game, bolt, "stack");

    expect(fake.sentEvents[0].tableId).toBe(fake.sentEvents[1].tableId);
  });

  it("is a no-op when no Spine is configured", async () => {
    const game = GameState.newGame(103, 1, 1, testDeck, undefined, tableInfo);
    const bolt = cardNamed(game, "Lightning Bolt");

    await expect(sendCardPlayedToSpineBestEffort(undefined, game, bolt, "stack")).resolves.toBeUndefined();
  });

  it("is a no-op for a solo game (no table)", async () => {
    const soloGame = GameState.newGame(104, 1, 1, testDeck);
    const bolt = cardNamed(soloGame, "Lightning Bolt");
    const fake = new FakeSpineGateway();

    await sendCardPlayedToSpineBestEffort(fake, soloGame, bolt, "stack");

    expect(fake.sentEvents).toHaveLength(0);
  });

  it("swallows a gateway failure — best-effort, must not throw", async () => {
    const game = GameState.newGame(105, 1, 1, testDeck, undefined, tableInfo);
    const bolt = cardNamed(game, "Lightning Bolt");
    const fake = new FakeSpineGateway();
    fake.failWith(new Error("connection refused"));

    await expect(sendCardPlayedToSpineBestEffort(fake, game, bolt, "stack")).resolves.toBeUndefined();
    expect(fake.sentEvents).toHaveLength(0);
  });
});
