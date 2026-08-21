import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import { startServer } from "../src/server/server";
import { getRoomRegistry } from "../src/server/rooms";
import { slugFor } from "./support/tableSlug";

let server: Server;
let port: number;

beforeAll(async () => {
  process.env.ENABLE_TEST_SEED_ROUTE = "true";
  server = await startServer(0);
  const address = server.address();
  if (typeof address === "object" && address) port = address.port;
});

afterAll(() => {
  return new Promise<void>((resolve) => server.close(() => resolve()));
});

function fakeTraceparent(): string {
  return `00-${randomUUID().replace(/-/g, "")}-${randomUUID().replace(/-/g, "").slice(0, 16)}-01`;
}

function seatJoined(tableName: string, seatId: string, playerName: string) {
  return {
    id: randomUUID(),
    tableId: slugFor(tableName),
    name: "seat.joined",
    occurredAt: new Date().toISOString(),
    initiator: { seatId, playerName },
    occurredIn: "shuffler",
    origin: "shuffler.shuffleUp",
    significance: "administrative",
    traceparent: fakeTraceparent(),
    schemaVersion: 1,
    payload: { deckName: "Deck", playmatImageUrl: "https://example.com/playmat.png", cardBackImageUrl: "https://example.com/card-back.jpg" },
  };
}

function cardPlayed(tableName: string, seatId: string, playerName: string) {
  return {
    id: randomUUID(),
    tableId: slugFor(tableName),
    name: "card.played",
    occurredAt: new Date().toISOString(),
    initiator: { seatId, playerName },
    occurredIn: "shuffler",
    origin: "shuffler.playCardSubmit",
    significance: "domain",
    traceparent: fakeTraceparent(),
    schemaVersion: 1,
    payload: {
      card: { scryfallId: "11111111-1111-4111-8111-111111111111", instanceId: randomUUID() },
      face: "front",
      zoneHint: "stack",
      frontImageUrl: "https://cards.scryfall.io/normal/front/1/1/11111111.jpg",
      backImageUrl: null,
      cardName: "Lightning Bolt",
      owner: seatId,
      isCommander: false,
    },
  };
}

async function postEvent(tableName: string, body: unknown): Promise<Response> {
  return fetch(`http://localhost:${port}/api/tables/${slugFor(tableName)}/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function postCard(tableName: string, body: unknown): Promise<Response> {
  return fetch(`http://localhost:${port}/test/tables/${slugFor(tableName)}/cards`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function allShapes(tableName: string) {
  const entry = getRoomRegistry().get(slugFor(tableName));
  if (!entry) return [];
  return entry.room
    .getCurrentSnapshot()
    .documents.map((d) => d.state as any)
    .filter((r) => r.typeName === "shape");
}

describe("furniture z-order", () => {
  it("keeps a late-joining seat's playmat below cards already on the table", async () => {
    const tableName = `furniture-zorder-${randomUUID()}`;

    await postEvent(tableName, seatJoined(tableName, "seat-early01", "Early"));
    const cardResponse = await postCard(tableName, cardPlayed(tableName, "seat-early01", "Early"));
    expect(cardResponse.status).toBe(201);

    await postEvent(tableName, seatJoined(tableName, "seat-late0001", "Late"));

    const shapes = allShapes(tableName);
    const card = shapes.find((s) => s.type === "mtg-card");
    const lateMat = shapes.find((s) => s.type === "mtg-zone" && s.props?.zone === "playmat" && s.props?.seatId === "seat-late0001");

    expect(card).toBeTruthy();
    expect(lateMat).toBeTruthy();
    expect(lateMat.index < card.index).toBe(true);

    // And no furniture shape at all — from either seat — should ever outrank the card.
    const furnitureIndices = shapes.filter((s) => s.type === "mtg-zone").map((s) => s.index as string);
    for (const index of furnitureIndices) {
      expect(index < card.index).toBe(true);
    }
  });

  it("keeps the life counter above the deck-title label so the title can't cover it", async () => {
    const tableName = `furniture-zorder-${randomUUID()}`;

    await postEvent(tableName, seatJoined(tableName, "seat-title0001", "Titled"));

    const shapes = allShapes(tableName);
    const label = shapes.find((s) => s.type === "mtg-title" && s.id.includes("name-label"));
    const lifeCounter = shapes.find((s) => s.type === "mtg-life-counter" && s.id.includes("life-counter"));

    expect(label).toBeTruthy();
    expect(lifeCounter).toBeTruthy();
    expect(label.index < lifeCounter.index).toBe(true);
  });
});
