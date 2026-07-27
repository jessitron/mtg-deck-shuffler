import React from "react";

/**
 * The table itself. The synced tldraw canvas lands in A3/A4; this placeholder
 * proves the route.
 */
export function TablePage({ tableSlug }: { tableSlug: string }) {
  return <div data-testid="table-page">Table: {tableSlug} (canvas coming)</div>;
}
