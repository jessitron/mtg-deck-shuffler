import React from "react";
import { createRoot } from "react-dom/client";
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
