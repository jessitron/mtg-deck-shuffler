import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import { startServer } from "../src/server/server";
import { getRoomRegistry } from "../src/server/rooms";
import { playmatBounds, graveyardBounds, stackBounds } from "../src/server/cardLayout";

/**
 * A5/JES-140: POST /api/tables/:tableName/cards — the seam the Spine absorbs.
 * Dedup on event id AND on instanceId; lands go to the player's playmat,
 * everything else to the stack; discards to the graveyard box.
 *
 * These tests post cards WITHOUT a prior seat.joined, exercising
 * handleCardArrival's defensive fallback (ensurePlayerArea is idempotent and
 * seat.joined normally runs first — see seatJoined.test.ts for that path).
 *
 * Since tabletop-cards-come-and-go ticket 05, the body posted is a real
 * envelope (contracts/envelope.v1.json) carrying a card.played payload
 * (contracts/payloads/card.played.v1.json), validated for real via ajv.
 */
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

let eventCounter = 0;
function cardPlayed(tableName: string, envelopeOverrides: Record<string, unknown> = {}, payloadOverrides: Record<string, unknown> = {}) {
  eventCounter++;
  const initiator = (envelopeOverrides.initiator as { seatId: string; playerName: string } | undefined) ?? {
    seatId: "seat-0000001",
    playerName: "Jess",
  };
  return {
    id: randomUUID(),
    tableId: tableName,
    name: "card.played",
    occurredAt: new Date().toISOString(),
    initiator,
    occurredIn: "shuffler",
    visibility: "public",
    traceparent: fakeTraceparent(),
    schemaVersion: 1,
    payload: {
      card: { scryfallId: "11111111-1111-4111-8111-111111111111", instanceId: randomUUID() },
      face: "front",
      zoneHint: "stack",
      frontImageUrl: "https://cards.scryfall.io/normal/front/1/1/11111111.jpg",
      backImageUrl: null,
      cardName: "Lightning Bolt",
      owner: initiator.seatId, // owner (payload) has minLength 8 — mirrors the seatId sending it
      isCommander: false,
      ...payloadOverrides,
    },
    ...envelopeOverrides,
  };
}

