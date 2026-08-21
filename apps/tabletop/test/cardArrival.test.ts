import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import { startServer } from "../src/server/server";
import { getRoomRegistry } from "../src/server/rooms";
import { graveyardBounds, stackBounds, stackCardPosition } from "../src/server/cardLayout";
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
  return fetch(`http://localhost:${port}/test/tables/${slugFor(tableName)}/cards`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
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

function furnitureShapesOf(tableName: string) {
  const entry = getRoomRegistry().get(slugFor(tableName));
  if (!entry) return [];
  return entry.room
    .getCurrentSnapshot()
    .documents.map((d) => d.state as any)
    .filter((r) => r.typeName === "shape" && r.type === "mtg-zone");
}

/** seat.joined a seat, so a subsequent card.played has a player area to land in. */
async function joinSeat(
  tableName: string,
  seatId: string,
  playerName: string,
  payloadOverrides: Record<string, unknown> = {}
): Promise<void> {
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
      payload: { deckName: "Blame Game", ...payloadOverrides },
    }),
  });
}

describe("card arrival", () => {
  it("puts a stack-hinted card in the stack strip with identity props", async () => {
    await joinSeat("arrival-basic", "seat-0000001", "Jess");
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
    await joinSeat("arrival-dedup-id", "seat-0000001", "Jess");
    const event = cardPlayed("arrival-dedup-id");
    await post("arrival-dedup-id", event);
    const retry = await post("arrival-dedup-id", event);
    expect(retry.status).toBe(200);
    expect((await retry.json()).deduped).toBe(true);
    expect(shapesOf("arrival-dedup-id")).toHaveLength(1);
  });

  it("dedups a retried play (same instanceId, new event id): one instance exists once", async () => {
    await joinSeat("arrival-dedup-instance", "seat-0000001", "Jess");
    const event = cardPlayed("arrival-dedup-instance");
    await post("arrival-dedup-instance", event);
    const replay = cardPlayed("arrival-dedup-instance", {}, { card: event.payload.card });
    const replayResponse = await post("arrival-dedup-instance", replay);
    expect(replayResponse.status).toBe(200);
    expect((await replayResponse.json()).deduped).toBe(true);
    expect(shapesOf("arrival-dedup-instance")).toHaveLength(1);
  });

  it("puts a battlefield-hinted card (a land) on the Stack, same as everything else played", async () => {
    await joinSeat("arrival-zones", "seat-0000001", "Jess");
    await post("arrival-zones", cardPlayed("arrival-zones", {}, { zoneHint: "battlefield", cardName: "Forest" }));
    const [land] = shapesOf("arrival-zones");
    const stack = stackBounds();
    expect(land.x).toBeGreaterThanOrEqual(stack.x);
    expect(land.y).toBeGreaterThanOrEqual(stack.y);

    await post("arrival-zones", cardPlayed("arrival-zones", {}, { zoneHint: "stack", cardName: "Llanowar Elves" }));
    const stackCard = shapesOf("arrival-zones").find((s) => s.props.cardName === "Llanowar Elves")!;
    expect(stackCard.x).toBeGreaterThanOrEqual(stack.x);
    expect(stackCard.y).toBeGreaterThanOrEqual(stack.y);
    expect({ x: stackCard.x, y: stackCard.y }).not.toEqual({ x: land.x, y: land.y }); // both cascade into the stack, not on top of each other
  });

  it("doesn't keep cascading rightward past a stack card that has since been dragged away", async () => {
    await joinSeat("arrival-stack-reflow", "seat-0000001", "Jess");
    await post("arrival-stack-reflow", cardPlayed("arrival-stack-reflow", {}, { cardName: "Card One" }));
    await post("arrival-stack-reflow", cardPlayed("arrival-stack-reflow", {}, { cardName: "Card Two" }));

    // "Card One" is dragged off the Stack — same as a human moving it to the playmat.
    const entry = getRoomRegistry().get(slugFor("arrival-stack-reflow"))!;
    const cardOne = shapesOf("arrival-stack-reflow").find((s) => s.props.cardName === "Card One")!;
    await entry.room.updateStore((store) => {
      const record = store.get(cardOne.id) as any;
      store.put({ ...record, x: 5000, y: 5000 });
    });

    await post("arrival-stack-reflow", cardPlayed("arrival-stack-reflow", {}, { cardName: "Card Three" }));
    const cardThree = shapesOf("arrival-stack-reflow").find((s) => s.props.cardName === "Card Three")!;

    // Only "Card Two" is still on the Stack (count 1), so "Card Three" lands right after it —
    // not two slots out, as it would if the placement counter never noticed Card One left.
    expect({ x: cardThree.x, y: cardThree.y }).toEqual(stackCardPosition(0, 1));
  });

  it("allocates player areas per seatId in join order, keyed by seat not name", async () => {
    await joinSeat("arrival-rows", "seat-AAAAAAA", "Sam");
    await joinSeat("arrival-rows", "seat-BBBBBBB", "Sam");
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
    expect({ x: shapes[0].x, y: shapes[0].y }).not.toEqual({ x: shapes[1].x, y: shapes[1].y });
  });

  it("places a card by payload.owner, not envelope.initiator.seatId, when they differ (not a real production shape today, just a fixture)", async () => {
    await joinSeat("arrival-owner-vs-initiator", "seat-AAAAAAA", "Sam");
    await joinSeat("arrival-owner-vs-initiator", "seat-BBBBBBB", "Sam");
    // initiator is seat-AAAAAAA (index 0), but the card is owned by seat-BBBBBBB (index 1).
    await post(
      "arrival-owner-vs-initiator",
      cardPlayed(
        "arrival-owner-vs-initiator",
        { initiator: { seatId: "seat-AAAAAAA", playerName: "Sam" } },
        { owner: "seat-BBBBBBB", zoneHint: "stack" }
      )
    );
    const [card] = shapesOf("arrival-owner-vs-initiator");
    expect(card.props.owner).toBe("seat-BBBBBBB");
    const ownerPosition = stackCardPosition(1, 0); // seat-BBBBBBB's area (index 1)
    const initiatorPosition = stackCardPosition(0, 0); // seat-AAAAAAA's area (index 0)
    expect({ x: card.x, y: card.y }).toEqual(ownerPosition);
    expect({ x: card.x, y: card.y }).not.toEqual(initiatorPosition);
  });

  it("puts a graveyard-hinted card in the player's graveyard box", async () => {
    await joinSeat("arrival-graveyard", "seat-0000001", "Jess");
    await post("arrival-graveyard", cardPlayed("arrival-graveyard", {}, { zoneHint: "graveyard", cardName: "Doomed Dissenter" }));
    const [card] = shapesOf("arrival-graveyard");
    const graveyard = graveyardBounds(0);
    expect(card.x).toBeGreaterThanOrEqual(graveyard.x);
  });

  it("bakes the seat's sleeve color into the minted card's props (ticket 17)", async () => {
    // Seat joins with a sleeve first — sleeve color is seat data, not payload data.
    await joinSeat("arrival-sleeved", "seat-sleeved", "Jess", { sleeveColor: "#8b2f5c" });

    await post("arrival-sleeved", cardPlayed("arrival-sleeved", { initiator: { seatId: "seat-sleeved", playerName: "Jess" } }));
    const [card] = shapesOf("arrival-sleeved");
    expect(card.props.sleeveColor).toBe("#8b2f5c");
  });

  it("an unsleeved seat's cards mint with sleeveColor null (today's look)", async () => {
    await joinSeat("arrival-unsleeved", "seat-0000001", "Jess");
    await post("arrival-unsleeved", cardPlayed("arrival-unsleeved"));
    const [card] = shapesOf("arrival-unsleeved");
    expect(card.props.sleeveColor).toBeNull();
  });

  it("bakes the seat's card back URL into the minted card's props (ticket 17)", async () => {
    await joinSeat("arrival-cardback", "seat-cardback", "Jess", { cardBackImageUrl: "https://example.com/card-back.jpg" });

    await post("arrival-cardback", cardPlayed("arrival-cardback", { initiator: { seatId: "seat-cardback", playerName: "Jess" } }));
    const [card] = shapesOf("arrival-cardback");
    expect(card.props.cardBackImageUrl).toBe("https://example.com/card-back.jpg");
  });

  it("a seat with no card back URL mints cards with cardBackImageUrl null", async () => {
    await joinSeat("arrival-no-cardback", "seat-0000001", "Jess");
    await post("arrival-no-cardback", cardPlayed("arrival-no-cardback"));
    const [card] = shapesOf("arrival-no-cardback");
    expect(card.props.cardBackImageUrl).toBeNull();
  });

  it("rejects a payload missing required fields (JES-128 validation point)", async () => {
    const response = await post("arrival-invalid", { name: "card.played" });
    expect(response.status).toBe(400);
  });

  it("accepts a payload carrying a gameCardIndex — no longer a guarded secret (let-gamecardindex-out, 2026-08-10)", async () => {
    await joinSeat("arrival-index", "seat-0000001", "Jess");
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
    await joinSeat("arrival-commander-flag", "seat-0000001", "Jess");
    await post("arrival-commander-flag", cardPlayed("arrival-commander-flag", {}, { isCommander: true, zoneHint: "battlefield" }));
    const [card] = shapesOf("arrival-commander-flag");
    expect(card.props.isCommander).toBe(true);
    expect(card.isLocked).toBe(false); // owner/isCommander gate nothing; the card is still draggable
  });

  it("rejects a card.played for a seat that hasn't joined — no furniture, no card, just a rejection", async () => {
    const response = await post("arrival-no-seat", cardPlayed("arrival-no-seat", { initiator: { seatId: "seat-ghost", playerName: "Ghost" } }));
    expect(response.status).toBe(409);
    expect(shapesOf("arrival-no-seat")).toHaveLength(0);
    expect(furnitureShapesOf("arrival-no-seat")).toHaveLength(0);
  });

  it("mints card.played-face-down shapes with faceDown:true, images populated exactly as card.played would", async () => {
    await joinSeat("arrival-face-down", "seat-0000001", "Jess");
    const event = cardPlayed("arrival-face-down", { name: "card.played-face-down" }, { backImageUrl: "https://cards.scryfall.io/normal/back/1/1/11111111.jpg" });
    const response = await post("arrival-face-down", event);
    expect(response.status).toBe(201);

    const [card] = shapesOf("arrival-face-down");
    expect(card.props).toMatchObject({
      faceDown: true,
      frontImageUrl: event.payload.frontImageUrl,
      backImageUrl: event.payload.backImageUrl,
      cardName: "Lightning Bolt",
    });
  });

  it("rejects a card.played-face-down envelope that fails payload validation — the sibling name doesn't loosen validation", async () => {
    const event = cardPlayed("arrival-face-down-invalid", { name: "card.played-face-down" }, { owner: undefined });
    const response = await post("arrival-face-down-invalid", event);
    expect(response.status).toBe(400);
  });
});
