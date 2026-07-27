# PLAN — Tabletop v0 (JES-127)

Produced by a planning agent 2026-07-27, after reading the fleet docs, the Shuffler's
Prep/Play code paths, OTel setup, and the post-restructure Docker/deploy story.
Status: **proposed, awaiting Jess's answers to the open questions at the bottom.**

## Technology choices

| Decision | Choice | Rationale |
|---|---|---|
| Canvas | `tldraw` (v3.x) React component | mandated; watermark worn happily |
| Sync | `@tldraw/sync` (`useSync`) client + self-hosted `@tldraw/sync-core` (`TLSocketRoom`) server on Node + `ws` | hosted demo server can't take server-side shape injection or our OTel; self-hosting is the documented production path and keeps the room registry in our process |
| Server frame | One Node/Express process: Vite-built static app, `/connect/:roomId` websocket, `POST /api/tables/:tableName/cards`, `/health` | one container, one deployment; sync server stays deliberately dumb — replicates presentation and injects shapes, nothing else |
| Build | Vite + React + TypeScript | standard for a tldraw app; Express+EJS doesn't fit a React canvas |
| Card rendering v0 | tldraw image shape + `TLImageAsset`, `src` = stored Scryfall URL (current face). No custom CardShape yet (Mountain 2). `shape.meta` carries `{ eventId, scryfallId, cardName, traceparent }` | Scryfall scans have round corners baked in; page chrome stays square |
| Room registry | in-memory `Map<roomSlug, TLSocketRoom>`, lazily created. **Marked SCAFFOLDING** — the Spine absorbs table identity later | |
| Event id | sender (Shuffler) mints GUID `id`; tabletop dedups on it. `// JES-128: validate against contracts/ schema here` marker at ingestion | matches the JES-128 envelope decision |
| Browser OTel | mirror the Shuffler's approach; service names `mtg-tabletop` (server) / `mtg-tabletop-web` (browser) — see open question 2 | |
| Unit tests | Vitest (native to Vite); Shuffler stays Jest — see open question 7 | |

## Part A — apps/tabletop (parallel-safe: touches only apps/tabletop/ + root scripts)

