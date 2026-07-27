import { createServer, IncomingMessage, Server, ServerResponse } from "node:http";
import { AddressInfo } from "node:net";
import { buildCardPlayedEvent, CardPlayedEvent } from "../../src/port-tabletop/types.js";
import { FakeTabletopGateway } from "../../src/port-tabletop/FakeTabletopGateway.js";
import { HttpTabletopGateway } from "../../src/port-tabletop/HttpTabletopGateway.js";
import { GameCard } from "../../src/GameState.js";
import { lightningBolt } from "../generators.js";

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

function anEvent(): CardPlayedEvent {
  const gameCard = handCard();
  return buildCardPlayedEvent(gameCard, gameCard.cardInstanceId!, initiator, "stack");
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
    expect(serialized).not.toContain("42"); // the card's index value must not leak in any field
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
});
