import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import { startServer } from "../src/server/server";
import { getRoomRegistry } from "../src/server/rooms";
import { slugFor } from "./support/tableSlug";
import { closeAllSpineSubscriptions } from "./support/closeSpineSubscriptions";

let server: Server;
let port: number;

beforeAll(async () => {
  process.env.ENABLE_TEST_SEED_ROUTE = "true";
  server = await startServer(0);
  const address = server.address();
  if (typeof address === "object" && address) port = address.port;
});

afterAll(() => {
  closeAllSpineSubscriptions();
  return new Promise<void>((resolve) => server.close(() => resolve()));
});

function fakeTraceparent(): string {
  return `00-${randomUUID().replace(/-/g, "")}-${randomUUID().replace(/-/g, "").slice(0, 16)}-01`;
}

function cardPlayed(tableName: string, instanceId: string, envelopeOverrides: Record<string, unknown> = {}) {
  const initiator = { seatId: "seat-0000001", playerName: "Jess" };
  return {
    id: randomUUID(),
    tableId: slugFor(tableName),
    name: "card.played",
    occurredAt: new Date().toISOString(),
    initiator,
    occurredIn: "shuffler",
    origin: "shuffler.playCardSubmit",
    significance: "domain",
    traceparent: fakeTraceparent(),
    schemaVersion: 1,
    payload: {
      card: { scryfallId: "11111111-1111-4111-8111-111111111111", instanceId },
      face: "front",
      zoneHint: "stack",
      frontImageUrl: "https://cards.scryfall.io/normal/front/1/1/11111111.jpg",
      backImageUrl: null,
      cardName: "Lightning Bolt",
      owner: initiator.seatId,
      isCommander: false,
    },
    ...envelopeOverrides,
  };
}

function cardReturned(tableName: string, instanceId: string, envelopeOverrides: Record<string, unknown> = {}, payloadOverrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    tableId: slugFor(tableName),
    name: "card.returned",
    occurredAt: new Date().toISOString(),
    initiator: { seatId: "seat-0000001", playerName: "Jess" },
    occurredIn: "shuffler",
    origin: "shuffler.returnCardSubmit",
    significance: "domain",
    traceparent: fakeTraceparent(),
    schemaVersion: 1,
    payload: {
      card: { scryfallId: "11111111-1111-4111-8111-111111111111", instanceId },
      gameCardIndex: 3,
      seat: "seat-0000001",
      ...payloadOverrides,
    },
    ...envelopeOverrides,
  };
}

