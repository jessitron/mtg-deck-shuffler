# Map — the verify suite earns its minute

Mountain: overhead
Label: wayfinder:map

## Destination

Three things true at once:

1. **No useless tests.** Nothing in the suite is proving something we don't need proven, or
   proving nothing at all.
2. **No wasted time in tests.** No wait, navigation, or setup step costs time nobody needs.
3. **An agent can run the full suite locally without waiting minutes** — concretely,
   **the full suite under 60 seconds**, from 106.5s today.

One number ends the map, and it's the whole suite, not a fast slice. When `./verify.sh` finishes
in under a minute and every remaining test is one we'd miss, this effort is done.

## Notes

- **Domain:** the Shuffler's Playwright verification suite, `apps/shuffler/test/verification/`,
  driven by `apps/shuffler/verify.sh` and `playwright.config.ts`.
- **The suite traces itself.** Ticket 01 landed harness telemetry: service `mtg-fleet-verify`,
  Honeycomb env `local`, team `modernity`. Spans are `verify run` (root) → `verify build`,
  `verify server boot`, `spec: <file>` → `test: <title>` → `step: <title>`. Root spans carry
  `verify.run.id`, `verify.git.sha`, `verify.data_db.existed`, `verify.data_db.bytes`.
  **Every cost claim on this map should be a query, not a guess.** Measure before and after.
- **Skills every session should consult:** `animations-context` owns suite *timing* — it was
  decisive for ticket 02 and knows the htmx swap/settle mechanism and the `expect(...).toPass()`
  convention. `fleet-is-observable-*` owns anything touching `verify.sh`'s env sourcing or the
  harness telemetry. `two-faced-cards-*` and `library-search-*` own the features some specs
  cover — consult them about *what a test proves*, not about how fast it runs.
- **Match the consult to the question, not the file list** (fleet `CLAUDE.md`). One owner,
  usually. Sometimes none.
- **Status vocabulary:** these tickets use the repo's triage labels (`ready-for-human`,
  `ready-for-agent`, `resolved`) rather than wayfinder's `claimed`/`resolved`, because the rest
  of the repo reads them. `ready-for-*` means open and unclaimed; set `claimed` before working.
- **This map plans *and* does.** Overriding wayfinder's plan-only default: these tickets end in
  landed changes to the suite, not in specs. The destination is a running 60-second suite.

## Decisions so far

- [Instrument the verify harness so the suite's own time is queryable](issues/01-instrument-the-harness.md)
  — a custom Playwright reporter is the only emitter, writing to a dedicated `mtg-fleet-verify`
  service via a bare `BasicTracerProvider`. Deliberately **no `traceparent` into the browser**:
  the app's `ParentBasedSampler` would honour a sampled parent and trace every static asset at
  100%. Harness and app spans correlate by run id and time, in separate datasets.
- [Delete the redundant waits from the verify suite](issues/02-optimize-the-suite.md)
  — swept `waitForTimeout` and `networkidle` out of the specs: **225.0s → 106.5s**. The
  animations owner confirms the mulligan/shuffle path has no sleep left to reclaim. This lever
  is spent; everything remaining is structural.
- [The suite's setup cost: 42 trips to /choose-any-deck](issues/03-setup-cost-and-isolation.md)
  — seed, don't navigate: `test/verification/seedGame.ts` seeds every spec but one (the real
  click-through stays in `verify-precon-to-prepare.spec.ts`) through `POST /deck` +
  `POST /start-game`. **106.5s → ~55s.** Uncovered a pre-existing Ctrl+Z undo race (same
  click-straddles-settle class as the animations owner's documented click flake); fixed with
  the suite's usual `toPass()` retry.

## Measured baseline (run `96588aeb`, git `e1ca060`, warm)

104.1s total. `verify build` 1.6s, `verify server boot` 0.7s, **specs 99.0s (95%)**, serial.

| Where the time is | |
| --- | --- |
| `Navigate to "/choose-any-deck"` | **54.9s across 42 calls — 52.7% of the run** |
| `verify-query-parameter-modals.spec.ts` | 29.9s — 30% of the run, one spec |
| `verify-mulligan` / `verify-developer-mode` / `verify-game-menu` / `verify-library-grouping` | 9–12s each |
| everything else | ≤ 6.6s per spec |

**The navigation is not server-slow.** `GET /choose-any-deck` averages **26.6 ms** server-side.
The other ~1,280 ms per call is the browser waiting for `load` — and
`views/partials/deck-selection-precon.ejs:17` emits **191 remote `<img>` to Scryfall art_crop**
on every visit. Three calls in `verify-developer-mode` take only 84–90 ms; nobody knows yet why
those are fast, and the answer probably matters.

This also corrects ticket 03's "the suite reaches the live internet — 4 spans, 4.5s". That
counted *server-side* fetches only. The browser's 191-images-per-navigation are invisible to
server telemetry, and are *one* real dependency, but not the whole of it: grilling 03 further
(2026-08-07) found every rendered hand/battlefield card also carries a live `cards.scryfall.io`
`<img src>` (`shared-components.ts`), independent of `/choose-any-deck` entirely. That part is
ticket 11.

## Not yet specified

- **Cold start is unmeasured.** All 13 runs in telemetry have `verify.data_db.existed = true`.
  `verify.sh` never resets the 37 MB `data.db`, which grows ~1 MB per run. The cold/warm delta
  is *absent from the data*, not merely unqueried — and CI pays cold every time. Ticket 07 opens
  this; what it finds may graduate further work.
- **A regression alarm.** The suite now traces itself, so "the suite got slower" is a queryable
  fact. Whether that becomes a Honeycomb trigger, a threshold in `verify.sh`, or nothing at all
  is undecided — and probably shouldn't be decided until the suite is at its target.
- **Whether 60s survives contact.** 03 landed at ~55s, already under the 60s destination on
  its own — but 04, 06, and 11 haven't landed yet, so this isn't the map's close. Re-measure
  once they do; the number may move either direction.
- **The other two ships.** The Tabletop (`vitest`) and Spine (Rails `test/`) suites have never
  been measured. Whether they have the same disease is unknown; see Out of scope.

## Out of scope

- **Setting up CI** (`set-up-ci` in `TODO.md`). This map makes the suite worth running on every
  push; actually wiring the push is a separate effort. The two inform each other — cold start
  and the internet dependency are CI reliability questions — but the destination here is a fast
  local suite, and CI is past it.
- **The Tabletop and Spine test suites.** Named in the fog above only because the question
  occurs; the destination says "the suite", meaning the Shuffler's verification suite. If they
  need the same treatment, that's a fresh map.
- **General app performance work.** [The deck chooser ships 191 remote Scryfall images on every
  visit](issues/05-deck-chooser-ships-191-images.md) — ruled out of scope 2026-08-07 once ticket
  03's decision 1 (seed via API) removed 41 of 42 `/choose-any-deck` navigations from the suite.
  A real problem for real players, just not a test-speed one anymore; moved to `TODO.md`.
