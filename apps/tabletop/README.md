# Tabletop

The shared canvas where play happens — Mural's freedom with Magic's physics. A synced
[tldraw](https://tldraw.dev) board (watermark worn happily) where cards arrive from the
Shuffler instead of the clipboard. See `SEAMAP.md` for where this ship is headed.

## Modes (fleet vocabulary — how the Shuffler relates to a table)

- **Solo (default)** — no table name. The Shuffler's Play/Discard copy the card image
  to the clipboard; play happens in Mural or wherever. The Tabletop is not involved.
- **At a table** — table name + player name entered on the Shuffler's Prep screen.
  Play/Discard send the card here (`POST /api/tables/:tableName/cards`); no clipboard.
- **Spectating** — open `/t/:tableName` with no Shuffler game at all. Full canvas
  access in v0 (there is no seat concept on the canvas; seats live in the arriving
  events).

## Routes

- `/` — landing page: type a table name, go to its board.
- `/t/:tableName` — the table. Anyone with the URL joins; the same URL is the
  spectator-share link.
- `/connect/:roomSlug` — the tldraw sync websocket (accepts `traceparent` on the
  connection URL — propagation belongs to the connection request only).
- `POST /api/tables/:tableName/cards` — card arrival (**SCAFFOLDING**, see below).
- `/health` — liveness.

## SCAFFOLDING callouts

Two things here are deliberate stand-ins, marked in the source and easy to delete:

1. **The card-arrival endpoint** (`src/server/cardArrival.ts`). Future: the Shuffler
   emits `card.played` to the Spine's event log and the Tabletop subscribes to the
   table's public feed; JSON-Schema contract validation (`contracts/`) lands on that
   subscription. Until then the Shuffler POSTs here directly, with hand-rolled checks
   at the `// JES-128` markers. The payload is F0's frozen envelope-lite subset of the
   contract — field-by-field comment block in
   `apps/shuffler/src/port-tabletop/types.ts`. `gameCardIndex` never crosses the
   boundary (decodable secret); this endpoint rejects it loudly.
2. **The in-memory room registry** (`src/server/rooms.ts`). Name-only (no table ids;
   the Spine absorbs table identity later). Rooms are **in-memory only** — a redeploy
   wipes the board. Accepted for v0; durable reconstruction is a filed buoy.

## Arrival layout (v0-minimal geography)

A fixed **Stack area**, plus a **battlefield row per seat** allocated in first-play
order — keyed by `seatId`, labeled with the player name — each row ending in a
**Graveyard spot** and a smaller **Exile spot**. The Shuffler picks the `zoneHint`
(it knows land vs nonland); the Tabletop stays meaning-free and honors coordinates.
Dedup: on event `id` (retried request) and on `instanceId` already present (a second
arrival of one instance is a physical no-op).

## Develop

```bash
npm install        # from the repo root (npm workspaces)
./run              # dev server on PORT (default 5180); does NOT source .be — see AGENT-NOTES
npx vitest run     # unit tests (Vitest here; the Shuffler stays Jest)
./verify.sh        # build + real server on 5183 + Playwright (two-context sync, card arrival)
```

Telemetry from the first commit: server spans via `src/server/tracing.ts`
(`node --import`), browser spans via the `src/client/observability/` wrapper (standard
OTel web SDK, no Honeycomb specifics). Locally both go to Honeycomb env `local`
(datasets `mtg-tabletop` / `mtg-tabletop-web`); source repo-root `.be` **before**
`.env` or export silently 401s. `otel-collector-local.yaml` runs a local collector if
you want the browser path to match prod.

## Deploy

`./deploy.sh` — mirrors the Shuffler's: docker build (repo-root context), push to ECR,
`kubectl apply k8s/` on the orion cluster. Serves at
**https://table.jessitron.honeydemo.io** (shared ALB group `only-one-alb-please`).
Browser spans go same-origin to `/v1/traces`, routed by the ALB to a minimal dedicated
OTel Collector (`k8s/collector.yaml`) — no API key in the page, no CORS drama. The
Shuffler POSTs in-cluster via `TABLETOP_URL=http://mtg-tabletop-service`.

One replica, `Recreate` strategy: the rooms are in-memory, a redeploy wipes the board.

## Style

Square corners except physically round things — and Scryfall card scans *are*
physically round-cornered, so image-shape cards are style-legal. Tablet-friendly
targets. The "made with tldraw" watermark stays.
