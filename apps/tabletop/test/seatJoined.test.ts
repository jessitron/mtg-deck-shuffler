import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import { startServer } from "../src/server/server";
import { getRoomRegistry } from "../src/server/rooms";
import {
  playmatBounds,
  libraryBounds,
  commandZoneBounds,
  graveyardBounds,
  exileBounds,
  stackBounds,
  commandZoneCardPosition,
  lifeCounterPosition,
  commanderDamageCounterPosition,
} from "../src/server/cardLayout";

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
    origin: "shuffler.shuffleUp",
    significance: "administrative",
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

  it("draws a life counter on the name row, starting at 40, locked, far right (ticket 20)", async () => {
    await post("seat-life-counter", seatJoined("seat-life-counter", { initiator: { seatId: "seat-life-counter-a", playerName: "Robin" } }));

    const pos = lifeCounterPosition(0);
    const counter = shapesOf("seat-life-counter").find((s) => s.type === "mtg-life-counter");
    expect(counter).toBeDefined();
    expect(counter.x).toBe(pos.x);
    expect(counter.y).toBe(pos.y);
    expect(counter.isLocked).toBe(true);
    expect(counter.props.value).toBe(40);
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

  it("remembers the seat's primary/secondary colors alongside its sleeve color", async () => {
    const event = seatJoined("seat-identity-colors", {}, { sleeveColor: "#8b2f5c", primaryColor: "#8b2f5c", secondaryColor: "#123456" });
    const response = await post("seat-identity-colors", event);
    expect(response.status).toBe(201);

    const area = getRoomRegistry().get("seat-identity-colors")!.seats.get(event.initiator.seatId as string)!;
    expect(area.sleeveColor).toBe("#8b2f5c");
    expect(area.primaryColor).toBe("#8b2f5c");
    expect(area.secondaryColor).toBe("#123456");
  });

  it("a seat.joined with sleeveColor only (an old Shuffler build) still validates, with no primary/secondary stored", async () => {
    const event = seatJoined("seat-colors-old-build", {}, { sleeveColor: "#8b2f5c" });
    const response = await post("seat-colors-old-build", event);
    expect(response.status).toBe(201);

    const area = getRoomRegistry().get("seat-colors-old-build")!.seats.get(event.initiator.seatId as string)!;
    expect(area.sleeveColor).toBe("#8b2f5c");
    expect(area.primaryColor).toBeUndefined();
    expect(area.secondaryColor).toBeUndefined();
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

  it("accepts a payload carrying a gameCardIndex — no longer a guarded secret (let-gamecardindex-out, 2026-08-10)", async () => {
    const event = seatJoined("seat-index");
    const response = await post("seat-index", { ...event, payload: { ...event.payload, gameCardIndex: 7 } });
    expect(response.status).toBe(201);
  });

  it("accepts a payload carrying a field the schema doesn't know about — payload schemas ignore extras, they don't reject them", async () => {
    const event = seatJoined("seat-unknown-field");
    const response = await post("seat-unknown-field", { ...event, payload: { ...event.payload, futureFieldFromANewerShuffler: "whatever" } });
    expect(response.status).toBe(201);
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

describe("seat joined — commander damage counters", () => {
  function commanderEntry(cardName: string, frontImageUrl: string) {
    return { card: { scryfallId: randomUUID(), instanceId: randomUUID() }, cardName, frontImageUrl, backImageUrl: null };
  }

  function damageCountersOf(tableName: string) {
    return shapesOf(tableName).filter((s) => s.type === "mtg-life-counter" && s.props?.label !== null);
  }

  it("mints no damage counters for a lone seat with no commanders", async () => {
    await post("dmg-lone", seatJoined("dmg-lone"));
    expect(damageCountersOf("dmg-lone")).toHaveLength(0);
  });

  it("gives an already-seated opponent one damage counter, labeled with the commander's own name and the opponent's sleeve, when a commander arrives", async () => {
    await post("dmg-two-seats", seatJoined("dmg-two-seats", { initiator: { seatId: "dmg-a", playerName: "Alice" } }));
    const kenrith = commanderEntry("Kenrith", "https://example.com/kenrith.jpg");
    await post(
      "dmg-two-seats",
      seatJoined(
        "dmg-two-seats",
        { initiator: { seatId: "dmg-b", playerName: "Bob" } },
        { commanders: [kenrith], sleeveColor: "#123456" }
      )
    );

    const counters = damageCountersOf("dmg-two-seats");
    expect(counters).toHaveLength(1); // only Alice gets a counter — none for Bob's own commander

    const pos = commanderDamageCounterPosition(0, 0); // Alice is seat index 0
    expect(counters[0].x).toBe(pos.x);
    expect(counters[0].y).toBe(pos.y);
    expect(counters[0].isLocked).toBe(true);
    expect(counters[0].props.value).toBe(0);
    expect(counters[0].props.label).toBe("Kenrith");
    expect(counters[0].props.sleeveColor).toBe("#123456");
  });

  it("gives a partner-deck opponent two damage counters, each labeled with its own commander's name", async () => {
    await post("dmg-partners", seatJoined("dmg-partners", { initiator: { seatId: "dmg-p-a", playerName: "Alice" } }));
    const breya = commanderEntry("Breya", "https://example.com/breya.jpg");
    const silas = commanderEntry("Silas", "https://example.com/silas.jpg");
    await post(
      "dmg-partners",
      seatJoined("dmg-partners", { initiator: { seatId: "dmg-p-b", playerName: "Bob" } }, { commanders: [breya, silas] })
    );

    const counters = damageCountersOf("dmg-partners");
    expect(counters).toHaveLength(2);
    expect(counters.map((c) => c.props.label).sort()).toEqual(["Breya", "Silas"]);
  });

  it("gives a newly-joined seat a damage counter labeled with an opponent's commander that arrived before it joined", async () => {
    const kaalia = commanderEntry("Kaalia", "https://example.com/kaalia.jpg");
    await post(
      "dmg-retroactive",
      seatJoined("dmg-retroactive", { initiator: { seatId: "dmg-r-a", playerName: "Alice" } }, { commanders: [kaalia] })
    );
    await post("dmg-retroactive", seatJoined("dmg-retroactive", { initiator: { seatId: "dmg-r-b", playerName: "Bob" } }));

    const counters = damageCountersOf("dmg-retroactive");
    expect(counters).toHaveLength(1); // Bob gets one for Alice's commander; Alice gets none for Bob (no commanders)

    const pos = commanderDamageCounterPosition(1, 0); // Bob is seat index 1
    expect(counters[0].x).toBe(pos.x);
    expect(counters[0].y).toBe(pos.y);
    expect(counters[0].props.label).toBe("Kaalia");
  });

  it("two seats joining concurrently, each with a commander, don't double-mint each other's counter", async () => {
    const kenrith = commanderEntry("Kenrith", "https://example.com/kenrith.jpg");
    const kaalia = commanderEntry("Kaalia", "https://example.com/kaalia.jpg");
    await Promise.all([
      post("dmg-concurrent", seatJoined("dmg-concurrent", { initiator: { seatId: "dmg-c-a", playerName: "Alice" } }, { commanders: [kenrith] })),
      post("dmg-concurrent", seatJoined("dmg-concurrent", { initiator: { seatId: "dmg-c-b", playerName: "Bob" } }, { commanders: [kaalia] })),
    ]);

    const counters = damageCountersOf("dmg-concurrent");
    expect(counters).toHaveLength(2); // exactly one counter per seat, not doubled
    expect(counters.filter((c) => c.props.label === "Kenrith")).toHaveLength(1);
    expect(counters.filter((c) => c.props.label === "Kaalia")).toHaveLength(1);
  });

  it("a second seat.joined for an already-seated seat is a no-op — damage counters are minted once", async () => {
    const kaalia = commanderEntry("Kaalia", "https://example.com/kaalia.jpg");
    await post("dmg-dedup-a", seatJoined("dmg-dedup-a", { initiator: { seatId: "dmg-d-a", playerName: "Alice" } }));
    const event = seatJoined("dmg-dedup-a", { initiator: { seatId: "dmg-d-b", playerName: "Bob" } }, { commanders: [kaalia] });
    await post("dmg-dedup-a", event);
    await post("dmg-dedup-a", { ...event, id: randomUUID() });

    expect(damageCountersOf("dmg-dedup-a")).toHaveLength(1);
  });
});
