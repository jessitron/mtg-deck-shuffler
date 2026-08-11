import React from "react";
import { TablePage } from "./TablePage";

export function App() {
  const path = window.location.pathname;
  const tableMatch = path.match(/^\/t\/([^/]+)$/);
  if (tableMatch) {
    return <TablePage tableSlug={decodeURIComponent(tableMatch[1])} />;
  }
  return null;
}
