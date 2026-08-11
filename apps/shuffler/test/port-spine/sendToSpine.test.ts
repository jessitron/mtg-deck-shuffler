import { GameState, TableInfo } from "../../src/GameState.js";
import { FakeSpineGateway } from "../../src/port-spine/FakeSpineGateway.js";
import { joinSpineTableBestEffort, sendCardPlayedToSpineBestEffort } from "../../src/port-spine/sendToSpine.js";
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

function cardNamed(game: GameState, name: string) {
  return game.getCards().find((gc) => gc.card.name === name)!;
}

describe("joinSpineTableBestEffort", () => {
  it("joins the table, returning both the tableId and the assigned seat number", async () => {
    const fake = new FakeSpineGateway();

    const result = await joinSpineTableBestEffort(fake, "Friday Night", "Jess");

    expect(result.spineTableId).toBeDefined();
    expect(result.spineSeatNumber).toBe(1);
    expect(fake.takenSeats).toEqual([{ tableId: result.spineTableId, playerName: "Jess", seatNumber: 1 }]);
  });

  it("each join takes a fresh seat — not idempotent, unlike seat.joined", async () => {
    const fake = new FakeSpineGateway();

    const first = await joinSpineTableBestEffort(fake, "Friday Night", "Jess");
    const second = await joinSpineTableBestEffort(fake, "Friday Night", "Robin");

    expect(first.spineTableId).toBe(second.spineTableId);
    expect(first.spineSeatNumber).not.toBe(second.spineSeatNumber);
  });

  it("is a no-op (empty result) when no Spine is configured", async () => {
    await expect(joinSpineTableBestEffort(undefined, "Friday Night", "Jess")).resolves.toEqual({});
  });

  it("swallows a gateway failure — best-effort, must not throw", async () => {
    const fake = new FakeSpineGateway();
    fake.failWith(new Error("connection refused"));

    await expect(joinSpineTableBestEffort(fake, "Friday Night", "Jess")).resolves.toEqual({});
  });
});

describe("sendCardPlayedToSpineBestEffort", () => {
  async function joinedTableInfo(fake: FakeSpineGateway): Promise<TableInfo> {
    const { spineTableId, spineSeatNumber } = await joinSpineTableBestEffort(fake, "Friday Night", "Jess");
    return { tableName: "Friday Night", playerName: "Jess", seatId: "abc12345", spineTableId, spineSeatNumber };
  }

  it("sends card.played addressed to the Spine tableId, from the joined Spine seat", async () => {
    const fake = new FakeSpineGateway();
    const tableInfo = await joinedTableInfo(fake);
    const game = GameState.newGame(101, 1, 1, testDeck, undefined, tableInfo);
    const bolt = cardNamed(game, "Lightning Bolt");

    await sendCardPlayedToSpineBestEffort(fake, game, bolt, "stack");

    expect(fake.sentEvents).toHaveLength(1);
    const { tableId, event } = fake.sentEvents[0] as { tableId: string; event: CardPlayedEvent };
    expect(event.tableId).toBe(tableId);
    expect(tableId).toBe(tableInfo.spineTableId);
    expect(event.name).toBe("card.played");
    expect(event.initiator).toEqual({ seatId: String(tableInfo.spineSeatNumber), playerName: "Jess" });
    expect(event.payload.card).toEqual({ scryfallId: lightningBolt.scryfallId, instanceId: bolt.cardInstanceId });
    expect(event.payload.zoneHint).toBe("stack");
  });

  it("is a no-op when no Spine is configured", async () => {
    const tableInfo: TableInfo = { tableName: "Friday Night", playerName: "Jess", seatId: "abc12345" };
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

  it("is a no-op when the game never joined the Spine (join failed at start)", async () => {
    const tableInfo: TableInfo = { tableName: "Friday Night", playerName: "Jess", seatId: "abc12345" };
    const game = GameState.newGame(105, 1, 1, testDeck, undefined, tableInfo);
    const bolt = cardNamed(game, "Lightning Bolt");
    const fake = new FakeSpineGateway();

    await sendCardPlayedToSpineBestEffort(fake, game, bolt, "stack");

    expect(fake.sentEvents).toHaveLength(0);
  });

  it("swallows a gateway failure — best-effort, must not throw", async () => {
    const fake = new FakeSpineGateway();
    const tableInfo = await joinedTableInfo(fake);
    const game = GameState.newGame(106, 1, 1, testDeck, undefined, tableInfo);
    const bolt = cardNamed(game, "Lightning Bolt");
    fake.failWith(new Error("connection refused"));

    await expect(sendCardPlayedToSpineBestEffort(fake, game, bolt, "stack")).resolves.toBeUndefined();
    expect(fake.sentEvents).toHaveLength(0);
  });
});
