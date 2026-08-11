import React from "react";
import { createRoot } from "react-dom/client";
import "@fleet/design-tokens/tokens.css";
import { App } from "./App";
import { initTracing } from "./observability";

initTracing().finally(() => {
  const root = createRoot(document.getElementById("root")!);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
