# CLAUDE.md — the Tabletop

Guidance for Claude Code when working in `apps/tabletop/`. Fleet-level guidance
(owners, workflow, telemetry key sourcing) is in the repo-root `CLAUDE.md`.

This ship's seamap: `SEAMAP.md` (in this directory).

**All paths in this file — and every path in `apps/tabletop/notes/` — are relative to
`apps/tabletop/`.** So `src/server/seatJoined.ts` means `apps/tabletop/src/server/seatJoined.ts`.

**Don't work around a problem that actually belongs in another ship.** If a bug's root
cause lives in the Shuffler or the Spine, fix it there — don't paper over it locally (e.g.
loosening a timeout in this ship instead of having the Spine send a heartbeat, which is
what actually happened once). Cross-ship work doesn't need a stop-and-ask: say you're
crossing into that ship, then fork a subagent to make the fix there — it should read that
ship's own `CLAUDE.md` before touching anything. Never make another ship's edit inline
yourself, and never settle for a symptomatic fix here when the real fix is elsewhere.

## What this is

Vite + React + tldraw synced canvas with an Express/ws sync server.
`/t/:tableSlug` is a shared board. The Spine administers seat joins: it POSTs
`POST /api/tables/:tableSlug/events` (`seat.joined`, `src/server/seatJoined.ts`) to draw a
seat's player area at Shuffle Up. `card.played` has no HTTP entry point — it arrives only
over the SSE subscription below.

