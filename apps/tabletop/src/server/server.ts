import express from "express";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { trace, context, propagation, SpanKind } from "@opentelemetry/api";
import { getOrCreateRoom } from "./rooms.js";
import { slugifyTableName } from "../shared/slugify.js";
import { handleCardArrival } from "./cardArrival.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// dist/server/server.js → dist/client is a sibling
const CLIENT_DIR = path.resolve(__dirname, "../client");

const tracer = trace.getTracer("mtg-tabletop");

export function createApp() {
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

  // The card-arrival seam (A5) — SCAFFOLDING the Spine absorbs; see cardArrival.ts
  app.post("/api/tables/:tableName/cards", handleCardArrival);

  // Static app (Vite build output)
  app.use(express.static(CLIENT_DIR));

  // SPA fallback: /t/* renders the same app
  app.get(["/", "/t/:tableSlug"], (_req, res) => {
    res.sendFile(path.join(CLIENT_DIR, "index.html"));
  });

  return app;
}

/**
 * Start the HTTP server with the tldraw-sync websocket upgrade at
 * /connect/:roomSlug. Trace context is accepted on the connection URL only
 * (`?traceparent=` — propagation belongs to the connection request; nothing
 * durable carries trace context).
 */
export function startServer(port: number): Promise<http.Server> {
  const app = createApp();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    const match = url.pathname.match(/^\/connect\/([^/]+)$/);
    const slug = match ? slugifyTableName(decodeURIComponent(match[1])) : "";
    if (!slug) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    // Parent the connection span on the client's page span, if it sent one.
    const traceparent = url.searchParams.get("traceparent");
    const parentContext = traceparent ? propagation.extract(context.active(), { traceparent }) : context.active();

    context.with(parentContext, () => {
      tracer.startActiveSpan("ws connect", { kind: SpanKind.SERVER, attributes: { "table.name": slug } }, (span) => {
        try {
          const sessionId = url.searchParams.get("sessionId") ?? `anon-${Math.random().toString(36).slice(2)}`;
          const entry = getOrCreateRoom(slug);
          span.setAttribute("room.sessions_before", entry.room.getNumActiveSessions());
          wss.handleUpgrade(request, socket, head, (ws) => {
            entry.room.handleSocketConnect({ sessionId, socket: ws });
          });
        } finally {
          span.end();
        }
      });
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

const PORT = Number(process.env.PORT ?? 5180);

// Only listen when run directly (tests import startServer instead)
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  startServer(PORT).then(() => {
    console.log(`Tabletop server running on http://localhost:${PORT}`);
  });
}
