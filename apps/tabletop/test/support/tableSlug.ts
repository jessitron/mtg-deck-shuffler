import { createHash } from "node:crypto";

/**
 * Tests key rooms by a plain human-readable string (e.g. "seat-basic"), but the real
 * table id/URL/room-key is `<name>-<8-hex>` (the Spine's real primary key — see
 * services/spine/lib/table_slug.rb — which the envelope's `tableId` carries verbatim).
 * This derives a deterministic fake id from that string so every test file can keep
 * using its short table names while still exercising the real slug format end to end.
 */
export function slugFor(tableName: string): string {
  const id = createHash("sha256").update(tableName).digest("hex").slice(0, 8);
  return `${tableName}-${id}`;
}
