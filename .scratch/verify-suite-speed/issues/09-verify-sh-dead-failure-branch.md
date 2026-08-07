# verify.sh's "tests failed" message is unreachable

Mountain: overhead
Status: resolved
Type: task
Map: ../map.md

> _Triaged from a loose `TODO.md` capture (`verify-sh-dead-failure-branch`), found while
> charting `../map.md`. `fleet-is-observable-context` consulted 2026-08-07; verdict below is
> theirs._

## The problem

`apps/shuffler/verify.sh` has `set -e` (line 12). The multi-line, env-var-prefixed
`npx playwright test "$@"` command (lines 143-154) is a single simple command as far as `set -e`
is concerned — if it exits nonzero, the script aborts right there, before line 157's
`TEST_EXIT_CODE=$?` ever runs. So the `else` branch printing `"Verification tests failed!"`
(lines 163-164) can only ever be reached with `TEST_EXIT_CODE -eq 0`, i.e. never.

**Observable behavior is unaffected** — `trap cleanup EXIT INT TERM` (line 112) fires on any
exit path, including a `set -e` abort, so `cleanup()` still runs and the shell's own exit code
is still Playwright's real exit code. Only the printed message is dead.

## The fix — and the trap in the obvious one

The owner flagged that the naive rewrite doesn't actually work under `set -e`:

> `npx playwright test "$@"; TEST_EXIT_CODE=$?` (semicolon-separated) still aborts on the first
> statement before the second ever runs — `set -e` fires on any simple command, and a bare `;`
> between two statements doesn't exempt the first one.

Correct shapes (either is fine):

- Bracket it: `set +e; <the whole prefixed npx playwright test command>; TEST_EXIT_CODE=$?; set -e`
- Or: `if <the whole prefixed npx playwright test command>; then TEST_EXIT_CODE=0; else TEST_EXIT_CODE=$?; fi`
  (the `if` condition context is exempt from `set -e` by shell semantics)

**Do not use `cmd || true`** — it always yields `$? -eq 0` afterward, silently defeating the
capture.

No hidden coupling: fixing this doesn't change when `cleanup()` runs. Keep the existing
`VERIFY_*` env-var-on-command-line convention (not `export`ed — see the comment above line 143)
intact; only wrap the guard around the whole assignment block.

## Acceptance criteria

- `TEST_EXIT_CODE` is genuinely captured on both the pass and fail path (verify by forcing a
  failing spec locally and confirming the red "Verification tests failed!" message prints, and
  the script's own exit code is still nonzero).
- The passing path is unaffected — confirm `./verify.sh` on a green suite still prints the green
  message and exits 0.

## Owners consulted

`fleet-is-observable-context`, 2026-08-07 — verdict: ready-for-agent, conditional on using the
`set +e`/`set -e` or `if`/`else` form rather than the bare semicolon example in the original
`TODO.md` capture. `-review` before landing: "no interactions of concern" — env sourcing,
trap/cleanup timing, and the harness reporter are all untouched; the fix only makes the
already-captured exit code accurate instead of dead. Judged too narrow to warrant a KB entry.

## Answer

Landed: wrapped the `npx playwright test "$@"` invocation in `set +e` / `set -e` so
`TEST_EXIT_CODE=$?` is reached on both the pass and fail path. Verified with an isolated
repro script (same `set -e` / trap / `set +e ... set -e` shape, a `false` in place of
Playwright): the fail branch now prints, `cleanup` still runs via the trap, and the script's own
exit code still matches the failing command's. No behavior change on the passing path.
