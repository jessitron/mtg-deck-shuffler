import { Request, Response } from "express";
import { slugifyTableName } from "../shared/slugify.js";
import { applyCardArrival } from "./cardArrival.js";
import { MAX_SEATS } from "./cardLayout.js";

/** Express route pattern for the test-only seed seam — register this, don't hand-type it. */
export const TEST_CARD_SEED_ROUTE = "/test/tables/:tableName/cards";

/** Builds the concrete URL a test/spec posts a card.played envelope to. */
export function testCardSeedUrl(tableSlug: string): string {
  return `/test/tables/${tableSlug}/cards`;
}

/**
 * Test-only seam: verification specs and cardArrival.test.ts drive a server spawned as
 * its own process, so they need HTTP to seed a card onto a table without a live Spine.
 * Only mounted when ENABLE_TEST_SEED_ROUTE=true (set by verify.sh and cardArrival.test.ts) —
 * never in production, where card.played only arrives via the Spine SSE subscription.
 */
export async function handleTestCardSeed(req: Request, res: Response): Promise<void> {
  const tableName = slugifyTableName(req.params.tableName ?? "");
  if (!tableName) {
    res.status(400).json({ error: "table name required" });
    return;
  }

  const outcome = await applyCardArrival(tableName, req.body);
  switch (outcome.status) {
    case "invalid":
      res.status(400).json({ error: outcome.error });
      return;
    case "placed":
      res.status(201).json({ ok: true });
      return;
    case "deduped":
      res.status(200).json({ ok: true, deduped: true });
      return;
    case "rejected":
      res.status(409).json({ error: `table is full: ${MAX_SEATS} seats` });
      return;
  }
}