async function post(tableName: string, body: unknown): Promise<Response> {
  return fetch(`http://localhost:${port}/api/tables/${tableName}/cards`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function shapesOf(tableName: string) {
  const entry = getRoomRegistry().get(tableName);
  if (!entry) return [];
  return entry.room
    .getCurrentSnapshot()
    .documents.map((d) => d.state as any)
    .filter((r) => r.typeName === "shape" && r.type === "mtg-card" && r.props?.instanceId);
}

describe("card arrival", () => {
  it("puts a stack-hinted card in the stack strip with identity props", async () => {
    const event = cardPlayed("arrival-basic");
    const response = await post("arrival-basic", event);
    expect(response.status).toBe(201);

    const shapes = shapesOf("arrival-basic");
    expect(shapes).toHaveLength(1);
    expect(shapes[0].props).toMatchObject({
      instanceId: event.payload.card.instanceId,
      scryfallId: event.payload.card.scryfallId,
      cardName: "Lightning Bolt",
      frontImageUrl: event.payload.frontImageUrl,
      backImageUrl: null,
      face: "front",
      tapped: false,
      owner: event.payload.owner,
      isCommander: false,
    });
    const stack = stackBounds();
    expect(shapes[0].x).toBeGreaterThanOrEqual(stack.x);
    expect(shapes[0].y).toBeGreaterThanOrEqual(stack.y);
    // no index anywhere in what the tabletop stores
    expect(JSON.stringify(shapes[0].meta)).not.toContain("Index");
  });

  it("dedups a retried request (same event id): physical no-op", async () => {
    const event = cardPlayed("arrival-dedup-id");
    await post("arrival-dedup-id", event);
    const retry = await post("arrival-dedup-id", event);
    expect(retry.status).toBe(200);
    expect((await retry.json()).deduped).toBe(true);
    expect(shapesOf("arrival-dedup-id")).toHaveLength(1);
  });

  it("dedups a retried play (same instanceId, new event id): one instance exists once", async () => {
    const event = cardPlayed("arrival-dedup-instance");
    await post("arrival-dedup-instance", event);
    const replay = cardPlayed("arrival-dedup-instance", {}, { card: event.payload.card });
    const replayResponse = await post("arrival-dedup-instance", replay);
    expect(replayResponse.status).toBe(200);
    expect((await replayResponse.json()).deduped).toBe(true);
    expect(shapesOf("arrival-dedup-instance")).toHaveLength(1);
  });

  it("puts a battlefield-hinted card (a land) on the player's playmat", async () => {
    await post("arrival-zones", cardPlayed("arrival-zones", {}, { zoneHint: "battlefield", cardName: "Forest" }));
    const [land] = shapesOf("arrival-zones");
    const mat = playmatBounds(0);
    expect(land.y).toBeGreaterThanOrEqual(mat.y + mat.h / 2); // bottom half of the playmat

    await post("arrival-zones", cardPlayed("arrival-zones", {}, { zoneHint: "stack", cardName: "Llanowar Elves" }));
    const stackCard = shapesOf("arrival-zones").find((s) => s.props.cardName === "Llanowar Elves")!;
    expect(stackCard.y).toBeLessThan(land.y); // the centered Stack sits above the S seat's playmat
  });

  it("allocates player areas per seatId in join order, keyed by seat not name", async () => {
    await post(
      "arrival-rows",
      cardPlayed("arrival-rows", { initiator: { seatId: "seat-AAAAAAA", playerName: "Sam" } }, { zoneHint: "battlefield" })
    );
    await post(
      "arrival-rows",
      cardPlayed("arrival-rows", { initiator: { seatId: "seat-BBBBBBB", playerName: "Sam" } }, { zoneHint: "battlefield" })
    );
    const shapes = shapesOf("arrival-rows");
    expect(shapes).toHaveLength(2);
    // Same display name, different seats, different player areas. S and N
    // share an x (both centered on the Stack), so compare full positions.
    expect({ x: shapes[0].x, y: shapes[0].y }).not.toEqual({ x: shapes[1].x, y: shapes[1].y });
  });

  it("puts a graveyard-hinted card in the player's graveyard box", async () => {
    await post("arrival-graveyard", cardPlayed("arrival-graveyard", {}, { zoneHint: "graveyard", cardName: "Doomed Dissenter" }));
    const [card] = shapesOf("arrival-graveyard");
    const graveyard = graveyardBounds(0);
    expect(card.x).toBeGreaterThanOrEqual(graveyard.x);
  });

  it("bakes the seat's sleeve color into the minted card's props (ticket 17)", async () => {
    // Seat joins with a sleeve first — sleeve color is seat data, not payload data.
    await fetch(`http://localhost:${port}/api/tables/arrival-sleeved/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: randomUUID(),
        tableId: "arrival-sleeved",
        name: "seat.joined",
        occurredAt: new Date().toISOString(),
        initiator: { seatId: "seat-sleeved", playerName: "Jess" },
        occurredIn: "shuffler",
        visibility: "public",
        traceparent: fakeTraceparent(),
        schemaVersion: 1,
        payload: { deckName: "Blame Game", sleeveColor: "#8b2f5c" },
      }),
    });

    await post("arrival-sleeved", cardPlayed("arrival-sleeved", { initiator: { seatId: "seat-sleeved", playerName: "Jess" } }));
    const [card] = shapesOf("arrival-sleeved");
    expect(card.props.sleeveColor).toBe("#8b2f5c");
  });

  it("an unsleeved seat's cards mint with sleeveColor null (today's look)", async () => {
    await post("arrival-unsleeved", cardPlayed("arrival-unsleeved"));
    const [card] = shapesOf("arrival-unsleeved");
    expect(card.props.sleeveColor).toBeNull();
  });

  it("bakes the seat's card back URL into the minted card's props (ticket 17)", async () => {
    await fetch(`http://localhost:${port}/api/tables/arrival-cardback/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: randomUUID(),
        tableId: "arrival-cardback",
        name: "seat.joined",
        occurredAt: new Date().toISOString(),
        initiator: { seatId: "seat-cardback", playerName: "Jess" },
        occurredIn: "shuffler",
        visibility: "public",
        traceparent: fakeTraceparent(),
        schemaVersion: 1,
        payload: { deckName: "Blame Game", cardBackImageUrl: "https://example.com/card-back.jpg" },
      }),
    });

    await post("arrival-cardback", cardPlayed("arrival-cardback", { initiator: { seatId: "seat-cardback", playerName: "Jess" } }));
    const [card] = shapesOf("arrival-cardback");
    expect(card.props.cardBackImageUrl).toBe("https://example.com/card-back.jpg");
  });

  it("a seat with no card back URL mints cards with cardBackImageUrl null", async () => {
    await post("arrival-no-cardback", cardPlayed("arrival-no-cardback"));
    const [card] = shapesOf("arrival-no-cardback");
    expect(card.props.cardBackImageUrl).toBeNull();
  });

  it("rejects a payload missing required fields (JES-128 validation point)", async () => {
    const response = await post("arrival-invalid", { name: "card.played" });
    expect(response.status).toBe(400);
  });

  it("accepts a payload carrying a gameCardIndex — no longer a guarded secret (let-gamecardindex-out, 2026-08-10)", async () => {
    const event = cardPlayed("arrival-index");
    const response = await post("arrival-index", { ...event, payload: { ...event.payload, gameCardIndex: 7 } });
    expect(response.status).toBe(201);
    const [card] = shapesOf("arrival-index");
    expect(card).toBeDefined();
  });

  it("rejects an unknown event name — fail loudly, never silently drop", async () => {
    const event = cardPlayed("arrival-unknown-name", { name: "card.discarded" });
    const response = await post("arrival-unknown-name", event);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("card.discarded");
  });

  it("rejects an unknown schemaVersion — fail loudly, never silently drop", async () => {
    const event = cardPlayed("arrival-unknown-version", { schemaVersion: 99 });
    const response = await post("arrival-unknown-version", event);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("99");
  });

  it("rejects a payload missing owner or isCommander (ticket 18)", async () => {
    const noOwner = await post("arrival-no-owner", cardPlayed("arrival-no-owner", {}, { owner: undefined }));
    expect(noOwner.status).toBe(400);
    const noIsCommander = await post("arrival-no-is-commander", cardPlayed("arrival-no-is-commander", {}, { isCommander: undefined }));
    expect(noIsCommander.status).toBe(400);
  });

  it("carries isCommander:true through to the minted shape — owner grants no capability, it's a fact the shape carries", async () => {
    await post("arrival-commander-flag", cardPlayed("arrival-commander-flag", {}, { isCommander: true, zoneHint: "battlefield" }));
    const [card] = shapesOf("arrival-commander-flag");
    expect(card.props.isCommander).toBe(true);
    expect(card.isLocked).toBe(false); // owner/isCommander gate nothing; the card is still draggable
  });
});
