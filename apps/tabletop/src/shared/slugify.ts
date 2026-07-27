/**
 * The one shared slugify: a table name becomes a room slug. Client links and
 * server registry must agree, so this is the only implementation — imported by
 * both (src/client and src/server both include src/shared).
 */
export function slugifyTableName(tableName: string): string {
  return tableName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