- **A1. Scaffold the workspace** — package.json (deps: tldraw, @tldraw/sync, @tldraw/sync-core, express, ws, react, OTel), tsconfig, vite.config, src/client + src/server. Root pass-through scripts. *Test: build compiles, vitest smoke.*
- **A2. OTel from the first commit** — `src/server/tracing.ts` modeled on the Shuffler's (ESM register hook, OTLP http, kube-probe-aware sampler, `node --import`); browser tracing before mount with `table.name` resource attr; `run` script + `.env` pattern (`.be` before `.env` — same trap). *Test: spans visible in Honeycomb env `local`.*
- **A3. Sync server + room registry (scaffolding)** — `rooms.ts` Map of slug → TLSocketRoom created on first connect; Express + ws upgrade at `/connect/:roomSlug`; SPA fallback for `/t/*`; `/health`. One shared table-name slugify function. Rooms ephemeral for v0. WS connect span with `table.name`; accept `traceparent` as ws query param so the browser join span parents it. *Test: vitest, real server on ephemeral port, two ws clients in one room — no mocks needed, it's our own process.*
- **A4. The `/t/:tableName` page** — `/` = "type a table name" landing; `/t/:tableName` renders `<Tldraw>` with `useSync`. Spectators come free: anyone with the URL joins — no seat concept here. Square corners, tablet-friendly targets, tldraw's own UI as-is for v0. *Test: Playwright, two browser contexts, draw in one, assert in the other; a tabletop `verify.sh` mirroring the Shuffler's.*
- **A5. Card-arrival API — the seam the Spine absorbs** — `POST /api/tables/:tableName/cards` `{ id: guid, cardName, scryfallId, imageUrl, whoPlayed?, zoneHint?: "stack"|"battlefield"|"graveyard" }`. Dedup on `id` (per-room seen-set); create image asset+shape via server-side `room.updateStore`, staggered drop zone; stamp `traceparent`+`eventId` into `shape.meta`; client store-listener emits a linked "card arrived on canvas" browser span — closes the trace loop across the websocket. *Test: vitest POST + duplicate-id elision; Playwright card-visible.*
- **A6. Docker, k8s, deploy** — Dockerfile with **repo root as build context** (per the Shuffler's pattern); `k8s/` deployment (`mtg-tabletop`, key from existing `mtg-deck-shuffler-secret`), service, ingress on ALB group `only-one-alb-please` with own hostname (open question 1). Verify ALB idle timeout vs tldraw ping. *Test: container boot check; prod spans after deploy.*
- **A7. Docs** — apps/tabletop/SEAMAP.md progress, README with SCAFFOLDING callout, root CLAUDE.md layout, notes/AGENT-NOTES.md gotchas.

## Part B — Shuffler integration (serial after A; touches apps/shuffler/)

- **B0. Feature-owner consultation is mandatory** — library-search / two-faced-cards / animations `-context` then `-review` then `-update`. Known interaction points: the Play button's `htmx:beforeRequest` clipboard hook in `game.js` (animations), a new Discard `WhatHappened` verb (animations), sending the **current face's** image URL (two-faced).
- **B1. Prep screen "join a table"** — optional input on `prepare.ejs`; posts with `/start-game`; lands as optional `tableName` on `PersistedGameState` — per the versioning doc's optional-field-with-graceful-fallback exception, **no version bump** (absent = solo mode). `/restart-game` carries it forward. Render the table name on the game page with a link (open question 8). *Test: unit + Playwright.*
- **B2. A Tabletop port (fakes, not mocks)** — `src/port-tabletop/`: `TabletopPort { sendCardToTable(...) }`, `HttpTabletopGateway` (fetch to `TABLETOP_URL`; auto-instrumented so trace context propagates free), `FakeTabletopGateway`. Shuffler mints the GUID here.
- **B3. Play sends the card** — in `POST /play-card` after `game.playCard()`: if `tableName`, resolve `getCardImageUrl(card, "large", currentFace)`, call the port with zone hint (land → battlefield, nonland → stack, from `CardDefinition.cardTypes`). **Play succeeds even if the send fails** (open question 3) — warning on span + soft UI note. Client: skip the clipboard copy in table mode, show "Sent to table"; clipboard untouched in solo mode. *Test: fake-based units; Playwright two-app flow (verify.sh orchestrates both apps).*
- **B4. Discard** — new button in the hand modal + `POST /discard-card/...`; distinct `WhatHappened` verb ("discarded"); card still lands in `TableLocation` (graveyard is table geography, not Shuffler state); zone hint `"graveyard"`. Solo-mode behavior: open question 5.
- **B5. Docs + owners** — CLAUDE.md (routes, TABLETOP_URL), GLOSSARY, seamaps, feature-owner `-update`s.

## Observability plan

One trace per played card: browser click → `/play-card` span → POST to tabletop (auto-propagated) → ingestion span (`table.name`, `card.name`, `event.id`, `zone.hint`) → `traceparent` in `shape.meta` → linked "card arrived" browser span on every connected canvas. WS connect spans; room lifecycle events. Same `.be`/`.env`/secret plumbing as the Shuffler.

## Risks

1. `room.updateStore` (server-side shape injection) is a young API — verify against the pinned tldraw version first thing in A1; fallback is a connected "server client." Pin tldraw exactly.
2. ALB + websockets: idle timeout vs tldraw keepalive; second host rule on the shared ALB group.
3. Ephemeral rooms: a redeploy wipes the board (open question 6; PVC snapshot is a cheap upgrade).
4. The card API slightly violates "deliberately dumb" — contained by shaping it as event ingestion, SCAFFOLDING marks, JES-128 markers.
5. Bypassing the game.js clipboard hook touches exactly what the animations owner guards — that review is not optional.
6. Part B verification needs both apps running — health-check waits like the existing verify.sh.

## Open questions for Jess

1. Tabletop hostname: `table.jessitron.honeydemo.io`? (vs a path under `mtg.`, which complicates SPA + ws routing)
2. Browser OTel: copy `hny.js`, or take `@honeycombio/opentelemetry-web` as a real npm dep now that there's a bundler? Separate dataset `mtg-tabletop-web` or reuse?
3. Send-to-table failure: card plays anyway with a warning (recommended), or block the play?
4. Where do arriving cards land — fixed staggered drop zone (v0 pick), or per-player rows?
5. Does Discard exist in solo/clipboard mode too?
6. Rooms lost on redeploy: acceptable for v0?
7. Vitest for the tabletop, or Jest fleet-wide?
8. Render `tableName` on the game page with a link to the table? (assumed yes — spectator sharing)

## Critical files

- `apps/tabletop/` (new: src/server/server.ts, src/server/rooms.ts, src/client/, Dockerfile, k8s/)
- `apps/shuffler/src/app.ts` (`/play-card` ~line 1230; new `/discard-card`; `/start-game` ~line 406)
- `apps/shuffler/public/game.js` (the play-button clipboard hook)
- `apps/shuffler/views/prepare.ejs` (the join-a-table input)
- `apps/shuffler/src/tracing.ts` (OTel template the tabletop mirrors)
