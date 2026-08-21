import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { startServer } from "../src/server/server";

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

describe("the root route", () => {
  it("redirects to the Shuffler instead of rendering a landing page", async () => {
    const res = await fetch(`http://localhost:${port}/`, { redirect: "manual" });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(process.env.SHUFFLER_PUBLIC_URL || "https://mtg.jessitron.honeydemo.io");
  });

  it("leaves /t/:tableSlug alone — no redirect, unlike \"/\"", async () => {
    const res = await fetch(`http://localhost:${port}/t/root-redirect-check`, { redirect: "manual" });

    expect(res.status).not.toBe(302);
    expect(res.headers.get("location")).toBeNull();
  });
});
