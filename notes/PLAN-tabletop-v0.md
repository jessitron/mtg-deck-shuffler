# PLAN — Tabletop v0 (JES-127)

Planning agent + Jess, two rounds (round-1 commentary is in git history at `56fe5b3`).
Status: **v2 — Jess's round-1 answers folded in; 5 new JESS TODOs at the bottom.**

## Modes (a thing we hadn't named — now named)

- **Solo (default)** — no table name. Play/Discard copy the card image to the
  clipboard; play in Mural or wherever. Today's behavior, unchanged.
- **At a table** — table name + player name entered on the Prep screen. Play/Discard
  send the card to `/t/:tableName`; no clipboard.
- **Spectating** — open `/t/:tableName` with no Shuffler game at all. Full canvas
  access in v0 (no seat concept).

Mirror this into `apps/tabletop/README.md`, `notes/GLOSSARY.md`, and prep-screen copy.

## Technology choices

| Decision | Choice | Rationale |
|---|---|---|
| Canvas | `tldraw` (v3.x) React component | mandated; watermark worn happily |
| Sync | `@tldraw/sync` (`useSync`) client + self-hosted `@tldraw/sync-core` (`TLSocketRoom`) server on Node + `ws` | hosted demo server can't take server-side shape injection or our OTel; self-hosting is the documented production path |
| Server frame | One Node/Express process: Vite-built static app, `/connect/:roomId` websocket, `POST /api/tables/:tableName/cards`, OTLP proxy, `/health` | one container; sync server stays deliberately dumb |
| Build | Vite + React + TypeScript | standard for a tldraw app |
| Card rendering v0 | tldraw image shape + `TLImageAsset`, `src` = Scryfall URL of the **played face**. `shape.meta` = `{ instanceId, scryfallId, cardName }` — **no traceparent**: traces follow requests until fulfilled; cards persist. Correlation is by `card.instance_id` span attribute | Scryfall scans' round corners are physically-round-things, style-legal. Sleeves/rectangular frames arrive naturally with the custom CardShape (Mountain 2) — buoy, don't accelerate |
| Room registry | in-memory `Map<slug(tableName), { tableId, room: TLSocketRoom }>` — a tldraw room corresponds to a Table in the core domain: **name is the alias, id is the identity** (contract Decision 1). **SCAFFOLDING**: the Spine absorbs table identity later | interim-GUID question: JESS TODO 1 |
| Dedup | on event `id` (a retried request) **and** on `instanceId` already on the table (a retried play — one instance exists once, so a second arrival is a physical no-op) | Jess: covers the worked-but-failed-to-ack case |
| Browser OTel | **standard OpenTelemetry web SDK**, nothing Honeycomb-specific, wrapped in our own module `src/client/observability/` (`initTracing`, `inSpan`, `setGlobalAttrs`); spans proxied through our server (JESS TODO 5); dataset `mtg-tabletop-web` | Jess: standard library + a wrapper module of our own, useful later |
| Unit tests | Vitest for the tabletop; Shuffler stays Jest | Jess: stick with what works per component, no coupling |

## F — fleet-level steps (first: they unblock A ∥ B parallelism)

- **F0. Freeze the card-arrival payload.** Envelope-lite subset of the contract:
  `{ id, name: "card.played", occurredAt, initiator, card: { scryfallId, instanceId }, face, zoneHint: "stack"|"battlefield"|"graveyard", imageUrl, cardName }`
  (`imageUrl`/`cardName` are blessed scaffolding conveniences, not contract).
  **`gameCardIndex` is forbidden beyond the Shuffler's boundary** — it's the card's
  alphabetical rank in a known decklist, a decodable secret. Record the payload as a
  comment block in `apps/shuffler/src/port-tabletop/types.ts` and in the tabletop
  route, both with `// JES-128` markers; a unit test asserts the fake gateway never
  receives an index.