async function postArrival(tableName: string, body: unknown): Promise<Response> {
  return fetch(`http://localhost:${port}/test/tables/${slugFor(tableName)}/cards`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function postRemoval(tableName: string, body: unknown): Promise<Response> {
  return fetch(`http://localhost:${port}/test/tables/${slugFor(tableName)}/cards/remove`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function joinSeat(tableName: string, seatId: string, playerName: string): Promise<void> {
  await fetch(`http://localhost:${port}/api/tables/${slugFor(tableName)}/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
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
      payload: { deckName: "Blame Game" },
    }),
  });
}

function shapesOf(tableName: string) {
  const entry = getRoomRegistry().get(slugFor(tableName));
  if (!entry) return [];
  return entry.room
    .getCurrentSnapshot()
    .documents.map((d) => d.state as any)
    .filter((r) => r.typeName === "shape" && r.type === "mtg-card" && r.props?.instanceId);
}

describe("card removal (ticket 07)", () => {
  it("poofs the shape for a shuffler-initiated card.returned, identified by instanceId", async () => {
    const instanceId = randomUUID();
    await joinSeat("removal-basic", "seat-0000001", "Jess");
    await postArrival("removal-basic", cardPlayed("removal-basic", instanceId));
    expect(shapesOf("removal-basic")).toHaveLength(1);

    const response = await postRemoval("removal-basic", cardReturned("removal-basic", instanceId));
    expect(response.status).toBe(200);
    expect((await response.json()).removed).toBe(true);
    expect(shapesOf("removal-basic")).toHaveLength(0);
  });

  it("re-playing the same instanceId after a return lands a fresh shape — closes the dedup trap", async () => {
    const instanceId = randomUUID();
    await joinSeat("removal-replay", "seat-0000001", "Jess");
    await postArrival("removal-replay", cardPlayed("removal-replay", instanceId));
    await postRemoval("removal-replay", cardReturned("removal-replay", instanceId));
    expect(shapesOf("removal-replay")).toHaveLength(0);

    const replay = await postArrival("removal-replay", cardPlayed("removal-replay", instanceId));
    expect(replay.status).toBe(201);
    expect(shapesOf("removal-replay")).toHaveLength(1);
  });

  it("ignores a tabletop-initiated card.returned (occurredIn: tabletop) — no feedback loop with the library-portal swallow", async () => {
    const instanceId = randomUUID();
    await joinSeat("removal-ignore-tabletop", "seat-0000001", "Jess");
    await postArrival("removal-ignore-tabletop", cardPlayed("removal-ignore-tabletop", instanceId));

    const response = await postRemoval(
      "removal-ignore-tabletop",
      cardReturned("removal-ignore-tabletop", instanceId, { occurredIn: "tabletop", origin: "tabletop.librarySwallow" })
    );
    expect(response.status).toBe(200);
    expect((await response.json()).ignored).toBe("not-shuffler-initiated");
    expect(shapesOf("removal-ignore-tabletop")).toHaveLength(1);
  });

  it("is a benign no-op for an instanceId with no matching shape (already removed by an earlier delivery)", async () => {
    const response = await postRemoval("removal-not-found", cardReturned("removal-not-found", randomUUID()));
    expect(response.status).toBe(200);
    expect((await response.json()).removed).toBe(false);
  });

  it("dedups a retried delivery (same event id): physical no-op", async () => {
    const instanceId = randomUUID();
    await joinSeat("removal-dedup", "seat-0000001", "Jess");
    await postArrival("removal-dedup", cardPlayed("removal-dedup", instanceId));
    const event = cardReturned("removal-dedup", instanceId);
    await postRemoval("removal-dedup", event);
    const retry = await postRemoval("removal-dedup", event);
    expect((await retry.json()).deduped).toBe(true);
  });

  it("rejects a payload missing required fields", async () => {
    const response = await postRemoval("removal-invalid", { name: "card.returned", occurredIn: "shuffler" });
    expect(response.status).toBe(400);
  });

  it("reparents a passenger (mtg-counter) to the page in place, rather than deleting it too", async () => {
    const instanceId = randomUUID();
    await joinSeat("removal-passengers", "seat-0000001", "Jess");
    await postArrival("removal-passengers", cardPlayed("removal-passengers", instanceId));
    const [card] = shapesOf("removal-passengers");

    const entry = getRoomRegistry().get(slugFor("removal-passengers"))!;
    const counterId = `shape:counter-${randomUUID()}`;
    await entry.room.updateStore((store) => {
      store.put({
        id: counterId,
        typeName: "shape",
        type: "mtg-counter",
        parentId: card.id,
        x: 5,
        y: 5,
        rotation: 0,
        index: "a2",
        isLocked: false,
        opacity: 1,
        meta: {},
        props: { w: 20, h: 20, text: "1" },
      } as any);
    });

    await postRemoval("removal-passengers", cardReturned("removal-passengers", instanceId));

    const counter = entry.room.getCurrentSnapshot().documents.map((d) => d.state as any).find((r) => r.id === counterId);
    expect(counter).toBeDefined();
    expect(counter.parentId).toBe(card.parentId);
    expect(counter.x).toBe(card.x + 5);
    expect(counter.y).toBe(card.y + 5);
  });
});
