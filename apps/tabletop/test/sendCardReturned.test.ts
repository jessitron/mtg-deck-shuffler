import { describe, it, expect, afterEach } from "vitest";
import http from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { sendCardReturnedToSpineBestEffort, CardReturnedParams } from "../src/server/sendCardReturned";

const CONTRACTS_ROOT = path.join(process.cwd(), "..", "..", "contracts");
function loadSchema(relativePath: string): object {
  return JSON.parse(readFileSync(path.join(CONTRACTS_ROOT, relativePath), "utf8"));
}
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateEnvelope = ajv.compile(loadSchema("envelope.v1.json"));
const validateCardReturnedPayload = ajv.compile(loadSchema("payloads/card.returned.v1.json"));

/** A minimal fake Spine standing in for `POST /tables/:tableId/events`. */
function createFakeSpineServer() {
  const receivedRequests: { path: string; body: unknown }[] = [];
  let respondWithStatus = 201;

  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      receivedRequests.push({ path: req.url ?? "", body: raw ? JSON.parse(raw) : undefined });
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
        server.listen(0, () => {
          const address = server.address();
          resolve(typeof address === "object" && address ? address.port : 0);
        });
      });
    },
    close(): Promise<void> {
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
}

const baseParams: CardReturnedParams = {
  tableId: "friday-night-abc12345",
  seatId: "seat-0000001",
  playerName: "Jess",
  scryfallId: "11111111-1111-4111-8111-111111111111",
  gameCardIndex: 3,
};

describe("sendCardReturnedToSpineBestEffort", () => {
  let fakeServer: ReturnType<typeof createFakeSpineServer> | undefined;

  afterEach(async () => {
    await fakeServer?.close();
    fakeServer = undefined;
  });

  it("POSTs a card.returned.v1 envelope to the Spine's generic events endpoint", async () => {
    fakeServer = createFakeSpineServer();
    const port = await fakeServer.listen();

    await sendCardReturnedToSpineBestEffort(baseParams, `http://localhost:${port}`);

    expect(fakeServer.receivedRequests).toHaveLength(1);
    const { path, body } = fakeServer.receivedRequests[0] as { path: string; body: any };
    expect(path).toBe(`/tables/${baseParams.tableId}/events`);
    expect(body.name).toBe("card.returned");
    expect(body.tableId).toBe(baseParams.tableId);
    expect(body.occurredIn).toBe("tabletop");
    expect(body.significance).toBe("domain");
    expect(body.schemaVersion).toBe(1);
    expect(body.initiator).toEqual({ seatId: baseParams.seatId, playerName: baseParams.playerName });
    expect(body.payload).toEqual({
      card: { scryfallId: baseParams.scryfallId },
      gameCardIndex: baseParams.gameCardIndex,
      seat: baseParams.seatId,
    });
    expect(typeof body.id).toBe("string");

    expect(validateEnvelope(body)).toBe(true);
    expect(validateCardReturnedPayload(body.payload)).toBe(true);
  });

  it("carries an optional fromZone when given", async () => {
    fakeServer = createFakeSpineServer();
    const port = await fakeServer.listen();

    await sendCardReturnedToSpineBestEffort({ ...baseParams, fromZone: "battlefield" }, `http://localhost:${port}`);

    const { body } = fakeServer.receivedRequests[0] as { body: any };
    expect(body.payload.fromZone).toBe("battlefield");
  });

  it("never throws when the Spine is down — best-effort", async () => {
    await expect(sendCardReturnedToSpineBestEffort(baseParams, "http://localhost:1")).resolves.toBeUndefined();
  });

  it("never throws when the Spine rejects the event — best-effort", async () => {
    fakeServer = createFakeSpineServer();
    fakeServer.failWith(500);
    const port = await fakeServer.listen();

    await expect(sendCardReturnedToSpineBestEffort(baseParams, `http://localhost:${port}`)).resolves.toBeUndefined();
  });
});