- **F1. Promote the two-faced-cards owner to fleet scope** (before A5, which renders
  a chosen face). Jess: the complication affects the Spine's events and the Tabletop,
  not just the Shuffler. Restructure `notes/features/two-faced-cards/`: a top-level
  charge ("a card has faces; face is state, not identity") with notes per affected
  component — Shuffler (existing content: `currentFace`, flip), Tabletop (arrival
  renders the played face; future flip gesture), Contract (`face` beside
  `card: { scryfallId, instanceId }`). Update the three `.claude/skills/two-faced-cards-*`
  triggers to fire on tabletop and contract work too. Follow
  `notes/features/HOW-TO-CREATE-A-FEATURE-OWNER.md`.

## Part A — apps/tabletop (parallel with Part B once F0 lands)

- **A1. Scaffold the workspace** — package.json (tldraw, @tldraw/sync{,-core},
  express, ws, react, OTel), tsconfig, vite.config, src/client + src/server; root
  pass-through scripts. **First task: verify server-side shape injection
  (`room.updateStore`) against the pinned tldraw version.** *Test: build compiles,
  vitest smoke.*
- **A2. OTel from the first commit** — server: `src/server/tracing.ts` modeled on
  the Shuffler's (ESM register hook, OTLP http, kube-probe-aware sampler,
  `node --import`). Browser: the `observability/` wrapper module (standard OTel web
  SDK), initialized before mount, `table.name` as a global attribute, exporting to
  our server's OTLP proxy. `run` script + `.env` pattern (`.be` before `.env` — same
  trap). *Test: spans in Honeycomb env `local`, datasets `mtg-tabletop` /
  `mtg-tabletop-web`.*
- **A3. Sync server + room registry (scaffolding)** — `rooms.ts` per the registry
  row; Express + ws upgrade at `/connect/:roomSlug`; `traceparent` accepted on the
  connection URL (propagation belongs to the connection *request* only); SPA
  fallback for `/t/*`; `/health`; one shared slugify. Rooms are **in-memory only**,
  ephemeral, accepted for v0. `table.id` + `table.name` on spans; room lifecycle
  (created/emptied/evicted) as span events. *Test: vitest, real server on an
  ephemeral port, two ws clients share a room.*
- **A4. The `/t/:tableName` page** — `/` landing takes a table name only (player
  name is a Shuffler-prep concern); `/t/:tableName` renders `<Tldraw>` with
  `useSync`. Spectators come free: anyone with the URL joins. Square corners,
  tablet-friendly targets. *Test: Playwright, two contexts, draw in one, see it in
  the other; a tabletop `verify.sh` mirroring the Shuffler's.*
- **A5. Card-arrival API — the seam the Spine absorbs** — `POST
  /api/tables/:tableName/cards`, payload per F0. Dedup on `id` **and** on
  `instanceId` already present (no-op). **Arrival layout (regions, v0-minimal)**:
  a fixed **Stack area**, plus a **battlefield row per player** keyed by
  `initiator`, allocated in first-play order — Jess: lands arrive in the player's
  battlefield, everything else on the stack. The Shuffler picks the `zoneHint`
  (it knows land vs nonland from `cardTypes`); the tabletop stays meaning-free and
  honors coordinates. Graveyard placement: JESS TODO 3. `shape.meta` =
  `{ instanceId, scryfallId, cardName }`. Ingestion span attrs: `card.instance_id`,
  `card.scryfall_id`, `card.name`, `event.id`, `table.name`, `zone.hint`; the
  client store-listener emits a standalone "card arrived on canvas" span correlated
  by `card.instance_id` (not propagation — the play trace ends when the ingestion
  request is fulfilled). SCAFFOLDING banner naming the future: Shuffler emits
  `card.played` to the Spine; Tabletop subscribes to the table's public feed.
  *Test: vitest POST + both dedup paths; Playwright: a land and a nonland arrive
  in different areas.*
