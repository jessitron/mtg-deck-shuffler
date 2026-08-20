import http from "node:http";

/**
 * A minimal stand-in for the Spine's generic events endpoint, listening on the default
 * `SPINE_URL` port (4600) for the duration of a Playwright run. `verify.sh` starts the
 * Tabletop server with no live Spine to talk to; without this, any send-then-commit flow
 * that awaits a real 2xx (the library-portal swallow, ticket 12) can never complete in
 * verification. Accepts every `POST /tables/:tableId/events` with 201 — good enough for
 * specs that only need "the Spine confirmed," not specs that need to inspect what was sent.
 */
let server: http.Server | undefined;

export function startFakeSpine(port = 4600): Promise<void> {
  server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      res.writeHead(201, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  return new Promise((resolve, reject) => {
    server!.once("error", reject);
    server!.listen(port, resolve);
  });
}

export function stopFakeSpine(): Promise<void> {
  return new Promise((resolve) => {
    if (!server) return resolve();
    server.close(() => resolve());
  });
}
