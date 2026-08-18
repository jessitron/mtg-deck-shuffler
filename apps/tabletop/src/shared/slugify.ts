export function slugifyTableName(tableName: string): string {
  return tableName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const TABLE_SLUG_ID_SUFFIX = /-([0-9a-f]{8})$/;

/**
 * Strips the `-<8-hex-id>` suffix back off a table slug, for telemetry: `table.name`
 * is spelled identically on the Shuffler and stamped there with the bare human name
 * (see owners/fleet-is-observable), so a Tabletop span must stamp the same bare name —
 * not the full slug (`<name>-<id>`, the Spine's real table id and this table's URL/room
 * key — see services/spine/lib/table_slug.rb) — or a filter that follows a table across
 * ships silently breaks.
 */
export function tableNameFromSlug(tableSlug: string): string {
  const match = TABLE_SLUG_ID_SUFFIX.exec(tableSlug);
  return match ? tableSlug.slice(0, -(match[1].length + 1)) : tableSlug;
}