**Sending `card.returned.v1` — the reverse leg** (shuffler-spine-sse-subscriber ticket 02):
the library-portal swallow (ticket 12, `src/client/shapes/cardSwallow.ts`) is send-then-commit
— it POSTs `POST /api/tables/:tableSlug/cards/return` (`handleCardReturned`,
`src/server/cardReturned.ts`) and only deletes the card shape once that call resolves `ok`;
on failure the card's visuals revert and it stays on the table. That route resolves
`playerName`/the Spine's real `tableId` from the room registry (the client only knows the
card's own `owner`/`scryfallId`/`gameCardIndex`, matching this ship's shared-canvas design —
it has no notion of its own player identity) and calls
`sendCardReturnedToSpineBestEffort` (`src/server/sendCardReturned.ts`), which POSTs to the
Spine's generic `POST /tables/:tableId/events` — same send shape and same address-is-simply-
"the Spine" posture as `seat.joined`/`card.played` above, no `eventsUrl` introduced. Rides
the ambient request span plus undici's automatic outbound `traceparent` header (no
server-side `traceparent`-minting helper); best-effort — never throws — with a bounded 5s
`AbortSignal.timeout` (a single request, unlike the SSE subscription's long-lived
`undici.Agent`, so a plain abort signal is enough). Both outcomes are stamped on the active
span (`card.returned.spine_confirmed`); failure also sets `spine_send.send_failed` (the
fleet's existing attribute name for this outcome, reused verbatim) and logs a warning.

**The server opens one live Spine SSE subscription per room**, against
`GET /tables/:tableId/events/stream`. `handleSeatJoined` opens it the first
time a room hears `seat.joined` — the room's Spine `tableId` and the subscription handle live on
`RoomEntry` (`rooms.ts`); a second seat joining the same room is a no-op, since the room already
has one. `spineSubscriber.ts` is a small hand-rolled SSE client (streamed `fetch`, parsing the
Spine's `data: <json>\n\n` frames — no `EventSource`, since one server process holds many
concurrent per-table streams) that reconnects on its own after a drop, with no catch-up/replay of
missed events. **The fetch's `dispatcher` is a per-subscription `undici.Agent` with bounded
`headersTimeout`/`bodyTimeout`** (`createHeartbeatAwareDispatcher`) — Node's global
`fetch` defaults both to 300000ms, far too patient for a genuine hang, so a hung Spine would go
undetected; shortening them only works because the Spine sends a `: heartbeat\n\n` comment frame
immediately on connect and every `HEARTBEAT_INTERVAL_SECONDS` while quiet
(`services/spine/lib/sse_stream.rb`) — this parser ignores any frame without a `data: ` line, so
heartbeats need no parsing change, only bounded timeout values. `undici` is pinned to major
version 7 in `package.json` (`Agent`/`Dispatcher` aren't Node built-ins) — it **must** match
`process.versions.undici` for whatever Node version is running; undici 8 redesigned the
Dispatcher's internal handler interface and silently breaks every `fetch()` call through a custom
dispatcher. `spineEventDispatch.ts` inspects each received envelope's `name`; only
`card.played` has a consumer today (routed to `cardArrival.ts`'s `applyCardArrival` — dedup,
placement). Every other kind on the stream (`seat.taken`,
`table.created`, …) is ignored. Each dispatched event continues the trace from the broadcast
envelope's `traceparent` (injected fresh at publish time by the Spine's `Table#broadcast`) as a
CHILD span, not an unlinked one. **Env**: `SPINE_URL`, default `http://localhost:4600` (same
variable and default as the Shuffler's — see its `CLAUDE.md`). **This SSE subscription is the
only way `card.played` reaches this ship.** `applyCardArrival` does not
self-heal a missing player area — a `card.played` for a seat that hasn't `seat.joined` yet is
an ordering bug, not something to paper over by minting furniture (playmat, library, graveyard…)
from whatever scraps the payload happens to carry. It's rejected (`{status: "rejected", reason:
"seat-not-joined"}`) and logged as an error (`spineEventDispatch.ts`) instead of placed.
`src/server/testSeedRoute.ts` is a **test-only** HTTP seam (only mounted when
`ENABLE_TEST_SEED_ROUTE=true`, at `POST /test/tables/:tableSlug/cards`) that calls
`applyCardArrival` directly, for specs and `cardArrival.test.ts` that drive a server spawned as
its own process and have no live Spine to seed a card through. Never mounted without that env
var, and never in production.

**`tableSlug` is an opaque literal string, not a lookup key — it *is* the Spine's real
table id**, not a display name derived from one (`<name-slug>-<8-hex-random>`, minted
once at table creation — see `services/spine/CLAUDE.md`), so a URL is human-identifiable
but not guessable from the bare name alone. Nothing on this ship resolves an id to
anything — `getOrCreateRoom(slug)` (`rooms.ts`) uses the whole string as the
room-registry key, and the `/connect/:roomSlug` websocket upgrade does the same, so the
browser, the Spine's event POSTs, and the room registry only ever need to agree on the
same opaque string, letter for letter. `seatJoined.ts`/`cardArrival.ts` validate
that the envelope's `tableId` matches the URL's slug (`slugifyTableName(envelope.tableId)
!== tableName`) — a straight equality check, since both sides carry the same real id.
**`table.name` on any span/log here is the bare name with that suffix stripped back off**
(`tableNameFromSlug`, `src/shared/slugify.ts`) — it must match what the Shuffler stamps
under the same key so a filter can follow one table across ships (see
`owners/fleet-is-observable`); the full slug goes out separately as `table.slug`.

See `README.md` (in this directory) for Modes and SCAFFOLDING callouts.

The player area (playmat, library, command zone, graveyard, exile, Stack) is specified in
`DESIGN.md` (in this directory) — read it before touching
`src/server/cardLayout.ts`, `tableFurniture.ts`, `cardArrival.ts`, or
`seatJoined.ts`. Every played card, lands included, arrives on the Stack; a human
drags it wherever it goes from there (2026-08-16).

## UI Style

**The Tabletop is in scope for the fleet's design owner** — `owners/shuffler-looks-like-itself/`
(the slug predates the fleet scope) and its `-context` / `-review` / `-update` skills. The
Shuffler and Tabletop are meant to feel like **one app with two faces**, so pull toward the
Shuffler's purple-and-pink tokens, Orbitron-for-chrome typography and square corners rather than
inventing a look here. `/design` on the Shuffler is the gallery; look at it first.

Two things to know before you write any styling here:

- **The tokens and the font are wired up now** (`tabletop-css-tokens`, resolved 2026-08-07).
  `src/client/main.tsx` imports `@fleet/design-tokens/tokens.css` — the *same file* the
  Shuffler serves, not a copy — so the identity palette, `--narrow-border` and the mana
  colours all resolve on every Tabletop surface. Orbitron and Ovo load from a Google Fonts
  `<link>` in `index.html`. **Add a shared token by editing `packages/design-tokens/tokens.css`,
  never by declaring a `:root` here**; a second dictionary is exactly what that package exists
  to prevent. There is still **no ship-local stylesheet** — the first Tabletop-only rule needs
  somewhere to live, and that's an open choice, not a solved one.
  - **Orbitron reaches tldraw canvas text only through a self-rendering custom shape — never
    through a stock `geo` shape.** The `geo` shape's `font` prop is a closed enum with no
    Orbitron in it, so a stock label can never be on-brand no matter what's loaded. A custom
    shape has no such limit: `MtgZoneShapeUtil` (tabletop-physics ticket 13, 2026-08-08) sets
    `fontFamily: "var(--font-chrome)"` on a plain `div` inside `HTMLContainer` and it resolves
    to Orbitron, confirmed in a live browser. `HTMLContainer` is an unshadowed div, so `:root`
    tokens reach it by ordinary CSS inheritance — loading the font was necessary and, for a
    self-rendering shape, sufficient. See the owner's README → "tldraw limits" for the detail.
- **tldraw limits four rules**, recorded in the owner's README under "tldraw limits": no Orbitron
  in the `geo` `font` enum (on-brand canvas text needs a self-rendering shape); the global
  `:focus-visible` ring can't reach a canvas shape; a **locked** shape can never be a drop target
  (`getDraggingOverShape` filters `!isLocked` before checking drag hooks), so "furniture reacts to
  what's over it" must be a derived render; and an opaque `image` shape layered over a box hides
  that box's interior. Record new limits there rather than fighting them or dropping the rule.

## Commands

All from `apps/tabletop/`:

- `./run` — start locally (port 5180)
- `npx vitest run` — tests
- `./verify.sh` — Playwright verification
- `./deploy.sh` — deploy to table.jessitron.honeydemo.io

To run the whole fleet (Spine + Tabletop + Shuffler together), use `./run` from the
repo root — see the root `CLAUDE.md`.

## Observability

Fleet-level Honeycomb setup is in the root `CLAUDE.md`; the browser side is in
`notes/AGENT-NOTES.md` (spans go to a collector, not the server). Server side:

- **Express middleware spans are off** (`ignoreLayersType` in `src/server/tracing.ts`,
  matching the Shuffler), so a normal trace is the root server span plus
  `request handler - <route>`, not eight spans of parser middleware.
- **Logging**: `src/server/log.ts` — `log.info/warn/error(message, attributes, error?)`.
  Each record goes to stdout and to Honeycomb, carrying the trace/span id of the active
  span. **Reach for a span attribute first**; a log is for when there's no span to hang it
  on. Wired up by `logRecordProcessors` in `src/server/tracing.ts`; tested in
  `test/log.test.ts`.
- **SSE event standard: a receiving span, then a doing-span if anything happens.** Every
  event arriving over a Spine SSE subscription gets one span for receipt, carrying all the
  details (`event.name`, `table.name`/`table.slug`, and whatever the payload has) — this is
  `dispatchSpineEvent`'s `sse subscription: <event.name>` span in `spineEventDispatch.ts`,
  continuing the trace from the broadcast envelope's `traceparent` as a CHILD span. If the
  dispatcher actually acts on the event (today, only `card.played` → `applyCardArrival`),
  that action gets its *own* span nested inside the receiving one — `applyCardArrival`'s
  `place arrived card` span in `cardArrival.ts`, which only wraps the actual placement (the
  `updateStore` call), not the validation/dedup/reject checks that precede it (those set
  attributes on the receiving span instead, via `trace.getActiveSpan()`). A rejected or
  deduped event never gets a doing-span at all — it's outcome data on the receiving span
  only. Follow this shape for any new SSE-driven event handling.
- **Never `span.addEvent`.** This ship is where that rule came from: `rooms.ts` calls it
  from tldraw's throttled `pruneSessions` callback, which has no ambient span, so prod logs
  fill with "Operation attempted on ended Span" and the events are dropped. `log.ts` exists
  to fix that.
- **`log.ts` is duplicated from the Shuffler deliberately** — no shared telemetry package,
  by choice. The copies are on different OTel version lines (this ship 0.221, the Shuffler
  0.219) with **incompatible constructor signatures**; don't copy telemetry lines between
  ships without checking. See `notes/AGENT-NOTES.md`.

Browser side (`src/client/observability/index.ts`, the fleet's only real OTel wrapper):

- **`logError(message, attributes, error?)`** for errors with no span in scope. Inside
  `inSpan`, don't use it — `inSpan` already records the exception on the span.
- **Uncaught errors and unhandled rejections are reported automatically** (`window`
  `error` / `unhandledrejection`). That's the browser's equivalent of the server's timer
  callback: before this they went nowhere, so a user saw a broken table and Honeycomb
  showed a clean session. Lands in `mtg-tabletop-web` with `browser.url` and the global
  attrs (e.g. `table.name`).
- **The three `console.log`s in that file stay `console.log`.** They report whether
  telemetry is on; routing them through the telemetry pipeline would be circular.
- **Destination** is `logsUrl` from `/otel-config.json`, same collector-or-fallback shape
  as traces: prod `BROWSER_OTLP_LOGS_URL` → same-origin `/v1/logs` → ALB → collector
  (`k8s/collector.yaml` has a `logs` pipeline, `k8s/ingress.yaml` the path). Locally,
  either `otel-collector-local.yaml` or the `ALLOW_BROWSER_DIRECT_HONEYCOMB` fallback.
  No `logsUrl` → browser logging quietly off, same as tracing.

## Deploy gotcha: tldraw license → prod is http-only

**The deployed table serves plain http:// on purpose and needs no tldraw key** —
tldraw ≥ 4 blanks the canvas 5s after load on unlicensed **HTTPS** non-loopback
hosts, and plain http is exempt (decided 2026-08-09; the app has no auth to protect
anyway). The ALB rides its own IngressGroup (`tabletop-http`) — it can't share
`only-one-alb-please`, because `ssl-redirect` is exclusive across a group. The main
ingress is HTTP:80-only. **Don't serve the app itself over 443
without reading README → Licensing.** All four
absolute-URL config spots must agree on the scheme: `k8s/configmap.yaml` (browser
OTLP ×2), `k8s/collector.yaml` (CORS origin), and the Shuffler's
`TABLETOP_PUBLIC_URL`. `chooseLicenseKey` (`src/client/chooseLicenseKey.ts`)
withholds any baked key wherever the gate can't fire, so a stale key in `.be` can't
blank local dev or http prod. See README → Licensing and `notes/AGENT-NOTES.md`.

**`k8s/ingress-https-downgrade.yaml` existed briefly (2026-08-09 to 2026-08-10) to 301
https-first browsers down to http, sharing the `tabletop-http` group on 443 only. Removed:
AWS ALB rejects a redirect action that changes protocol from HTTPS to HTTP
(`InvalidLoadBalancerAction: You cannot redirect HTTPS to HTTP`), so it never actually
deployed — it just sat there failing `FailedDeployModel` every ~15-20 min and, because
ingresses sharing a `group.name` reconcile as one ALB, blocked routing updates for the
main ingress too (see `owners/fleet-is-observable/README.md`).** The problem it was
meant to solve — modern Firefox/Chrome trying `https://` first for typed URLs and
showing "can't connect" instead of falling back — is still open (no ticket yet).

Update this file when anything in it changes.
