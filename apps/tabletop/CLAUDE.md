# CLAUDE.md — the Tabletop

Guidance for Claude Code when working in `apps/tabletop/`. Fleet-level guidance
(owners, workflow, telemetry key sourcing) is in the repo-root `CLAUDE.md`.

This ship's seamap: `SEAMAP.md` (in this directory).

## What this is

Vite + React + tldraw synced canvas with an Express/ws sync server.
`/t/:tableName` is a shared board; two SCAFFOLDING endpoints (for the Spine's
future feed) place things on it: `POST /api/tables/:tableName/events`
(`seat.joined`, `src/server/seatJoined.ts`) draws a seat's player area at
Shuffle Up, and `POST /api/tables/:tableName/cards` (`cardArrival.ts`) places
cards from the Shuffler onto it.

See `README.md` (in this directory) for Modes and SCAFFOLDING callouts.

The player area (playmat, library, graveyard, exile, Stack) is specified in
`DESIGN.md` (in this directory) — read it before touching
`src/server/cardLayout.ts`, `tableFurniture.ts`, `cardArrival.ts`, or
`seatJoined.ts`. One piece is deliberately deferred: the playmat never grows
taller when lands overflow its bottom half — picked up by the `playmat-command-zone`
line in the repo-root `TODO.md`.

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
  - **Orbitron still doesn't reach tldraw canvas text.** The `geo` shape's `font` prop is a
    closed enum with no Orbitron in it, so only a self-rendering custom shape can use it on
    canvas. Loading it was necessary, not sufficient.
  - The green/cream inline palette in `src/client/LandingPage.tsx` (`#1a2a1f`, `#f5f1e8`,
    `#3d5a45`) is still a known violation, not a house style — don't match it. Fixing it is a
    real appearance decision needing Jess's sign-off, not a mechanical `var()` swap; buoyed as
    `tabletop-landing-page-palette`.
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

- **Logging**: `src/server/log.ts` — `log.info/warn/error(message, attributes, error?)`.
  Each record goes to stdout and to Honeycomb, carrying the trace/span id of the active
  span. **Reach for a span attribute first**; a log is for when there's no span to hang it
  on. Wired up by `logRecordProcessors` in `src/server/tracing.ts`; tested in
  `test/log.test.ts`.
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

## Deploy gotcha: tldraw license

**Deploying needs `TLDRAW_LICENSE_KEY` in the repo-root `.be`** — tldraw ≥ 4 blanks
the canvas 5s after load on any HTTPS non-loopback host, and localhost can't
reproduce it. See README → Licensing and `notes/AGENT-NOTES.md`.

Update this file when anything in it changes.
