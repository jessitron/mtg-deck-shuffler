# Keep/kill: knowing-the-fleet-works

Mountain: safe-harbor
Type: grilling
Status: needs-triage

## Question

Which of these 8 survive into `TODO.md`? Largest cluster, and **the staleness hot spot** — three
of eight are stale or done, because the logs-pipeline umbrella outlived its own children.

*Theme: telemetry and CI — everything under Safe Harbor's "deployed and observable, tests green."*

Consult the `fleet-is-observable` owner before deciding; several of these are cited in its docs.

- **JES-133** — every ship gets a log pipeline. ⚠️ **Superseded by its own children.** Phases 1
  (JES-134) and 3 (JES-136) landed. Its headline claim — "there is **no** OTel logs pipeline
  anywhere in the fleet" — is now false. All remaining value lives in JES-135/137/138.
- **JES-135** — Phase 2: Shuffler, convert `console.*` to trace-participating logs. ✅ Genuinely
  open: **56** `console.*` calls remain in `apps/shuffler/src` outside `src/scripts/`. Pattern is
  written down in the body. Grindable.
- **JES-137** — Phase 4: Spine, Ruby logs that participate in traces. ✅ Open, and the fleet
  `CLAUDE.md:112` cites this very id. Carries a real undecided fork: logs-sdk gem vs
  lograge+collector.
- **JES-138** — Phase 5: close the loop in the owner docs. ⚠️ **Partially stale** — some of its
  doc corrections already landed in `a982366`. Needs a re-read against today's
  `owners/fleet-is-observable/` before it's walkable.
- **JES-139** — every span says which build it came from. ✅ Open, self-contained, well argued:
  build sha → Docker build arg → OTel resource attribute, all three ships. Cited by the owner's
  Invariant 5 as its future.
- **JES-130** — downsample health-probe traces in the Spine. ✅ Open, verified:
  `services/spine/config/initializers/opentelemetry.rb` sets **no sampler at all**. The Shuffler's
  probe-aware sampler is the pattern to copy.
- **JES-98** — instrument crucial fields as span attributes + tracing utils. ⚠️ **Largely done**:
  `apps/shuffler/src/tracing_util.ts` exports `setCommonSpanAttributes`, `stampRouteParamsOnSpan`,
  `markCurrentSpanAsError` — both asks have landed. What's left is a re-audit, not a build.
- **JES-119** — set up CI. ✅ Open, verified: there is **no `.github/` directory at all**. But its
  stated hazard is gone — the permanently-red test it warns about (JES-124) is Done. Decide CI on
  its own merits, not on that argument.
