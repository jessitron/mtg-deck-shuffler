import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { startServer } from "../src/server/server";
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
  return new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("POST /api/tables/:tableName/diagnostic", () => {
  it("responds ok and reports the diff is not yet implemented", async () => {
    const response = await fetch(`http://localhost:${port}/api/tables/${slugFor("diag-table")}/diagnostic`, {
      method: "POST",
    });

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ok: true, implemented: false });
  });

  it("accepts an optional free-text message describing what's wrong", async () => {
    const response = await fetch(`http://localhost:${port}/api/tables/${slugFor("diag-table")}/diagnostic`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "the graveyard is empty but I have three cards in it" }),
    });

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ok: true, implemented: false });
  });

  it("rejects a blank table name", async () => {
    const response = await fetch(`http://localhost:${port}/api/tables/%20/diagnostic`, {
      method: "POST",
    });

    expect(response.status).toBe(400);
  });
});
