import React from "react";
import { TablePage } from "./TablePage";

/**
 * Route-lite: "/t/:tableName" is the only page this bundle ever serves. The
 * Tabletop has no landing page of its own — the server redirects "/" to the
 * Shuffler before any client JS loads (see src/server/server.ts), so this
 * component is never mounted for anything but a table URL.
 */
export function App() {
  const path = window.location.pathname;
  const tableMatch = path.match(/^\/t\/([^/]+)$/);
  if (tableMatch) {
    return <TablePage tableSlug={decodeURIComponent(tableMatch[1])} />;
  }
  return null;
}
