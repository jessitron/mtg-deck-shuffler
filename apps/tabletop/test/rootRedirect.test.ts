import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { startServer } from "../src/server/server";

/**
 * The Tabletop has no landing page (LandingPage.tsx, deleted) — its front
 * door is the Shuffler. "/" redirects there; "/t/:tableSlug" is untouched
 * and still serves the SPA.
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

describe("the root route", () => {
  it("redirects to the Shuffler instead of rendering a landing page", async () => {
    const res = await fetch(`http://localhost:${port}/`, { redirect: "manual" });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(process.env.SHUFFLER_PUBLIC_URL || "https://mtg.jessitron.honeydemo.io");
  });

  it("leaves /t/:tableSlug alone — no redirect, unlike \"/\"", async () => {
    // Under vitest this runs against src/, not the built dist/client, so the
    // SPA fallback's sendFile 404s here (see verify.sh for the real, built
    // check) — what this test guards is that /t/* never redirects, whatever
    // its status.
    const res = await fetch(`http://localhost:${port}/t/root-redirect-check`, { redirect: "manual" });

    expect(res.status).not.toBe(302);
    expect(res.headers.get("location")).toBeNull();
  });
});