- **A6. Docker, k8s, deploy** — Dockerfile with repo root as build context; `k8s/`:
  deployment (`mtg-tabletop`, key from `mtg-deck-shuffler-secret`), service,
  ingress on ALB group `only-one-alb-please`, host **`table.jessitron.honeydemo.io`**
  (decided: subdomain — easiest, copies the Shuffler's external-dns + TLS host
  block, spares Vite base-path and ws-path juggling). The Shuffler's server-side
  POST uses in-cluster DNS (`TABLETOP_URL=http://mtg-tabletop-service`), not the
  public host. Check ALB idle timeout vs tldraw keepalive. *Test: container boot;
  prod spans after deploy.*
- **A7. Docs** — tabletop SEAMAP progress, README (Modes + SCAFFOLDING callouts),
  root CLAUDE.md layout, notes/AGENT-NOTES.md gotchas.

## Part B — Shuffler integration (parallel with A once F0 lands; only B3's end-to-end verification and prod wiring wait for A5/A6)

- **B0. Feature-owner consultation is mandatory** — library-search /
  two-faced-cards (fleet-scoped, after F1) / animations: `-context`, `-review` on
  the concrete plan, `-update` after. Known hot spots: the `game.js` clipboard hook
  (animations), Discard's new `WhatHappened` verb (animations), sending the played
  face (two-faced).
- **B1. Prep screen: table name + player name** — two optional inputs on
  `prepare.ejs` (Jess: a player also wants to type their name when joining);
  posted through `/start-game`; persisted as optional `tableName` + `playerName`
  on `PersistedGameState` (optional-field exception, **no version bump**);
  `/restart-game` carries both. Player name is load-bearing in table mode (it keys
  the battlefield row) — default to "player" if blank rather than block. Game page
  header shows "at table *name*" linking to `/t/:tableName` in a new tab — that
  link is also the spectator-share mechanism (Jess: yes please). *Test: unit
  persistence; Playwright types both fields, sees the link.*
- **B2. A Tabletop port (fakes, not mocks)** — `src/port-tabletop/`: `TabletopPort`,
  `HttpTabletopGateway` (fetch to `TABLETOP_URL`, auto-instrumented so trace
  context propagates free), `FakeTabletopGateway` (records; can be told to fail).
  Payload per F0; the Shuffler mints a fresh event `id` per attempt. SCAFFOLDING
  banner naming the Spine-shaped future (Jess: surprised it's direct
  Shuffler→Tabletop, expected Spine — OK for now, breaks the dependency, change
  later).
- **B2a. Mint `cardInstanceId`** — opaque GUID per card in `GameState.newGame`
  (beside `gameCardIndex` assignment); stored on the persisted game card as an
  **optional field, no version bump**: `fromPersistedGameState` **mints-on-load**
  when missing, so in-flight games get ids the next time they're touched. Files:
  `src/GameState.ts`, `src/port-persist-state/types.ts`, `test/generators.ts`.
  *Test: mint-on-load unit test; the F0 no-index test.*
