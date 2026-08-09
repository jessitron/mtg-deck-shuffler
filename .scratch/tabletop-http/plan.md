# Plan: serve the Tabletop over plain http:// (own ALB, no tldraw key needed)

Mountain: overhead
Status: planned (2026-08-09)

## Why

The tldraw evaluation key in `.be` expired 2026-08-09 and prod tabletop deploys are
blocked (TODO.md buoy `tldraw-license-key-expired`). tldraw ≥ 4's license gate fires
only on **HTTPS** non-loopback origins — plain http is exempt, per tldraw's own
LicenseProvider and docs. Jess has decided: serve `table.jessitron.honeydemo.io`
over http:// only. No auth exists anyway; security is explicitly deferred.

## Why a whole new ALB

The https redirect is the ALB answering 301 (verified via curl). It comes from
`alb.ingress.kubernetes.io/ssl-redirect: "443"` — and per AWS Load Balancer
Controller docs this annotation is **exclusive across the IngressGroup**: "Once
defined on a single Ingress, it impacts every Ingress within IngressGroup", the
whole HTTP listener redirects. All three ships plus six other ingresses share group
`only-one-alb-please`, so there is no per-host exemption. The tabletop ingress must
leave the group. Cost (~$16–20/mo second ALB) approved by Jess 2026-08-09.

`external-dns` runs in the cluster (verified) and will re-point
`table.jessitron.honeydemo.io` at the new ALB from the existing hostname annotation.

## Changes

1. **`apps/tabletop/k8s/ingress.yaml`**
   - `group.name: only-one-alb-please` → `tabletop-http` (own ALB)
   - delete `ssl-redirect` annotation
   - `listen-ports: '[{"HTTP":80}]'` (no 443 listener; https:// will refuse to
     connect, which beats serving a canvas that blanks after 5s)
   - delete the `spec.tls` block
   - keep: external-dns hostname, healthcheck path/interval, target-type ip,
     access-logs attributes (same bucket `orion-alb-access-logs`, same prefix —
     bucket policy is prefix-scoped, not per-ALB)
   - **`/v1/traces` and `/v1/logs` paths to the collector are unchanged**, just
     served by the new ALB.

1b. **`apps/tabletop/k8s/configmap.yaml`** (added by fleet-is-observable review):
   `BROWSER_OTLP_TRACES_URL` and `BROWSER_OTLP_LOGS_URL` are **absolute https**
   URLs handed verbatim to the browser exporters via `/otel-config.json`. With no
   443 listener they'd be silently connection-refused, killing all
   `mtg-tabletop-web` telemetry including the uncaught-error pipeline. Change
   both to `http://table.jessitron.honeydemo.io/v1/...`. Post-deploy, verify
   spans land in `mtg-tabletop-web` (env `mtg-deck-shuffler`).

2. **`apps/tabletop/src/client/TablePage.tsx`** — extract the key-withholding
   decision into a pure function `chooseLicenseKey(protocol, hostname, bakedKey)`:
   withhold (empty string) unless protocol is `https:` AND host is non-loopback.
   Today it withholds only on loopback; on http://table... it would hand tldraw
   the expired key, and the expired-key gate fires on *parseable-but-expired*
   keys regardless of origin. Unit-test the function (vitest), test-first.

3. **`apps/tabletop/deploy.sh`** — remove the hard fail on missing
   `TLDRAW_LICENSE_KEY` (keyless is now the design, not a mistake); still pass
   the key through to the build if present (harmless — TablePage withholds it at
   runtime on http). Post-deploy canvas check and printed URL switch to
   `http://table.jessitron.honeydemo.io`. The canvas check stays — it now proves
   the http exemption actually holds on the deployed host.

4. **`test/verification/check-deployed-canvas.mjs`** — default URL and the
   failure-message advice updated (http default; "set a key" is no longer the
   only fix).

5. **Shuffler (cross-ship, scoped deliberately)**: `apps/shuffler/k8s/configmap.yaml`
   `TABLETOP_PUBLIC_URL` → `http://table.jessitron.honeydemo.io`, and the fallback
   in `src/view/play-game/active-game-page.ts` likewise. Usage is a plain
   `<a target="_blank">` — https→http navigation is fine, no mixed content.
   In-cluster `TABLETOP_URL` (`http://mtg-tabletop-service`) unaffected.

6. **Docs**: apps/tabletop/README.md Licensing section, apps/tabletop/CLAUDE.md
   deploy-gotcha section, delete the `tldraw-license-key-expired` buoy from
   TODO.md. Journal entry in ../infra/orion/README.md after the deploy lands.

## Rollout notes

- Deploy applies `k8s/ingress.yaml`; the controller builds the new ALB, then
  external-dns moves the DNS record. Brief window where the name still points at
  the old ALB (which will still route the host rules until the old ingress spec
  is replaced — same ingress object, so the old ALB drops the rules on apply).
  A minute or two of possible 404/redirect flapping during cutover is accepted.
- Browsers that visited before hold a cached 301 to https; they'll hit
  connection-refused until the cache expires or a hard reload. Accepted.
- AWS SSO token currently expired; Jess runs `aws sso login` before `./deploy.sh`.

## Question for fleet-is-observable

Does moving the tabletop's ingress (including `/v1/traces` and `/v1/logs` collector
paths) to a new, HTTP-only ALB break any observability assumption you know of —
browser OTLP, probe traffic, deploy markers, or the access-log pipeline?
