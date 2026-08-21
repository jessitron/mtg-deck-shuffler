# 25 — Give the Tabletop's Playwright suite the same run-tracing the Shuffler has

Mountain: overhead
Ship: tabletop
Type: task
Status: ready-for-agent
Blocked by: None — can start immediately

**What to build:** The Shuffler's `./verify.sh` traces its own test run to Honeycomb — one
trace per run, a span per spec/test/step — via `apps/shuffler/test/harness-telemetry/`
(`harnessTracing.ts`, `spanPlan.ts`, `otelReporter.ts`), reporting to service
`mtg-fleet-verify` (team `modernity`, env `local`), correlated by a printed
`verify.run.id`. The Tabletop's `./verify.sh` has no equivalent — its Playwright suite
runs untraced, so a flaky Tabletop test can't be diagnosed via Honeycomb the way a flaky
Shuffler test can. Bring the Tabletop up to parity.

Scope is explicitly **run/spec/step tracing only** — correlating the harness spans with
the app's own request-level spans (trace-context propagation, "app spans as children of
test spans") is deliberately out of scope. It was considered and rejected: propagating a
sampled parent into the Tabletop's `ParentBasedSampler` (`apps/tabletop/src/server/tracing.ts`)
would bypass `BackgroundChatterSampler` and trace every static asset at 100% — worse here
than on the Shuffler, since the Tabletop's sampler has no static-asset-by-extension
downsampling at all, only UA/`/health` filtering. Harness and app spans should keep
correlating by `verify.run.id` and timestamp only, same as the Shuffler.

**Concrete steps** (from research already done — see conversation, not repeated here):

1. Copy `apps/shuffler/test/harness-telemetry/harnessTracing.ts` and `spanPlan.ts` into
   `apps/tabletop/test/harness-telemetry/` unchanged — both are already ship-agnostic
   (fleet-neutral service name `mtg-fleet-verify`, env-driven, no Shuffler-specific
   logic).
2. Copy `otelReporter.ts` the same way; change its `VERIFY_SHIP` default from
   `"shuffler"` to `"tabletop"`.
3. Add the `VERIFY_RUN_ID` / `VERIFY_GIT_SHA` / `VERIFY_SCRIPT_START_MS` /
   `VERIFY_BUILD_START_MS` / `VERIFY_BUILD_END_MS` / `VERIFY_SERVER_START_MS` /
   `VERIFY_SERVER_READY_MS` env-var wiring to `apps/tabletop/verify.sh`, mirroring how
   `apps/shuffler/verify.sh` sets them around its build/server-boot phases — Tabletop's
   `verify.sh` currently sets none of these, so the synthetic "verify build"/"verify
   server boot" phases wouldn't otherwise appear in the trace.
4. Wire the reporter into `apps/tabletop/playwright.config.ts`, which currently has
   `reporter: "list"` only — add the OTel reporter alongside it (don't replace `list`;
   Shuffler keeps both for local console output plus the Honeycomb export).
5. Consider whether `harnessTracing.ts`/`spanPlan.ts` are worth moving to a shared
   `packages/` location instead of duplicating a second copy fleet-wide — not required
   for this ticket, but flag it if the duplication feels wrong once both copies exist
   (the fleet already accepts duplicating `log.ts` between ships for good reason — see
   root `CLAUDE.md` — so duplication here isn't automatically wrong either).

This is dev-tooling only — no user-visible behavior changes, so no Playwright test is
needed for the ticket itself. Verify by running `apps/tabletop/verify.sh`, confirming a
`verify.run.id` is printed, and checking Honeycomb (service `mtg-fleet-verify`, env
`local`) for a trace with `verify.ship: "tabletop"` and per-spec/test/step spans.

- [ ] `apps/tabletop/test/harness-telemetry/` exists with `harnessTracing.ts`,
      `spanPlan.ts`, `otelReporter.ts` (ship set to `tabletop`)
- [ ] `apps/tabletop/verify.sh` sets the `VERIFY_*` env vars the reporter reads
- [ ] `apps/tabletop/playwright.config.ts` registers the reporter alongside `list`
- [ ] A real `apps/tabletop/verify.sh` run produces a trace in Honeycomb
      (`mtg-fleet-verify`, env `local`) with `verify.ship: "tabletop"` and spans per
      spec/test/step
- [ ] `apps/tabletop/CLAUDE.md` gets a Testing section note describing this, mirroring
      the Shuffler's `CLAUDE.md` "The suite traces itself" section
