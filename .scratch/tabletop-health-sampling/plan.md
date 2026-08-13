# Plan: head-sample Tabletop `/health` at 1:100

Mountain: overhead

## Goal
The Tabletop server should head-sample requests to the `/health` route at 1:100 (0.01),
matching the Shuffler's treatment of that route.

## Current state
`apps/tabletop/src/server/tracing.ts` has an inline `KubeProbeAwareSampler` (root of a
`ParentBasedSampler`) that reads only `http.user_agent`:
- `kube-probe` → TraceIdRatioBasedSampler(0.001)
- `elb-healthchecker` → TraceIdRatioBasedSampler(0.01)
- everything else → 1.0

No unit test. Reads a single attribute spelling.

## Change
Extract a tested pure function into `apps/tabletop/src/server/telemetry-sampler.ts`,
mirroring the shape of `apps/shuffler/src/telemetry-sampler.ts`:

- `sampleRatioFor(attributes): number` — pure, testable.
  - Read user agent from `http.user_agent` **and** `user_agent.original` (Invariant 4:
    read both spellings so a semconv migration can't silently disable matching).
  - `kube-probe` → `KUBE_PROBE_SAMPLE_RATIO = 0.001`
  - `elb-healthchecker` → `ELB_HEALTHCHECKER_SAMPLE_RATIO = 0.01`
  - Read path from `http.target` **and** `url.path`; strip query (`split("?")[0]`), lowercase.
  - path `/health` → `HEALTH_SAMPLE_RATIO = 0.01`
  - else → `DEFAULT_SAMPLE_RATIO = 1.0`
- **Ordering: user-agent checks FIRST**, then the `/health` path check. A real kube-probe
  hitting `/health` therefore stays at 0.001; `/health` reached by anything else falls to 0.01.
  This preserves the existing UA ratios (Jess only asked to add `/health`, not to change
  the probe ratios).
- `class BackgroundChatterSampler implements Sampler` dispatching to a cached
  `TraceIdRatioBasedSampler` per ratio.
- `tracing.ts` imports and uses it as the `ParentBasedSampler` root; delete the inline class.

## Test
New `apps/tabletop/test/telemetry-sampler.test.ts` (vitest — this ship uses vitest, not jest):
- `sampleRatioFor` returns 0.001 for kube-probe (any path), 0.01 for elb-healthchecker,
  0.01 for `/health` with no probe UA, 0.001 for kube-probe on `/health` (UA wins),
  1.0 for a normal route, 1.0 for an empty attribute set, and honors `user_agent.original`
  / `url.path` spellings.
- `BackgroundChatterSampler` over many trace ids: keeps everything on a normal route,
  drops the great majority of `/health`, keeps > 0 of `/health`.

## Notes
- Logs are not sampled — a failing `/health` still emits its explaining logs.
- No cost motive; keeping 1% (not 0%) so a succeeding probe still shows in traces.
