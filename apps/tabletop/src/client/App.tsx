import React from "react";
import { LandingPage } from "./LandingPage";
import { TablePage } from "./TablePage";

/**
 * Route-lite: "/" is the landing page (enter a table name); "/t/:tableName" is
 * the table itself. No router library — two pages don't need one.
 */
export function App() {
  const path = window.location.pathname;
  const tableMatch = path.match(/^\/t\/([^/]+)$/);
  if (tableMatch) {
    return <TablePage tableSlug={decodeURIComponent(tableMatch[1])} />;
  }
  return <LandingPage />;
}
