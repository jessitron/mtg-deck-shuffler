import { createServer, IncomingMessage, Server, ServerResponse } from "node:http";
import { AddressInfo } from "node:net";
import { buildCardPlayedEvent, buildSeatJoinedEvent, CardPlayedEvent } from "../../src/port-tabletop/types.js";
import { FakeTabletopGateway } from "../../src/port-tabletop/FakeTabletopGateway.js";
import { HttpTabletopGateway } from "../../src/port-tabletop/HttpTabletopGateway.js";
import { GameCard } from "../../src/GameState.js";
import { lightningBolt, nicolBolas } from "../generators.js";

function handCard(): GameCard {
  return {
    card: lightningBolt,
    location: { type: "Hand", position: 3 },
    gameCardIndex: 42,
    isCommander: false,
    currentFace: "front",
    cardInstanceId: "11111111-2222-3333-4444-555555555555",
  };
}

const initiator = { seatId: "abc12345", playerName: "Jess" };

function containsValue(obj: unknown, value: unknown): boolean {
  if (obj === value) return true;
  if (Array.isArray(obj)) return obj.some((item) => containsValue(item, value));
  if (obj && typeof obj === "object") return Object.values(obj).some((v) => containsValue(v, value));
  return false;
}

function anEvent(): CardPlayedEvent {
  const gameCard = handCard();
  return buildCardPlayedEvent(gameCard, gameCard.cardInstanceId!, initiator, "stack", "Friday Night");
}

describe("FakeTabletopGateway", () => {
  it("records the calls it receives", async () => {
    const fake = new FakeTabletopGateway();
    const event = anEvent();
    await fake.sendCardToTable("Friday Night", event);

    expect(fake.sentEvents).toHaveLength(1);
    expect(fake.sentEvents[0].tableName).toBe("Friday Night");
    expect(fake.sentEvents[0].event).toEqual(event);
  });

  it("can be told to fail, and rejects", async () => {
    const fake = new FakeTabletopGateway();
    fake.failWith(new Error("the table is on fire"));

    await expect(fake.sendCardToTable("Friday Night", anEvent())).rejects.toThrow("the table is on fire");
    expect(fake.sentEvents).toHaveLength(0);
  });

  it("NEVER receives a gameCardIndex (F0, JES-128): an index is a decodable secret", async () => {
    const fake = new FakeTabletopGateway();
    await fake.sendCardToTable("Friday Night", anEvent());

    const serialized = JSON.stringify(fake.sentEvents);
    expect(serialized).not.toContain("gameCardIndex");
    expect(serialized).not.toContain("Index");
    // Check the actual index value (42), not a substring match on the serialized JSON:
    // the event also carries a random UUID and timestamp, either of which occasionally
    // contains "42" by coincidence and would fail this test for the wrong reason.
    expect(containsValue(fake.sentEvents, 42)).toBe(false);
  });
});

describe("HttpTabletopGateway", () => {
  let server: Server;
  let baseUrl: string;
  let received: { url: string; body: any }[] = [];
  let respondWithStatus = 201;

  beforeAll(async () => {
    server = createServer((req: IncomingMessage, res: ServerResponse) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        received.push({ url: req.url!, body: JSON.parse(body) });
        res.statusCode = respondWithStatus;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ ok: respondWithStatus < 400 }));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    received = [];
    respondWithStatus = 201;
  });

  it("POSTs the event to /api/tables/:tableName/cards", async () => {
    const gateway = new HttpTabletopGateway(baseUrl);
    const event = anEvent();
    await gateway.sendCardToTable("Friday Night", event);

    expect(received).toHaveLength(1);
    expect(received[0].url).toBe("/api/tables/Friday%20Night/cards");
    expect(received[0].body).toEqual(JSON.parse(JSON.stringify(event)));
  });

  it("throws on a non-2xx response (send-then-commit: the play must be blocked)", async () => {
    respondWithStatus = 503;
    const gateway = new HttpTabletopGateway(baseUrl);
    await expect(gateway.sendCardToTable("Friday Night", anEvent())).rejects.toThrow(/503/);
  });

  it("throws when the tabletop is unreachable", async () => {
    const gateway = new HttpTabletopGateway("http://localhost:1"); // nothing listens here
    await expect(gateway.sendCardToTable("Friday Night", anEvent())).rejects.toThrow();
  });

  it("POSTs a seat.joined event to /api/tables/:tableName/events", async () => {
    const gateway = new HttpTabletopGateway(baseUrl);
    const event = buildSeatJoinedEvent(initiator, "Test Deck", "Friday Night", "https://mtg.example/playmat.png", "https://mtg.example/card-back.jpg");
    await gateway.sendSeatJoined("Friday Night", event);

    expect(received).toHaveLength(1);
    expect(received[0].url).toBe("/api/tables/Friday%20Night/events");
    expect(received[0].body).toEqual(JSON.parse(JSON.stringify(event)));
  });

  it("throws on a non-2xx response for seat.joined", async () => {
    respondWithStatus = 503;
    const gateway = new HttpTabletopGateway(baseUrl);
    const event = buildSeatJoinedEvent(initiator, "Test Deck", "Friday Night");
    await expect(gateway.sendSeatJoined("Friday Night", event)).rejects.toThrow(/503/);
  });
});

describe("buildSeatJoinedEvent commanders", () => {
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

  it("omits commanders when none are given", () => {
    const event = buildSeatJoinedEvent(initiator, "Test Deck");
    expect(event.commanders).toBeUndefined();
  });

  it("carries 0-2 commanders as {card:{scryfallId,instanceId}} plus scaffolding cardName/frontImageUrl/backImageUrl, no face", () => {
    const event = buildSeatJoinedEvent(initiator, "Test Deck", undefined, undefined, undefined, [commanderCard(lightningBolt, "i-1")]);
    expect(event.commanders).toHaveLength(1);
    expect(event.commanders![0].card).toEqual({ scryfallId: lightningBolt.scryfallId, instanceId: "i-1" });
    expect(event.commanders![0].cardName).toBe(lightningBolt.name);
    expect(event.commanders![0].frontImageUrl).toBeTruthy();
    expect(event.commanders![0].backImageUrl).toBeNull(); // not twoFaced
    expect(event.commanders![0]).not.toHaveProperty("face");
  });

  it("derives a commander's backImageUrl from twoFaced, same rule as card.played", () => {
    const event = buildSeatJoinedEvent(initiator, "Test Deck", undefined, undefined, undefined, [commanderCard(nicolBolas, "i-2")]);
    expect(event.commanders![0].backImageUrl).toContain("/back/");
  });

  it("carries two commanders (partners)", () => {
    const event = buildSeatJoinedEvent(initiator, "Test Deck", undefined, undefined, undefined, [
      commanderCard(lightningBolt, "i-1"),
      commanderCard(nicolBolas, "i-2"),
    ]);
    expect(event.commanders).toHaveLength(2);
  });
});
