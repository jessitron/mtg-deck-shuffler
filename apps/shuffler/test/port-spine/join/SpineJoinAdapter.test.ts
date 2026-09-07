import { HttpSpineJoinAdapter } from "../../../src/port-spine/join/HttpSpineJoinAdapter.js";
import { SpineJoinGateway } from "../../../src/port-spine/join/HttpSpineJoinGateway.js";
import { SpineJoinRequest, SpineJoinResult } from "../../../src/port-spine/join/spineWire.js";
import { GameCard } from "../../../src/domain-types.js";
import { lightningBolt, nicolBolas } from "../../generators.js";

/** A Spine that only remembers. The adapter is what's under test; this stands in for the wire. */
class RecordingSpineJoinGateway implements SpineJoinGateway {
  public readonly joinRequests: SpineJoinRequest[] = [];

  async join(request: SpineJoinRequest): Promise<SpineJoinResult> {
    this.joinRequests.push(request);
    return { tableId: "table-9", seatId: "seat-abc", seatNumber: 2, tableUrl: "http://table.test/t/friday" };
  }
}

function commanderCard(card = lightningBolt, cardInstanceId = "instance-1"): GameCard {
  return { card, location: { type: "CommandZone", position: 0 }, gameCardIndex: 3, isCommander: true, currentFace: "front", cardInstanceId };
}

/** A commander that never got a `cardInstanceId` — nothing at the table could tell it from its twins. */
function unidentifiedCommander(): GameCard {
  const { cardInstanceId, ...rest } = commanderCard();
  return rest;
}

function adapterWithGateway(): { adapter: HttpSpineJoinAdapter; gateway: RecordingSpineJoinGateway } {
  const gateway = new RecordingSpineJoinGateway();
  return { adapter: new HttpSpineJoinAdapter(gateway), gateway };
}

describe("SpineJoinAdapter", () => {
  it("turns a JoinTableRequest into the Spine's /join body — tableName becomes name, decoration is flattened in", async () => {
    const { adapter, gateway } = adapterWithGateway();

    await adapter.join({
      gameId: "game-1",
      tableName: "Friday Night",
      playerName: "Jess",
      deckName: "Test Deck",
      gameUrl: "https://shuffler.test/game/game-1",
      playmatImageUrl: "https://shuffler.test/images/playmats/a.png",
      cardBackImageUrl: "https://shuffler.test/back.png",
      primaryColor: "#111111",
      secondaryColor: "#222222",
    });

    expect(gateway.joinRequests[0]).toEqual({
      gameId: "game-1",
      name: "Friday Night",
      playerName: "Jess",
      deckName: "Test Deck",
      gameUrl: "https://shuffler.test/game/game-1",
      playmatImageUrl: "https://shuffler.test/images/playmats/a.png",
      cardBackImageUrl: "https://shuffler.test/back.png",
      sleeveColor: undefined,
      primaryColor: "#111111",
      secondaryColor: "#222222",
      commanders: undefined,
    });
  });

  it("a sleeve wins over the card back — only one of the two crosses the wire", async () => {
    const { adapter, gateway } = adapterWithGateway();

    await adapter.join({
      gameId: "game-2",
      tableName: "Friday Night",
      playerName: "Jess",
      deckName: "Test Deck",
      gameUrl: "https://shuffler.test/game/game-2",
      cardBackImageUrl: "https://shuffler.test/back.png",
      sleeveColor: "#8b2f5c",
    });

    expect(gateway.joinRequests[0].sleeveColor).toBe("#8b2f5c");
    expect(gateway.joinRequests[0].cardBackImageUrl).toBeUndefined();
  });

  it("translates commander GameCards into seat decoration, with a back image only for a two-faced card", async () => {
    const { adapter, gateway } = adapterWithGateway();

    await adapter.join({
      gameId: "game-3",
      tableName: "Friday Night",
      playerName: "Jess",
      deckName: "Test Deck",
      gameUrl: "https://shuffler.test/game/game-3",
      commanders: [commanderCard(lightningBolt, "i-1"), commanderCard(nicolBolas, "i-2")],
    });

    const { commanders } = gateway.joinRequests[0];
    expect(commanders).toHaveLength(2);
    expect(commanders![0].card).toEqual({ scryfallId: lightningBolt.scryfallId, instanceId: "i-1" });
    expect(commanders![0].cardName).toBe(lightningBolt.name);
    expect(commanders![0].backImageUrl).toBeNull();
    expect(commanders![1].backImageUrl).toContain("/back/");
  });

  it("refuses a commander with no cardInstanceId rather than sending an unidentifiable card", async () => {
    const { adapter } = adapterWithGateway();

    await expect(
      adapter.join({
        gameId: "game-4",
        tableName: "Friday Night",
        playerName: "Jess",
        deckName: "Test Deck",
        gameUrl: "https://shuffler.test/game/game-4",
        commanders: [unidentifiedCommander()],
      })
    ).rejects.toThrow(/no cardInstanceId/);
  });

  it("answers in the Shuffler's own words — a seat at a table, not a response body", async () => {
    const { adapter } = adapterWithGateway();

    const result = await adapter.join({
      gameId: "game-5",
      tableName: "Friday Night",
      playerName: "Jess",
      deckName: "Test Deck",
      gameUrl: "https://shuffler.test/game/game-5",
    });

    expect(result).toEqual({ tableId: "table-9", seatId: "seat-abc", seatNumber: 2, tableUrl: "http://table.test/t/friday" });
  });
});
