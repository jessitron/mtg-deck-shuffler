# CLAUDE.md — the Tabletop

Guidance for Claude Code when working in `apps/tabletop/`. Fleet-level guidance
(owners, workflow, telemetry key sourcing) is in the repo-root `CLAUDE.md`.

This ship's seamap: `SEAMAP.md` (in this directory).

**All paths in this file — and every path in `apps/tabletop/notes/` — are relative to
`apps/tabletop/`.** So `src/server/seatJoined.ts` means `apps/tabletop/src/server/seatJoined.ts`.

**Stay in this ship.** Don't edit files outside `apps/tabletop/` (`contracts/` is fair
game when a contract change is the explicit point of the task). If finishing the task
needs a change in the Shuffler or the Spine, stop and say so instead of reaching across
— that's a cross-ship task, and it deserves its own look at both ships' `CLAUDE.md`s.

## What this is

Vite + React + tldraw synced canvas with an Express/ws sync server.
`/t/:tableName` is a shared board; two SCAFFOLDING endpoints (for the Spine's
future feed) place things on it: `POST /api/tables/:tableName/events`
(`seat.joined`, `src/server/seatJoined.ts`) draws a seat's player area at
Shuffle Up, and `POST /api/tables/:tableName/cards` (`cardArrival.ts`) places
cards from the Shuffler onto it.

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
