# Tabletop

The shared canvas where play happens — Mural's freedom with Magic's physics. A synced
[tldraw](https://tldraw.dev) board (watermark worn happily) where cards arrive from the
Shuffler instead of the clipboard. See `SEAMAP.md` for where this ship is headed.

> **Prod serves plain http:// on purpose.** tldraw's license gate blanks an unlicensed
> canvas **5 seconds after load** — but only on HTTPS non-loopback origins, so the
> deployed table stays http-only and needs no key. See [Licensing](#licensing) before
> touching the ingress or anything TLS-shaped.

## Modes (fleet vocabulary — how the Shuffler relates to a table)

- **Solo (default)** — no table name. The Shuffler's Play/Discard copy the card image
  to the clipboard; play happens in Mural or wherever. The Tabletop is not involved.
- **At a table** — table name + player name entered on the Shuffler's Prep screen.
  Play/Discard send the card here (`POST /api/tables/:tableName/cards`); no clipboard.
- **Spectating** — open `/t/:tableName` with no Shuffler game at all. Full canvas
  access in v0 (there is no seat concept on the canvas; seats live in the arriving
  events).

## Routes

- `/` — no page of its own; redirects to the Shuffler (`SHUFFLER_PUBLIC_URL`), the
  fleet's front door.
- `/t/:tableName` — the table. Anyone with the URL joins; the same URL is the
  spectator-share link.
- `/connect/:roomSlug` — the tldraw sync websocket (accepts `traceparent` on the
  connection URL — propagation belongs to the connection request only).
- `POST /api/tables/:tableName/cards` — card arrival (**SCAFFOLDING**, see below).
- `/health` — liveness.

## SCAFFOLDING callouts

Two things here are deliberate stand-ins, marked in the source and easy to delete:

1. **The card-arrival endpoint** (`src/server/cardArrival.ts`). The Tabletop now also
   subscribes directly to the Spine's per-table SSE feed (`src/server/spineSubscriber.ts`,
   `spineEventDispatch.ts`) and routes `card.played` events arriving that way through the
   same logic (tabletop-spine-sse-subscriber ticket 01) — but the Shuffler's direct POST
   here still runs unmodified alongside it for now, purely additively; existing dedup makes
   a card arriving twice (once via POST, once via SSE) harmless. A later ticket
   (`.scratch/tabletop-spine-sse-subscriber/issues/02-shuffler-drops-direct-post.md`)
   deletes this endpoint once the subscriber is confirmed working end-to-end. The body this
   endpoint accepts is the real thing regardless: a full envelope
   (`contracts/envelope.v1.json`) carrying a card.played payload
   (`contracts/payloads/card.played.v1.json`), validated for real via ajv
   (`src/server/contractValidation.ts`, ticket 05 of tabletop-cards-come-and-go) —
   field-by-field comment block in `apps/shuffler/src/port-tabletop/types.ts`.
   `gameCardIndex` crosses the boundary freely now (`let-gamecardindex-out`,
   2026-08-10) — it only decodes to a card's rank in the public decklist, so the
   guard that used to reject it traded no real secrecy for a reasoning cost
   nobody's threat model needed. (Payload schemas now use `additionalProperties:
   true` — contracts/README.md — so an unrecognized field is a no-op rather than
   a rejection either way.)
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

## Licensing

tldraw 3.x let an unlicensed production deployment run with a watermark. **tldraw 4.0
changed that**: `LicenseProvider` now hides the editor entirely 5 seconds after load
when the license state is `unlicensed-production` — replacing the canvas with a hidden
`<div data-testid="tl-license-expired">`, i.e. a blank white page. Reload and you get
5 more seconds. (This repo is on 5.2.5.)

"Production" is decided **by URL alone**: any HTTPS request to a non-loopback hostname.
**That's why the deployed table is http-only** (decided 2026-08-09, after the evaluation
key expired with the hobby-license application stuck in tldraw's queue): plain http is
exempt from the gate, and this app has no auth to protect anyway. The main ingress
serves a single HTTP:80 listener; a companion ingress (`k8s/ingress-https-downgrade.yaml`)
owns the 443 listener and 301s https-first browsers down to http — Firefox and Chrome
try https:// for typed URLs, and with no 443 listener at all they showed "can't
connect" instead of falling back (`k8s/ingress.yaml` has the IngressGroup story).
`chooseLicenseKey`
(`src/client/chooseLicenseKey.ts`, unit-tested) withholds any baked key wherever the
gate can't fire, so a stale key in `.be` can't blank anything.

Two more consequences worth internalizing:

- **localhost is exempt from the *no-key* gate, but NOT from the *expired-key* gate.**
  `getLicenseState`'s dev exemption only covers missing/unparseable keys; a
  parseable-but-expired evaluation key returns `expired` unconditionally and blanks
  localhost too. So `chooseLicenseKey` passes an **empty string** as `licenseKey` on
  loopback hosts (and any other origin where the gate can't fire) — empty, not
  `undefined`, because an undefined prop makes
  `LicenseProvider` fall back to reading the env itself, and vite's `define` rewrote
  `import.meta.env.VITE_TLDRAW_LICENSE_KEY` to the key literal *inside tldraw's own
  bundled code*. Verified by `test/verification/verify-license-localhost.spec.ts`.
  Consequently `./run` and `./verify.sh` can never reproduce the *production* gate —
  local green tells you nothing about the deployed host.
- **A key is domain-bound.** A key that doesn't cover `table.jessitron.honeydemo.io`
  fails exactly like no key at all.
- **Expiry trips up to a day early.** tldraw parses the key's expiry (`2026-08-10`) as
  UTC midnight, then rebuilds it from *local* date parts — west of UTC that lands on the
  previous local day, and evaluation licenses have no grace period.

No key is needed while prod is http-only. If a key exists anyway (or the day comes to
put the table back on https):

- Put `export TLDRAW_LICENSE_KEY=...` in the **repo-root `.be`** — *not* in
  `apps/tabletop/.env`, which is committed to a public repo. (The key itself isn't a
  secret: it's domain-bound and shipped to browsers by design. It's still Jess's
  license, so it stays out of git.)
- `vite.config.ts` bakes it into the client bundle via `define`; `Dockerfile` takes it
  as a build ARG; `deploy.sh` passes `--build-arg` if set. Harmless on http:
  `chooseLicenseKey` withholds it at runtime.
- `node test/verification/check-deployed-canvas.mjs [baseUrl]` loads a table, waits out
  the 5s gate, and fails if the canvas vanished. `deploy.sh` runs it after rollout —
  on http it proves the exemption actually holds on the deployed host.

Free hobby license (non-commercial): <https://tldraw.dev/get-a-license/hobby>

## Style

Square corners except physically round things — and Scryfall card scans *are*
physically round-cornered, so image-shape cards are style-legal. Tablet-friendly
targets. The "made with tldraw" watermark stays.
