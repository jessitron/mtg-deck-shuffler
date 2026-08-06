# Keep/kill: knowing-the-fleet-works

Mountain: safe-harbor
Type: grilling
Status: resolved

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

## Answer

**Six survive, two die.** All six go to `## Backlog` with no `← mountain:` marker —
this cluster is safe-harbor, and per [ticket 02](02-inbox-line-format.md) safe-harbor is the
*absence* of a Mountain. Nothing merges: the four existing inbox items ticket 01 flagged are all
Tabletop cosmetics, and `## Backlog` is currently empty, so every line here is new.

Keep/kill was the agent's call under Jess's delegation (2026-08-06): *"dude I don't care, what will
help you get it done?"* Every claim below was re-verified against today's codebase, and the
`fleet-is-observable` owner KB was read in full first, as the ticket asked.

### JES-133 — **killed** as an umbrella with nothing left

Its headline — "there is **no** OTel logs pipeline anywhere in the fleet" — is false three times
over now: both Node ships have `log.ts` on the NodeSDK's `logRecordProcessors`, and the browser has
`logError()` + its own `LoggerProvider` + a collector `/v1/logs` route. The two pieces of thinking
that were only in the umbrella are already permanent elsewhere: the **per-ship-duplication decision**
is in `owners/fleet-is-observable/README.md` § How it works now *and* each ship's `CLAUDE.md`, and
the **logs-aren't-sampled trap** is Invariant 2 there plus a section in `notes/AGENT-NOTES.md`.
An umbrella whose every child is either done or has its own line is pure overhead.

### JES-135 — **keep**, as `shuffler-logs-not-console`

Verified: **53** `console.*` calls outside `src/scripts/` (the raw grep says 56; three of those are
`log.ts` writing to stdout on purpose). Exactly matches the archive's "53 remaining" progress note,
so nothing has drifted. `app.ts` 40, `server.ts` 8, `GameState.ts` 2, one each in
`view/debug/state-copy.ts`, `SqlitePersistStateAdapter.ts`, `ArchidektDeckToDeckAdapter.ts`. Only 3
`log.*` callers exist in the whole ship. This is the largest genuinely-open item in the cluster and
the most mechanical — the pattern is written down and demonstrated at `dc2df7e`.

### JES-137 — **keep**, as `spine-logs-in-traces`

Verified: `services/spine/config/initializers/opentelemetry.rb` is four effective lines with no logs
gem, and there is no explicit app-level logging in the Spine at all. Kept mostly for the **undecided
fork** it carries (alpha `opentelemetry-logs-sdk` gem vs lograge + collector `filelog`) — that's a
real decision that would otherwise have to be rediscovered. The fleet `CLAUDE.md` cites this id;
[ticket 05](05-cut-the-linear-pointers.md) rewrites that to `spine-logs-in-traces`.

### JES-138 — **keep**, shrunk to two verified items, as `logs-docs-catch-up`

Most of the closeout already landed: the violation inventory is gone ("Violations: none"), the
sampling trap is recorded, the wiring table lists both `log.ts` files, the duplication is written
down in the README and in `apps/shuffler/CLAUDE.md` (including the `src/scripts/*` carve-out), and
`interactions.md`'s "no logs pipeline exists yet" is fixed. What's genuinely left is **two things**:

1. The KB now says the *browser* has no logger — README lines 81, 139, 262 and `interactions.md`
   line 31 — which is **false**, and worse than the old caveat: it tells an agent to avoid a paved
   road that exists. This is a live wrong answer, not paperwork.
2. `notes/add-opentelemetry.md` is the runbook for a new TS ship and still covers tracing only, so
   a fourth ship arrives with no logs.

Small, but both are verified-false-today, so it stands alone easily.

### JES-139 — **keep**, as `build-sha-on-every-span`

Verified: zero hits for `service.version` / `deployment.sha` / any sha build arg across all three
ships. The Tabletop's `ARG TLDRAW_LICENSE_KEY` is the build-arg precedent the body claims. Already
held as Invariant 5 (marked FUTURE) in the owner README, which makes the line's job clear: landing
it means deleting that FUTURE marker and turning it into a standing check.

### JES-130 — **keep**, as `spine-probe-sampling`

Verified: the Spine initializer sets **no sampler at all**, so `GET /up` is traced at 100%. Small
and self-contained, with a known-good pattern to copy. Added to the line, from the owner's History:
give it a test — the Shuffler's inline sampler was silently broken for months precisely because it
had none.

### JES-98 — **killed** as done

Both asks have landed. `apps/shuffler/src/tracing_util.ts` exports `setCommonSpanAttributes`,
`stampRouteParamsOnSpan`, `markCurrentSpanAsError` — that *is* the "library of tracing utility
functions specific to this project" — and "identify the crucial fields" is now Invariant 1 in the
owner KB, stated more strongly than the issue asked ("attributes are ALWAYS better than a log").
What ticket 01 called "a re-audit, not a build" is a mood, not a task; the owner's `-review` skill
already runs that audit on every change that touches instrumentation.

### JES-119 — **keep**, as `set-up-ci`

Verified: no `.github/` directory, no workflow file anywhere. All three ships have real suites
(`jest`, `vitest`, Rails `test/`) and nothing runs them but a human remembering to. Kept on its own
merits as the ticket instructed — the JES-124 red-test argument is stripped out of the line, and the
"so it can run on the Trainer's PRs" origin is gone with the Trainer. The one-line original ask is
quoted because it's Jess's own words and still says exactly the right thing.

### No cross-cluster deferrals

Nothing here pairs with another cluster. One adjacency worth flagging to
[ticket 05](05-cut-the-linear-pointers.md), though: `owners/fleet-is-observable/README.md` and
`interactions.md` carry `JES-133`/`136`/`137`/`139` mentions in prose, and the same lines that need
rewriting to slugs are the stale-browser-claim lines `logs-docs-catch-up` will rewrite anyway.
Whoever gets there first should do both edits at once rather than touching those paragraphs twice.
