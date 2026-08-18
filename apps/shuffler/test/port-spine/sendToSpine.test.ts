import { GameState, TableInfo, GameCard } from "../../src/GameState.js";
import { FakeSpineGateway } from "../../src/port-spine/FakeSpineGateway.js";
import { joinSpineBestEffort, sendCardPlayedToSpineBestEffort } from "../../src/port-spine/sendToSpine.js";
import { CardPlayedEvent } from "../../src/port-tabletop/types.js";
import { CardDefinition, Deck, PERSISTED_DECK_VERSION } from "../../src/types.js";
import { lightningBolt, nicolBolas, testProvenance } from "../generators.js";
import { colorsForPlaymat, DEFAULT_PLAYMAT_PATH } from "../../src/table-look.js";

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

function commanderCard(card = nicolBolas, cardInstanceId = "cmdr-instance-1"): GameCard {
  return {
    card,
    location: { type: "CommandZone", position: 0 },
    gameCardIndex: 0,
    isCommander: true,
    currentFace: "front",
    cardInstanceId,
  };
}

describe("joinSpineBestEffort", () => {
  it("joins the table with one call carrying identity plus full decoration, returning the tableId, seat number, and tableUrl", async () => {
    const fake = new FakeSpineGateway();

    const result = await joinSpineBestEffort(fake, { gameId: "game-1", tableName: "Friday Night", playerName: "Jess", deckName: "Test Deck" });

    expect(result.seatId).toBeDefined();
    expect(result.spineTableId).toBeDefined();
    expect(result.spineSeatNumber).toBe(1);
    expect(result.tableUrl).toBeDefined();
    expect(fake.joinRequests).toHaveLength(1);
    const request = fake.joinRequests[0];
    expect(request.gameId).toBe("game-1");
    expect(request.name).toBe("Friday Night");
    expect(request.playerName).toBe("Jess");
    expect(request.deckName).toBe("Test Deck");
    expect(request.gameUrl).toMatch(/\/game\/game-1$/);
    expect(request.playmatImageUrl).toMatch(/^https:\/\//);
    expect(request.cardBackImageUrl).toMatch(/^https:\/\//);
    expect(request.primaryColor).toBeDefined();
    expect(request.secondaryColor).toBeDefined();
  });

  it("a picked sleeve travels as sleeveColor, and the card back is omitted — sleeveColor wins", async () => {
    const fake = new FakeSpineGateway();

    await joinSpineBestEffort(fake, { gameId: "game-2", tableName: "Friday Night", playerName: "Jess", deckName: "Test Deck", sleeveColor: "#8b2f5c" });

    const request = fake.joinRequests[0];
    expect(request.sleeveColor).toBe("#8b2f5c");
    expect(request.cardBackImageUrl).toBeUndefined();
    expect(request.primaryColor).toBe("#8b2f5c");
  });

  it("a picked playmat travels as an absolute URL", async () => {
    const fake = new FakeSpineGateway();

    await joinSpineBestEffort(fake, {
      gameId: "game-3",
      tableName: "Friday Night",
      playerName: "Jess",
      deckName: "Test Deck",
      playmatImagePath: "/images/playmats/aeoe-6-seam-rip.png",
    });

    const request = fake.joinRequests[0];
    expect(request.playmatImageUrl).toMatch(/^https:\/\/.*\/images\/playmats\/aeoe-6-seam-rip\.png$/);
  });

  it("carries 0-2 commanders as {card:{scryfallId,instanceId}} plus scaffolding cardName/frontImageUrl/backImageUrl", async () => {
    const fake = new FakeSpineGateway();

    await joinSpineBestEffort(fake, {
      gameId: "game-4",
      tableName: "Friday Night",
      playerName: "Jess",
      deckName: "Test Deck",
      commanders: [commanderCard(lightningBolt, "i-1"), commanderCard(nicolBolas, "i-2")],
    });

    const { commanders } = fake.joinRequests[0];
    expect(commanders).toHaveLength(2);
    expect(commanders![0].card).toEqual({ scryfallId: lightningBolt.scryfallId, instanceId: "i-1" });
    expect(commanders![0].backImageUrl).toBeNull(); // not twoFaced
    expect(commanders![1].backImageUrl).toContain("/back/"); // nicolBolas is twoFaced
  });

  it("is idempotent by gameId — a retry (network blip) or a restart resending the same join returns the same seat, minting no new one", async () => {
    const fake = new FakeSpineGateway();

    const first = await joinSpineBestEffort(fake, { gameId: "same-game", tableName: "Friday Night", playerName: "Jess", deckName: "Test Deck" });
    const second = await joinSpineBestEffort(fake, { gameId: "same-game", tableName: "Friday Night", playerName: "Jess", deckName: "Test Deck" });

    expect(second).toEqual(first);
    expect(fake.joinRequests).toHaveLength(2); // both requests are sent — the Spine is what dedupes
  });

  it("a different gameId at the same table takes a fresh seat", async () => {
    const fake = new FakeSpineGateway();

    const first = await joinSpineBestEffort(fake, { gameId: "game-a", tableName: "Friday Night", playerName: "Jess", deckName: "Test Deck" });
    const second = await joinSpineBestEffort(fake, { gameId: "game-b", tableName: "Friday Night", playerName: "Robin", deckName: "Test Deck" });

    expect(first.spineTableId).toBe(second.spineTableId);
    expect(first.spineSeatNumber).not.toBe(second.spineSeatNumber);
  });

  it("is a no-op (empty result) when no Spine is configured", async () => {
    await expect(joinSpineBestEffort(undefined, { gameId: "game-5", tableName: "Friday Night", playerName: "Jess", deckName: "Test Deck" })).resolves.toEqual({});
  });

  it("swallows a gateway failure — best-effort, must not throw", async () => {
    const fake = new FakeSpineGateway();
    fake.failWith(new Error("connection refused"));

    await expect(joinSpineBestEffort(fake, { gameId: "game-6", tableName: "Friday Night", playerName: "Jess", deckName: "Test Deck" })).resolves.toEqual({});
  });
});

describe("game.recordSpineJoin", () => {
  it("adopts the Spine's assigned seatId, replacing the Shuffler's own guess", async () => {
    const spine = new FakeSpineGateway();
    const tableInfo: TableInfo = { tableName: "Friday Night", playerName: "Jess", seatId: "shuffler-guessed-this" };
    const game = GameState.newGame(201, 1, 1, testDeck, undefined, tableInfo);
    game.startGame();

    const spineJoin = await joinSpineBestEffort(spine, { gameId: "game-201", tableName: "Friday Night", playerName: "Jess", deckName: "Test Deck" });
    game.recordSpineJoin(spineJoin);

    expect(game.seatId).toBe(spineJoin.seatId);
    expect(game.seatId).not.toBe("shuffler-guessed-this");
  });

  it("keeps the placeholder seatId when the Spine join fails — best-effort must not erase it", async () => {
    const spine = new FakeSpineGateway();
    spine.failWith(new Error("connection refused"));
    const tableInfo: TableInfo = { tableName: "Friday Night", playerName: "Jess", seatId: "shuffler-guessed-this" };
    const game = GameState.newGame(202, 1, 1, testDeck, undefined, tableInfo);

    const spineJoin = await joinSpineBestEffort(spine, { gameId: "game-202", tableName: "Friday Night", playerName: "Jess", deckName: "Test Deck" });
    game.recordSpineJoin(spineJoin);

    expect(game.seatId).toBe("shuffler-guessed-this");
  });
});

describe("sendCardPlayedToSpineBestEffort", () => {
  async function joinedTableInfo(fake: FakeSpineGateway): Promise<TableInfo> {
    const { spineTableId, spineSeatNumber } = await joinSpineBestEffort(fake, {
      gameId: "joined-game",
      tableName: "Friday Night",
      playerName: "Jess",
      deckName: "Test Deck",
    });
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

describe("colorsForPlaymat used by joinSpineBestEffort", () => {
  it("no sleeve picked → primary/secondary still resolve from the playmat's curated pair", async () => {
    const fake = new FakeSpineGateway();

    await joinSpineBestEffort(fake, { gameId: "game-7", tableName: "Friday Night", playerName: "Jess", deckName: "Test Deck" });

    const request = fake.joinRequests[0];
    const expected = colorsForPlaymat(DEFAULT_PLAYMAT_PATH, undefined);
    expect(request.primaryColor).toBe(expected.primaryColor);
    expect(request.secondaryColor).toBe(expected.secondaryColor);
  });
});
