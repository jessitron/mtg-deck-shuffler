import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import { startServer } from "../src/server/server";
import { getRoomRegistry } from "../src/server/rooms";
import { playmatBounds, libraryBounds, commandZoneBounds, graveyardBounds, exileBounds, stackBounds, commandZoneCardPosition } from "../src/server/cardLayout";

/**
 * JES-140: POST /api/tables/:tableName/events (seat.joined) — the player area
 * (playmat, library, graveyard, exile, name label) is drawn at Shuffle Up,
 * before any card arrives. Seats take compass slots (S, N, E, W by join
 * order) around a fixed centered Stack square (ticket 14, the square).
 *
 * Since tabletop-cards-come-and-go ticket 05, the body posted is a real
 * envelope (contracts/envelope.v1.json) carrying a seat.joined payload
 * (contracts/payloads/seat.joined.v1.json), validated for real via ajv.
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
function seatJoined(tableName: string, envelopeOverrides: Record<string, unknown> = {}, payloadOverrides: Record<string, unknown> = {}) {
  eventCounter++;
  return {
    id: randomUUID(),
    tableId: tableName,
    name: "seat.joined",
    occurredAt: new Date().toISOString(),
    initiator: { seatId: `seat-${eventCounter}`, playerName: "Jess" },
    occurredIn: "shuffler",
    visibility: "public",
    traceparent: fakeTraceparent(),
    schemaVersion: 1,
    payload: {
      deckName: "Blame Game",
      playmatImageUrl: "https://example.com/playmat.png",
      cardBackImageUrl: "https://example.com/card-back.jpg",
      ...payloadOverrides,
    },
    ...envelopeOverrides,
  };
}

async function post(tableName: string, body: unknown): Promise<Response> {
  return fetch(`http://localhost:${port}/api/tables/${tableName}/events`, {
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
    .filter((r) => r.typeName === "shape");
}

describe("seat joined", () => {
  it("draws a full player area — playmat, library, command zone, graveyard, exile, name label — before any card", async () => {
    const event = seatJoined("seat-basic");
    const response = await post("seat-basic", event);
    expect(response.status).toBe(201);

    const shapes = shapesOf("seat-basic");
    const mat = playmatBounds(0);
    const library = libraryBounds(0);
    const command = commandZoneBounds(0);
    const graveyard = graveyardBounds(0);
    const exile = exileBounds(0);

    expect(shapes.some((s) => s.x === mat.x && s.y === mat.y)).toBe(true);
    expect(shapes.some((s) => s.x === library.x && s.y === library.y)).toBe(true);
    expect(
      shapes.some((s) => s.type === "mtg-zone" && s.props?.zone === "command" && s.x === command.x && s.y === command.y && s.props?.w === command.w)
    ).toBe(true);
    expect(shapes.some((s) => s.x === graveyard.x && s.y === graveyard.y && s.props?.w === graveyard.w && s.props?.h === graveyard.h)).toBe(true);
    expect(shapes.some((s) => s.x === exile.x && s.y === exile.y && s.props?.w === exile.w && s.props?.h === exile.h)).toBe(true);
    expect(shapes.some((s) => s.type === "text")).toBe(true);
  });

  it("labels the seat with the player's name and the deck's name, player first", async () => {
    await post("seat-label", seatJoined("seat-label", { initiator: { seatId: "seat-label-a", playerName: "Robin" } }));

    const label = shapesOf("seat-label").find((s) => s.type === "text");
    const text = JSON.stringify(label.props.richText);
    expect(text).toContain("Robin");
    expect(text).toContain("Blame Game");
    expect(text.indexOf("Robin")).toBeLessThan(text.indexOf("Blame Game"));
  });

  it("rejects a seat.joined without a deckName — the contract requires it", async () => {
    const event = seatJoined("seat-no-deck");
    delete (event.payload as Record<string, unknown>).deckName;
    const response = await post("seat-no-deck", event);
    expect(response.status).toBe(400);
  });

  it("dedups a retried request (same event id): physical no-op", async () => {
    const event = seatJoined("seat-dedup-id");
    await post("seat-dedup-id", event);
    const retry = await post("seat-dedup-id", event);
    expect(retry.status).toBe(200);
    expect((await retry.json()).deduped).toBe(true);
  });

  it("dedups a seat that already joined (fresh event id): a second seat.joined is a no-op", async () => {
    const event = seatJoined("seat-dedup-seat");
    await post("seat-dedup-seat", event);
    const secondAttempt = await post("seat-dedup-seat", seatJoined("seat-dedup-seat", { initiator: event.initiator }));
    expect(secondAttempt.status).toBe(200);
    expect((await secondAttempt.json()).deduped).toBe(true);
  });

  it("missing playmatImageUrl degrades to a plain mat, not a broken player area", async () => {
    const event = seatJoined("seat-no-image", {}, { playmatImageUrl: undefined, cardBackImageUrl: undefined });
    const response = await post("seat-no-image", event);
    expect(response.status).toBe(201);

    const shapes = shapesOf("seat-no-image");
    const mat = playmatBounds(0);
    // The mat outline is still drawn; no image shape was created for it.
    expect(shapes.some((s) => s.x === mat.x && s.y === mat.y && s.type === "mtg-zone")).toBe(true);
    expect(shapes.some((s) => s.type === "image")).toBe(false);
  });

  it("seats 1-4 take compass slots S, N, E, W by join order, and existing seats never move", async () => {
    const table = "seat-square";
    const positionsAfterEachJoin: Array<Array<{ x: number; y: number }>> = [];
    for (const seat of ["A", "B", "C", "D"]) {
      await post(table, seatJoined(table, { initiator: { seatId: `seat-sq-${seat}`, playerName: seat } }));
      positionsAfterEachJoin.push(
        shapesOf(table)
          .filter((s) => s.type === "mtg-zone" && s.props?.zone === "playmat")
          .map((s) => ({ x: s.x, y: s.y }))
      );
    }

    // Each seat's playmat lands at its compass slot's coordinates.
    const mats = positionsAfterEachJoin[3];
    for (let seat = 0; seat < 4; seat++) {
      const expected = playmatBounds(seat);
      expect(mats, `seat ${seat} playmat at its compass slot`).toContainEqual({ x: expected.x, y: expected.y });
    }

    // A new seat joining never moves the seats already at the table.
    for (let join = 1; join < 4; join++) {
      for (const earlier of positionsAfterEachJoin[join - 1]) {
        expect(positionsAfterEachJoin[join], `join ${join + 1} moved an existing playmat`).toContainEqual(earlier);
      }
    }

    // Every zone actually drawn at the full table keeps a GAP-wide (20-unit)
    // empty band from every other — zone detection is first-match by z-order,
    // not closest-match, so disjointness is the guarantee (cardLayout.test.ts
    // asserts the same over the pure geometry).
    const zones = shapesOf(table)
      .filter((s) => s.type === "mtg-zone")
      .map((s) => ({ label: `${s.props.zone}@${s.x},${s.y}`, x: s.x, y: s.y, w: s.props.w, h: s.props.h }));
    expect(zones.length).toBe(21); // five zones per seat + the Stack
    for (let i = 0; i < zones.length; i++) {
      for (let j = i + 1; j < zones.length; j++) {
        const a = zones[i];
        const b = zones[j];
        const gap = Math.max(Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w)), Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h)));
        expect(gap, `${a.label} is within a GAP of ${b.label}`).toBeGreaterThanOrEqual(20);
      }
    }

    // The table has exactly four compass slots: a fifth seat is refused
    // loudly rather than drawn on top of an existing area.
    const fifth = await post(table, seatJoined(table, { initiator: { seatId: "seat-sq-E", playerName: "Evan" } }));
    expect(fifth.status).toBe(409);
    expect(shapesOf(table).filter((s) => s.type === "mtg-zone" && s.props?.zone === "playmat")).toHaveLength(4);
  });

  it("draws the Stack as a fixed centered square that does not change as seats join", async () => {
    const expected = stackBounds();
    await post("seat-stack-fixed", seatJoined("seat-stack-fixed", { initiator: { seatId: "seat-fixed-A", playerName: "Sam" } }));
    const afterOne = shapesOf("seat-stack-fixed").find((s) => s.props?.label === "The Stack");
    expect({ x: afterOne.x, y: afterOne.y, w: afterOne.props.w, h: afterOne.props.h }).toEqual(expected);

    await post("seat-stack-fixed", seatJoined("seat-stack-fixed", { initiator: { seatId: "seat-fixed-B", playerName: "Alex" } }));
    const afterTwo = shapesOf("seat-stack-fixed").find((s) => s.props?.label === "The Stack");
    expect({ x: afterTwo.x, y: afterTwo.y, w: afterTwo.props.w, h: afterTwo.props.h }).toEqual(expected);
  });

  it("keeps the Stack shape's z-order index stable across seat joins, instead of minting a fresh one", async () => {
    await post("seat-stack-index", seatJoined("seat-stack-index", { initiator: { seatId: "seat-index-A", playerName: "Sam" } }));
    const afterOne = shapesOf("seat-stack-index").find((s) => s.props?.label === "The Stack");

    await post("seat-stack-index", seatJoined("seat-stack-index", { initiator: { seatId: "seat-index-B", playerName: "Alex" } }));
    const afterTwo = shapesOf("seat-stack-index").find((s) => s.props?.label === "The Stack");

    expect(afterTwo.index).toBe(afterOne.index);
  });

  it("a sleeved seat's library pile is the solid sleeve color, not a card-back image", async () => {
    const response = await post("seat-sleeve", seatJoined("seat-sleeve", {}, { sleeveColor: "#8b2f5c" }));
    expect(response.status).toBe(201);

    const shapes = shapesOf("seat-sleeve");
    const libraryZone = shapes.find((s) => s.type === "mtg-zone" && s.props?.zone === "library");
    expect(libraryZone.props.sleeveColor).toBe("#8b2f5c");
    // sleeveColor wins over the card-back image the fixture also sent: no
    // library image shape is drawn (the playmat image is still an image shape).
    const library = libraryBounds(0);
    expect(shapes.some((s) => s.type === "image" && s.x > library.x && s.x < library.x + library.w)).toBe(false);
  });

  it("remembers the seat's sleeve color for cards that arrive later, dropping the card back", async () => {
    const event = seatJoined("seat-sleeve-memory", {}, { sleeveColor: "#8b2f5c" });
    await post("seat-sleeve-memory", event);

    const area = getRoomRegistry().get("seat-sleeve-memory")!.seats.get(event.initiator.seatId as string)!;
    expect(area.sleeveColor).toBe("#8b2f5c");
    expect(area.cardBackImageUrl).toBeUndefined();
  });

  it("an unsleeved seat keeps the card-back image pile (today's look)", async () => {
    await post("seat-unsleeved", seatJoined("seat-unsleeved"));
    const shapes = shapesOf("seat-unsleeved");
    const libraryZone = shapes.find((s) => s.type === "mtg-zone" && s.props?.zone === "library");
    expect(libraryZone.props.sleeveColor).toBeNull();
    const library = libraryBounds(0);
    expect(shapes.some((s) => s.type === "image" && s.x > library.x && s.x < library.x + library.w)).toBe(true);
  });

  it("rejects a sleeveColor that is not a six-digit hex color — fail loudly, not quietly unsleeved", async () => {
    expect((await post("seat-bad-sleeve", seatJoined("seat-bad-sleeve", {}, { sleeveColor: "purple" }))).status).toBe(400);
    expect((await post("seat-bad-sleeve", seatJoined("seat-bad-sleeve", {}, { sleeveColor: "#8b2f5" }))).status).toBe(400);
  });

  it("rejects a payload missing required fields", async () => {
    const response = await post("seat-invalid", { name: "seat.joined" });
    expect(response.status).toBe(400);
  });

  it("rejects a payload carrying a gameCardIndex — the secret must not cross", async () => {
    const event = seatJoined("seat-secret");
    const response = await post("seat-secret", { ...event, payload: { ...event.payload, gameCardIndex: 7 } });
    expect(response.status).toBe(400);
  });

  it("rejects an unknown event name — fail loudly, never silently drop", async () => {
    const response = await post("seat-unknown-name", seatJoined("seat-unknown-name", { name: "seat.taken" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("seat.taken");
  });

  it("rejects an unknown schemaVersion — fail loudly, never silently drop", async () => {
    const response = await post("seat-unknown-version", seatJoined("seat-unknown-version", { schemaVersion: 99 }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("99");
  });
});

// Ticket 18: commanders ride seat.joined and land in the Command Zone as
// ordinary, draggable mtg-card shapes, each backed by a locked, faded ghost
// that marks its home and stays put when the real card moves out.
describe("seat joined — commanders", () => {
  function commanderEntry(cardName: string, frontImageUrl: string) {
    return { card: { scryfallId: randomUUID(), instanceId: randomUUID() }, cardName, frontImageUrl, backImageUrl: null };
  }

  function seatJoinedWithCommanders(tableName: string, commanders: unknown[], payloadOverrides: Record<string, unknown> = {}) {
    return seatJoined(tableName, {}, { commanders, ...payloadOverrides });
  }

  it("mints no commander shapes when none are given", async () => {
    await post("seat-no-commanders", seatJoined("seat-no-commanders"));
    const cards = shapesOf("seat-no-commanders").filter((s) => s.type === "mtg-card");
    expect(cards).toHaveLength(0);
  });

  it("mints one commander as a draggable mtg-card, centered in the Command Zone, plus a locked faded ghost in the same spot", async () => {
    const atraxa = commanderEntry("Atraxa", "https://example.com/atraxa.jpg");
    const event = seatJoinedWithCommanders("seat-one-commander", [atraxa]);
    const response = await post("seat-one-commander", event);
    expect(response.status).toBe(201);

    const cards = shapesOf("seat-one-commander").filter((s) => s.type === "mtg-card");
    expect(cards).toHaveLength(2); // the real commander + its ghost

    const pos = commandZoneCardPosition(0, 0, 1);
    const instanceId = atraxa.card.instanceId;
    const real = cards.find((c) => c.props.instanceId === instanceId)!;
    expect(real.x).toBe(pos.x);
    expect(real.y).toBe(pos.y);
    expect(real.isLocked).toBe(false);
    expect(real.opacity).toBe(1);
    expect(real.props.owner).toBe(event.initiator.seatId);
    expect(real.props.isCommander).toBe(true);
    expect(real.props.face).toBe("front");
    expect(real.props.faceDown).toBe(false);
    expect(real.props.cardName).toBe("Atraxa");

    const ghost = cards.find((c) => c.props.instanceId !== instanceId)!;
    expect(ghost.x).toBe(pos.x);
    expect(ghost.y).toBe(pos.y);
    expect(ghost.isLocked).toBe(true);
    expect(ghost.opacity).toBeLessThan(1);
    expect(ghost.opacity).toBeGreaterThan(0);
    expect(ghost.props.owner).toBe(event.initiator.seatId);
    expect(ghost.props.isCommander).toBe(true);
    expect(ghost.props.frontImageUrl).toBe("https://example.com/atraxa.jpg");
    // Distinct identity so a later card.played for the real instance is never
    // deduped against the ghost (instanceAlreadyOnTable matches on props.instanceId).
    expect(ghost.props.instanceId).not.toBe(instanceId);

    // The real card paints above its ghost.
    expect(real.index > ghost.index).toBe(true);
  });

  it("mints two commanders side by side, each with its own ghost", async () => {
    const breya = commanderEntry("Breya", "https://example.com/breya.jpg");
    const silas = commanderEntry("Silas", "https://example.com/silas.jpg");
    const event = seatJoinedWithCommanders("seat-two-commanders", [breya, silas]);
    const response = await post("seat-two-commanders", event);
    expect(response.status).toBe(201);

    const cards = shapesOf("seat-two-commanders").filter((s) => s.type === "mtg-card");
    expect(cards).toHaveLength(4); // two commanders + two ghosts

    const firstPos = commandZoneCardPosition(0, 0, 2);
    const secondPos = commandZoneCardPosition(0, 1, 2);
    const realA = cards.find((c) => c.props.instanceId === breya.card.instanceId)!;
    const realB = cards.find((c) => c.props.instanceId === silas.card.instanceId)!;
    expect({ x: realA.x, y: realA.y }).toEqual(firstPos);
    expect({ x: realB.x, y: realB.y }).toEqual(secondPos);
    expect(cards.filter((c) => c.isLocked)).toHaveLength(2); // exactly the two ghosts
  });

  it("bakes the seat's sleeve into both the real commander and its ghost", async () => {
    const zur = commanderEntry("Zur", "https://example.com/zur.jpg");
    const event = seatJoinedWithCommanders("seat-commander-sleeve", [zur], { sleeveColor: "#8b2f5c" });
    await post("seat-commander-sleeve", event);

    const cards = shapesOf("seat-commander-sleeve").filter((s) => s.type === "mtg-card");
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      expect(card.props.sleeveColor).toBe("#8b2f5c");
    }
  });

  it("a second seat.joined for an already-seated seat is a no-op — commanders are minted once", async () => {
    const kaalia = commanderEntry("Kaalia", "https://example.com/kaalia.jpg");
    const event = seatJoinedWithCommanders("seat-commander-dedup", [kaalia]);
    await post("seat-commander-dedup", event);
    await post("seat-commander-dedup", { ...event, id: randomUUID() });

    const cards = shapesOf("seat-commander-dedup").filter((s) => s.type === "mtg-card");
    expect(cards).toHaveLength(2); // still just the one commander + its ghost, not minted twice
  });
});
