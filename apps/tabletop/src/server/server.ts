import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// dist/server/server.js → dist/client is a sibling
const CLIENT_DIR = path.resolve(__dirname, "../client");

export function createServer() {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Where the browser should send its spans (decision: an OTel Collector, not
  // a proxy endpoint here and not a key baked into the page).
  // - BROWSER_OTLP_TRACES_URL: the collector's OTLP-http traces endpoint
  //   (must allow CORS for this origin).
  // - Local-only fallback: with ALLOW_BROWSER_DIRECT_HONEYCOMB=true (set in
  //   apps/tabletop/.env, never in k8s), the page exports straight to
  //   Honeycomb using the server's key — acceptable exposure for env `local`.
  app.get("/otel-config.json", (_req, res) => {
    const collectorUrl = process.env.BROWSER_OTLP_TRACES_URL;
    if (collectorUrl) {
      res.json({ tracesUrl: collectorUrl });
      return;
    }
    if (process.env.ALLOW_BROWSER_DIRECT_HONEYCOMB === "true" && process.env.HONEYCOMB_API_KEY) {
      res.json({
        tracesUrl: "https://api.honeycomb.io/v1/traces",
        headers: { "x-honeycomb-team": process.env.HONEYCOMB_API_KEY },
      });
      return;
    }
    res.json({ tracesUrl: null });
  });

  // Static app (Vite build output)
  app.use(express.static(CLIENT_DIR));

  // SPA fallback: /t/* renders the same app
  app.get(["/", "/t/:tableSlug"], (_req, res) => {
    res.sendFile(path.join(CLIENT_DIR, "index.html"));
  });

  return app;
}

const PORT = Number(process.env.PORT ?? 5180);

// Only listen when run directly (tests import createServer instead)
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const app = createServer();
  app.listen(PORT, () => {
    console.log(`Tabletop server running on http://localhost:${PORT}`);
  });
}
