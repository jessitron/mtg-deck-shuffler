# Agent Notes

Gotchas learned the hard way while working in this repo. Append as you learn; delete
entries that stop being true. Things that belong in `CLAUDE.md` (standing instructions,
commands, layout) go there instead — this file is for the "oh, *that's* why" findings.

## Don't source `.be` from `./run`

`.be` at the repo root exports `HONEYCOMB_API_KEY` — but it also runs
`kubectl config use-context orion`. Sourcing it has a **side effect on your kubectl
context**, which is fine on `cd` (Jess's shell hook) and fine in `verify.sh`, but wrong
for every ordinary app start. So `./run` deliberately does *not* source it. If telemetry
401s from a hand-started server, source `.be` in your shell first, then `.env`.

_2026-07-27, during the monorepo restructure._

## npm workspaces put the lockfile at the root, which moves the Docker build context

`package-lock.json` lives at the repo root, so `npm ci` cannot run against
`apps/shuffler/` alone. The Docker **build context is the repo root** even though the
Dockerfile lives in `apps/shuffler/` (`docker build -f Dockerfile ../..`). The runtime
stage flattens the workspace back to `/app`, so the image, `run-in-docker`, the WORKDIR,
and the k8s manifests are all unchanged from before the restructure. If you ever see
`npm ci` fail in the image with a missing lockfile, this is why.

_2026-07-27._

## Two agents can be in this working tree at once

Untracked directories may appear mid-session that are not yours (`services/spine/...`
showed up while the restructure was in flight — a different chat window). **Never
`git add -A` blindly.** Stage the files you touched by name, or check `git status`
against your own change list before committing.

Two more ways this bites, both hit for real on 2026-07-27:

- **`git checkout HEAD -- <file>` is destructive here.** Used to "un-mix" a shared file
  before committing only your own hunks, it silently deleted 64 lines of another
  session's uncommitted work. Recovered only because the file had been copied to a
  scratchpad first. If you must isolate your hunks in a shared file, copy the file
  somewhere safe first and restore it immediately after committing — or just leave the
  file out of your commit.
- **HEAD moves under you.** The other session committed while this one was working and
  swept an edit of ours into *their* commit. Re-check `git log`/`git status` right before
  committing rather than trusting the snapshot from the start of the session.

_2026-07-27._

## The deck-selection page is `/choose-any-deck`

Not `/choose`. Routes are declared in `src/app.ts`; the site pages are `/`, `/docs`,
`/about`, `/history`, `/choose-any-deck`, and the play pages are `/prepare/:prepId` and
`/game/:gameId`. Curling `/choose` gets you a 404 that looks like a regression and isn't.

_2026-07-27._

## Tabletop gotchas (apps/tabletop)

- **tldraw is pinned exactly** (5.2.5 line, no caret): `room.updateStore` (server-side
  shape injection) is a young API, verified in `test/updateStore.test.ts`. Don't let a
  routine dependency bump float it.
- **Ports**: dev/prod server 5180, `verify.sh` runs its own on 5183. The Shuffler's
  tests use 3344/3001, the Spine 4600 — keep them distinct.
- **Rooms are in-memory**: restarting the server (or redeploying — `Recreate`, one
  replica) wipes every board. Not a bug in v0; durable reconstruction is a tracked buoy.
- **Browser spans don't go to the server**: they go to a collector. In prod that's
  same-origin `/v1/traces`, ALB-routed to the `mtg-tabletop-collector` deployment;
  locally `otel-collector-local.yaml` or the `local`-env key fallback. If browser spans
  vanish, check `BROWSER_OTLP_TRACES_URL` before suspecting the web SDK.
- **Card shapes carry no trace context**: correlation is by `card.instance_id` span
  attribute (traces follow requests; cards persist). Don't add a traceparent to
  `shape.meta`.

_2026-07-27, Tabletop v0._

## A blank table in prod is the tldraw license gate, not your code

Symptom: `https://table.jessitron.honeydemo.io/t/whatever` loads, works for a moment,
then goes blank. Reload and it works again for a moment. It looks like a sync
disconnect, a React crash, or something you just changed. It is none of those.

`@tldraw/editor`'s `LicenseProvider` hides the editor 5 seconds after load when the
license state is `unlicensed-production`, swapping the canvas for a hidden
`<div data-testid="tl-license-expired">`. `LICENSE_TIMEOUT = 5000`. No exception is
thrown, nothing appears in `pageerror`, and the surrounding `tl-container` div stays in
the DOM — so a smoke test that checks "did the page render" passes. **Grep the DOM for
`tl-license-expired` first.** That single check would have saved an afternoon.

Two facts that make this especially easy to chase in the wrong direction:

- **"Production" is decided by URL alone** — any HTTPS non-loopback hostname. localhost
  is *always* "development", so `./run` and `./verify.sh` are **structurally incapable**
  of reproducing it. Local green is not evidence. The only place to observe it is the
  deployed host, which is why `test/verification/check-deployed-canvas.mjs` takes a URL
  and `deploy.sh` runs it after rollout.
- **The timing invites a false cause.** 5 seconds is about how long it takes to notice
  the page and drag a card, so it reliably *feels* caused by whatever you just did.
  Ours was reported as "when I move the card the screen goes blank"; a timestamped DOM
  poll showed the canvas disappearing before anything was drawn or moved.

tldraw 3.x watermarked unlicensed production and kept working; **4.0 introduced the
gate**, so the "watermark worn happily" plan predates the version we're on. Prod needs
a real key (domain-bound — a key for the wrong domain fails identically). Full wiring in
`apps/tabletop/README.md` → Licensing; the key lives in the repo-root `.be`, never in
the committed `apps/tabletop/.env`.

_2026-07-27._

## Sampling health checks: the needle has to be lowercase too

`src/telemetry-sampler.ts` samples background chatter (health checks, static assets) down
to 1%. It lives apart from `src/tracing.ts` **so it can be unit tested** — the previous
version was inline in tracing.ts, untestable, and silently broken for months:

```ts
if (userAgent.toLowerCase().includes("ELB-HealthChecker"))  // never true
```

The haystack was lowercased and the needle wasn't, so every ALB probe was traced at 100%.
That one bug was the single largest source of spans in production: ~1440 probes per 2h,
8 spans each, swamping real traffic. The `kube-probe` branch beside it worked only because
that string happens to already be lowercase.

Two lessons worth keeping:

- **A sampler that fails open is invisible.** Nothing breaks, no error appears; you just
  quietly pay for data. If you write sampling logic, unit test the predicate.
- **Read both semconv spellings.** The predicate checks `http.user_agent` *and*
  `user_agent.original` (likewise `http.target` / `url.path`), because the HTTP
  instrumentation is mid-migration and a dependency bump would otherwise turn the
  sampling off just as silently.

Also: probes hit **`/health`** (cheap, no template render), not `/`. Express middleware
spans are off entirely (`ignoreLayersType: [ExpressLayerType.MIDDLEWARE]`), which is what
took a typical trace from 8 spans to 2. That replaced the old
`ignoreLayers: ["middleware - stampRouteParams"]` workaround — the reason that hack
existed (keeping the root server span active through `res.end`) is satisfied by having no
middleware spans at all.

## The two ships are on different OTel version lines, and the APIs differ

The Shuffler pins `@opentelemetry/*` at the **0.219** line, the Tabletop at **0.221**. That
skew is fine and deliberate — but the same class can have a different constructor:

```ts
new BatchLogRecordProcessor(exporter)              // 0.219 — Shuffler
new BatchLogRecordProcessor({ exporter })          // 0.221 — Tabletop
```

Same for `SimpleLogRecordProcessor`. Pass 0.219's shape to 0.221 and `options.exporter` is
`undefined`; the export throws inside a promise, goes to the global error handler, and
**nothing reaches Honeycomb while the code looks correct**. This was caught only because
`log.ts` has a test in both ships, which is the argument for testing both copies of a
deliberately-duplicated file rather than trusting the copy.

So: don't paste telemetry lines between ships without checking the signature, and when you
touch one ship's telemetry, run the other's tests too.

## Logs, not span events — and logs are not sampled

`log.ts` (both Node ships) emits OTel logs that carry the active span's trace/span id.
Honeycomb renders those with `meta.annotation_type = span_event`, so they appear on the
trace exactly like a span event would — which is the whole reason we can ban `addEvent`
and lose nothing. Logs with no active span arrive untethered, which is the point: that's
the case `addEvent` cannot serve (see the `rooms.ts` timer callback).

**Logs deliberately ignore the trace sampler.** A LogRecord does not inherit its span's
sampling decision, and enabling that (`traceBased` in the logger config) would be a
mistake: the sampler keeps 1% of health-check traces so we can see the probe passing, but
if the probe starts *failing* we want every log that explains why. Volume stays affordable
by not logging on the hot path, not by filtering.

One landmine if you ever do need to filter: a sibling `LogRecordProcessor` **cannot** drop
a record. `MultiLogRecordProcessor.onEmit` forwards to every processor unconditionally and
`onEmit` returns `void`. `logRecordProcessors: [filter, batch]` exports everything while
looking right — the same fails-open-invisibly shape as the sampler bug above. Filtering has
to be a decorator wrapping the batch processor, or the built-in `traceBased` config.

_2026-07-27._

## `User-Agent: node` gets a 400 from Scryfall, and it looks like our bug

Node's built-in `fetch` sends `User-Agent: node`. Scryfall — both `api.scryfall.com`
and the `cards.scryfall.io` image CDN — sits behind Cloudflare, which answers that UA
with **400 BAD REQUEST**. Not 403, not a rate-limit message: a bare 400, which reads
like *we* sent a malformed request.

That's what made it slow to diagnose. `/proxy-image` was returning 400 for card copies,
and the URL it was fetching was completely correct — paste it in a browser, or `curl` it,
and you get the image. The tell was in the trace: the 400 was on the **outbound** client
span to `cards.scryfall.io`, not on our own handler's logic. Then:

```
curl -s -o /dev/null -w '%{http_code}\n' -A node "$url"   # 400
curl -s -o /dev/null -w '%{http_code}\n'         "$url"   # 200
```

Two of the three Scryfall callers already set a real User-Agent; `/proxy-image` shipped
without one. All three now go through `fetchScryfall()` in `apps/shuffler/src/scryfall-http.ts`,
which sets it — use that for any new Scryfall call rather than bare `fetch`.

Verify with `test/verification/verify-proxy-image.sh` (hits the live CDN; a unit test can
only prove we *send* a UA, not that Scryfall *accepts* it).

_2026-07-31._

## `deploy.sh` checks AWS credentials first, and the order matters

An expired AWS SSO token used to surface at the ECR push — several minutes into
`apps/shuffler/deploy.sh`, after a clean, a `tsc` build, and a full Docker build — as
`aws: [ERROR]: Error when retrieving token from sso` followed by the cryptic
`password is empty`. There's now a preflight `aws sts get-caller-identity` that fails in
under a second with the exact `aws sso login` command to run. It also compares the account
against the one in the ECR URL, since a valid login to the *wrong* account otherwise fails
much later with an opaque permissions error.

It lives in **`scripts/preflight-aws.sh`** at the repo root — `check_aws_credentials <ecr-url>`,
sourced by all three ships' `deploy.sh`. Shared rather than pasted three times *because* of
the bug in the entry above this one: three Scryfall call sites each carried their own copy of
a required header, the newest didn't, and card copy was broken in prod for a week. (The
Tabletop's deliberately-duplicated `log.ts` is not a counterexample — that duplication buys
independence between two Dockerfiles on incompatible OTel versions. A shell helper that runs
only on Jess's machine, from one checkout, buys nothing by being copied.)

**The credential check must stay ahead of the `kubectl cluster-info` check.** EKS auth
goes through the aws CLI, so an expired token makes `kubectl cluster-info` fail too — and
it reports "❌ kubectl not connected to cluster", which sends you off debugging your
kubeconfig when the real problem is the token. (Not hypothetical: `cluster-info` can also
*succeed* on cached creds while the token is expired, so the failure is intermittent
depending on cache state — the worst kind.)

`aws sso login` opens a browser, so it's Jess's to run, not an agent's.

All three ships' `deploy.sh` use it. If you add a fourth, source the helper and call it
before the `kubectl cluster-info` check.

_2026-08-01._
