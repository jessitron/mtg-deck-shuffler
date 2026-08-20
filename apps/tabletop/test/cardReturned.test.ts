import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import type { Server } from "node:http";
import http from "node:http";
import { startServer } from "../src/server/server";
import { getOrCreateRoom } from "../src/server/rooms";
import { slugFor as rawSlugFor } from "./support/tableSlug";
import { slugifyTableName } from "../src/shared/slugify";

const slugFor = (tableName: string) => slugifyTableName(rawSlugFor(tableName));

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

function createFakeSpineServer() {
  const receivedRequests: unknown[] = [];
  let respondWithStatus = 201;
  const httpServer = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      receivedRequests.push(raw ? JSON.parse(raw) : undefined);
      res.writeHead(respondWithStatus, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: respondWithStatus < 400 }));
    });
  });
  return {
    receivedRequests,
    failWith(status: number): void {
      respondWithStatus = status;
    },
    listen(): Promise<number> {
      return new Promise((resolve) => {
        httpServer.listen(0, () => {
          const address = httpServer.address();
          resolve(typeof address === "object" && address ? address.port : 0);
        });
      });
    },
    close(): Promise<void> {
      return new Promise((resolve) => httpServer.close(() => resolve()));
    },
  };
}

function seedRoom(tableName: string, seatId: string, playerName: string): void {
  const entry = getOrCreateRoom(slugFor(tableName));
  entry.spineTableId = slugFor(tableName);
  entry.seats.set(seatId, {
    seatIndex: 0,
    playerName,
    graveyardCount: 0,
    stackCount: 0,
    commanderNames: [],
    damageCounterCount: 0,
  });
}

async function postReturn(tableName: string, body: unknown): Promise<Response> {
  return fetch(`http://localhost:${port}/api/tables/${slugFor(tableName)}/cards/return`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/tables/:tableName/cards/return", () => {
  const originalSpineUrl = process.env.SPINE_URL;
  let fakeSpine: ReturnType<typeof createFakeSpineServer> | undefined;

  afterEach(async () => {
    await fakeSpine?.close();
    fakeSpine = undefined;
    process.env.SPINE_URL = originalSpineUrl;
  });

  it("returns 200 and forwards to the Spine when it confirms", async () => {
    fakeSpine = createFakeSpineServer();
    const spinePort = await fakeSpine.listen();
    process.env.SPINE_URL = `http://localhost:${spinePort}`;

    seedRoom("Portal Test A", "seat-a", "Jess");
    const response = await postReturn("Portal Test A", {
      seatId: "seat-a",
      scryfallId: "11111111-1111-4111-8111-111111111111",
      gameCardIndex: 4,
    });

    expect(response.status).toBe(200);
    expect(fakeSpine.receivedRequests).toHaveLength(1);
    const body = fakeSpine.receivedRequests[0] as any;
    expect(body.initiator).toEqual({ seatId: "seat-a", playerName: "Jess" });
    expect(body.payload.gameCardIndex).toBe(4);
  });

  it("returns 502 when the Spine does not confirm", async () => {
    fakeSpine = createFakeSpineServer();
    fakeSpine.failWith(500);
    const spinePort = await fakeSpine.listen();
    process.env.SPINE_URL = `http://localhost:${spinePort}`;

    seedRoom("Portal Test B", "seat-b", "Jess");
    const response = await postReturn("Portal Test B", {
      seatId: "seat-b",
      scryfallId: "11111111-1111-4111-8111-111111111111",
      gameCardIndex: 2,
    });

    expect(response.status).toBe(502);
  });

  it("returns 400 when required fields are missing", async () => {
    seedRoom("Portal Test C", "seat-c", "Jess");
    const response = await postReturn("Portal Test C", { seatId: "seat-c" });
    expect(response.status).toBe(400);
  });

  it("returns 404 for a seat that hasn't joined this table", async () => {
    seedRoom("Portal Test D", "seat-d", "Jess");
    const response = await postReturn("Portal Test D", {
      seatId: "someone-else",
      scryfallId: "11111111-1111-4111-8111-111111111111",
      gameCardIndex: 1,
    });
    expect(response.status).toBe(404);
  });
});
