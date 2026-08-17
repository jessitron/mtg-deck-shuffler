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

  it("now receives gameCardIndex (let-gamecardindex-out, 2026-08-10): the old F0/JES-128 guard traded no real secrecy for a reasoning cost nobody's threat model needed", async () => {
    const fake = new FakeTabletopGateway();
    await fake.sendCardToTable("Friday Night", anEvent());

    expect(fake.sentEvents[0].event.payload.gameCardIndex).toBe(42);
    expect(containsValue(fake.sentEvents, 42)).toBe(true);
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

  it("does not expose a sendSeatJoined method (seat.joined now travels via the Spine's /join, ticket 03)", () => {
    expect((HttpTabletopGateway.prototype as any).sendSeatJoined).toBeUndefined();
  });
});
