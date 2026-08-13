import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import { startServer } from "../src/server/server";
import { getRoomRegistry } from "../src/server/rooms";

let server: Server;
let port: number;

beforeAll(async () => {
  server = await startServer(0);
  const address = server.address();
  if (typeof address === "object" && address) port = address.port;
});

afterAll(() => {
  server.close();
});

function fakeTraceparent(): string {
  return `00-${randomUUID().replace(/-/g, "")}-${randomUUID().replace(/-/g, "").slice(0, 16)}-01`;
}

function seatJoined(tableName: string, seatId: string, playerName: string, deckName: string) {
  return {
    id: randomUUID(),
    tableId: tableName,
    name: "seat.joined",
    occurredAt: new Date().toISOString(),
    initiator: { seatId, playerName },
    occurredIn: "shuffler",
    origin: "shuffler.shuffleUp",
    significance: "administrative",
    visibility: "public",
    traceparent: fakeTraceparent(),
    schemaVersion: 1,
    payload: { deckName, playmatImageUrl: "https://example.com/playmat.png", cardBackImageUrl: "https://example.com/card-back.jpg" },
  };
}

async function postEvent(tableName: string, body: unknown): Promise<Response> {
  return fetch(`http://localhost:${port}/api/tables/${tableName}/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function allShapes(tableName: string) {
  const entry = getRoomRegistry().get(tableName);
  if (!entry) return [];
  return entry.room
    .getCurrentSnapshot()
    .documents.map((d) => d.state as any)
    .filter((r) => r.typeName === "shape");
}

describe("editable deck title", () => {
  it("emits a locked mtg-title shape carrying the player 〜 deck line", async () => {
    const tableName = `title-${randomUUID()}`;
    const seatId = "seat-title001";

    await postEvent(tableName, seatJoined(tableName, seatId, "Alice", "Mono-Red Aggro"));

    const title = allShapes(tableName).find((s) => s.type === "mtg-title");
    expect(title).toBeTruthy();
    // The id the commander-damage counters anchor above must be unchanged.
    expect(title.id).toBe(`shape:name-label-${tableName}-${seatId}`);
    expect(title.isLocked).toBe(true);
    expect(title.props.text).toBe("Alice 〜 Mono-Red Aggro");
  });

  it("keeps the title below the life counter so a long title can't cover it", async () => {
    const tableName = `title-zorder-${randomUUID()}`;
    const seatId = "seat-title002";

    await postEvent(tableName, seatJoined(tableName, seatId, "Bob", "Some Very Long Deck Name That Runs Rightward"));

    const shapes = allShapes(tableName);
    const title = shapes.find((s) => s.type === "mtg-title");
    const lifeCounter = shapes.find((s) => s.type === "mtg-life-counter" && s.props?.label === null);

    expect(title).toBeTruthy();
    expect(lifeCounter).toBeTruthy();
    // Furniture indices descend (nextFurnitureIndex uses getIndexBelow), so the life
    // counter — drawn first — takes the higher index and renders above the title (c90d13a).
    expect(lifeCounter.index > title.index).toBe(true);
  });
});