- **B3. Play sends the card — send-then-commit** — in `POST /play-card`
  (`apps/shuffler/src/app.ts:1230`), table mode: **send to the table first; only
  on success run `game.playCard()` and persist**; on failure return an error
  fragment — the card stays in hand, game state untouched (Jess: block the play;
  a play that silently missed the tabletop is worse than one that says it failed;
  the tabletop's `instanceId` no-op covers worked-but-unacked). Solo mode:
  clipboard flow exactly as today (Mural workflow unbroken — joining a table is
  optional). Button feedback "Sent to table". Zone hint: land → battlefield,
  nonland → stack. *Test: fake fails → error + hand unchanged; Playwright two-app
  flow (verify orchestrates both apps with health-check waits).*
- **B4. Discard** — new hand-modal button + `POST /discard-card/...`; history verb
  "discarded"; card lands in `TableLocation` (graveyard is table geography, not
  Shuffler state). Solo mode: identical to Play except the verb (Jess: yes, same
  as Play). Table mode: `zoneHint: "graveyard"` — placement JESS TODO 3. *Test:
  unit verb + history text; Playwright.*
- **B5. Docs + owners** — CLAUDE.md (routes, TABLETOP_URL), GLOSSARY (Modes), both
  seamaps, feature-owner `-update`s.

## Observability

One trace per played-card **request**: browser click → `/play-card` → POST to
tabletop → ingestion span; the trace ends when the request is fulfilled. Cards
persist beyond traces, so nothing durable carries trace context — after-the-fact
correlation is by `card.instance_id` attribute on spans from every component
(queryable in Honeycomb). WS propagation only at connection establishment. Same
`.be`/`.env`/secret plumbing as the Shuffler; browser spans via the OTLP proxy.

## Risks

1. `room.updateStore` (server-side shape injection) is a young API — verify first
   thing in A1; fallback is a connected "server client." Pin tldraw exactly.
2. ALB + websockets: idle timeout vs tldraw keepalive; second host rule on the
   shared ALB group.
3. Rooms are **in-memory only** — a redeploy wipes the board. Accepted for v0
   (fine for intentional redeploys); buoy filed for durable reconstruction.
4. In plain words: the sync server is supposed to be dumb — it replicates
   drawings. The card-arrival endpoint gives it one domain-ish job (knowing a card
   was played, and where cards land). We keep that contained: the endpoint is
   written as a stand-in for the Spine's future feed, marked SCAFFOLDING, with
   `// JES-128` markers where contract validation goes, so deleting it later is
   easy.
5. Bypassing the `game.js` clipboard hook touches what the animations owner
   guards — that review is not optional.
6. Send-then-commit means a tabletop outage blocks plays in a joined game —
   JESS TODO 2.

## Buoys to drop (via seamapping:drop-buoy, low priority)

- Reconstruct a table after restart: card locations replayable from the Spine's
  event log once it exists; freeform doodles need a tldraw snapshot store.
- "Choose your sleeves" (rectangular card frames, custom backs) lands with the
  custom CardShape work at Mountain 2 — the natural moment; a sleeve image is
  exactly what a face-down card back needs.

## JESS TODO — new questions your answers surfaced

1. **JESS TODO — interim tableId in the scaffolding**: the contract has the Spine
   minting `tableId`. Until the Spine exists, may the tabletop's registry mint
   interim GUIDs that die with the process, or does v0 run name-only?
2. **JESS TODO — blocked play vs tabletop downtime**: with send-then-commit, a
   tabletop outage makes a joined game unplayable mid-game. Acceptable for v0, or
   should the game page get a "leave table / go solo" control?
3. **JESS TODO — where does a Discard land on the canvas?** Stack and battlefield
   are defined. Proposal: a per-player graveyard spot at the end of that player's
   battlefield row.
4. **JESS TODO — player-name collisions** (two "Jess"es at one table): battlefield
   rows are keyed by player name now. v0 last-writer-shares-a-row, or
   disambiguate with a suffix?
5. **JESS TODO — OTLP proxy for browser spans**: OK to route them through the
   tabletop server (`POST /otlp/v1/traces`, Honeycomb key stays server-side),
   rather than shipping an ingest key to the page?

## Critical files

- `apps/tabletop/` (new: src/server/{server,rooms,tracing}.ts, src/client/ incl.
  `observability/`, Dockerfile, k8s/)
- `apps/shuffler/src/GameState.ts` (mint `cardInstanceId` in newGame;
  mint-on-load in fromPersistedGameState)
- `apps/shuffler/src/app.ts` (`/play-card` send-then-commit; `/start-game`
  tableName+playerName; new `/discard-card`)
- `apps/shuffler/src/port-persist-state/types.ts` (optional `cardInstanceId`,
  `tableName`, `playerName` — no version bump)
- `apps/shuffler/src/port-tabletop/` (new port; F0 payload comment block)
- `apps/shuffler/public/game.js` (clipboard hook: skip in table mode)
- `apps/shuffler/views/prepare.ejs` (table + player name inputs)
- `notes/features/two-faced-cards/` (F1 fleet-scoping)
