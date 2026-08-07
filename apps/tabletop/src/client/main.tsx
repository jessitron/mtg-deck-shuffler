import React from "react";
import { createRoot } from "react-dom/client";
// The fleet's shared palette — one dictionary, both ships. Imported here rather
// than in a page component so every Tabletop surface has the tokens, and so the
// Shuffler and the Tabletop are loading the same bytes. Orbitron itself is a
// <link> in index.html; see packages/design-tokens/tokens.css.
import "@fleet/design-tokens/tokens.css";
import { App } from "./App";
import { initTracing } from "./observability";

// Observability is mandatory, from the first commit: initialize tracing BEFORE
// mounting the app. If no destination is configured, tracing quietly stays off.
initTracing().finally(() => {
  const root = createRoot(document.getElementById("root")!);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
