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
