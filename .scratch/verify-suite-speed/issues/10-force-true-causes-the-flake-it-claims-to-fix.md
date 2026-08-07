# `{ force: true }` on the modal-nav clicks is the cause of the flake, not the fix

Mountain: overhead
Status: resolved
Type: task
Map: ../map.md

> _Triaged from a loose `TODO.md` capture (the `{ force: true }` bullet), found while charting
> `../map.md`. `animations-context` consulted 2026-08-07; verdict below is theirs._

## The problem

Five `.click({ force: true })` call sites, all on card-modal nav buttons (`.card-modal-nav-next`
/ `.card-modal-nav-prev`):

- `test/verification/verify-library-grouping.spec.ts:159, 243, 342`
- `test/verification/verify-query-parameter-modals.spec.ts:372, 380`

Each was added "in case of viewport issues with modal positioning" (per the original `TODO.md`
capture) and each is now paired with an `expect(async () => {...}).toPass({ timeout: 20000 })`
retry that papers over a click getting swallowed.

**`force: true` is a cause of this flake, not a workaround for it.** `owners/animations/interactions.md:27-36`:

> A Playwright-speed click right after the card modal opens can land its mousedown on a node
> htmx replaces before mouseup — no click event fires. `force` skips Playwright's
> actionability/stability wait — precisely the wait that would otherwise absorb the swap. So a
> forced click on a freshly-swapped modal button is *more* likely to straddle settle than an
> ordinary one.

Ticket 02 (resolved) already knew this — the comments at each of the five sites already state
the correct causal story — but deliberately worked around the *symptom* with the `toPass` retry
rather than removing `force: true`, to avoid changing two things in one commit.

## Why the "viewport issues" justification doesn't hold up

The owner checked: **no trace of it anywhere else.** No git history, no comment near any of the
five sites, cites an actual viewport constraint. It only exists as the phrase quoted in the
original `TODO.md` line. It reads as folk memory carried into the capture, not a documented
finding — there's nothing here that removing `force: true` would reopen.

## Fix, in two separate steps (per the owner — don't bundle these)

**Step 1 (this ticket): drop `{ force: true }` from all five sites, keep the `toPass` wrapper.**
Playwright's own actionability wait should now absorb the swap/settle straddle for free. The
`toPass` retry stays as a safety net — it's cheap (measured ~8.2s total across a run for 13
`toPass` steps) and removing it is an independent, independently-verifiable claim.

**Step 2 (separate follow-up, not this ticket): try removing `toPass` too**, once step 1 has
run clean a few times, to see whether the actionability wait alone suffices without the retry.
File this as its own step rather than riding it along here.

## Acceptance criteria

- All five `.click({ force: true })` sites become plain `.click()`; update or remove the
  adjacent comments that explain `force: true`'s effect (they're explaining something that's no
  longer there).
- Run `./verify.sh verify-library-grouping verify-query-parameter-modals` (or the equivalent
  targeted Playwright invocation) a few times in a row to confirm no new flakiness.
- Leave the `toPass` wrappers in place — step 2 above is a separate ticket if it turns out to be
  worth doing.

## Owners consulted

`animations-context`, 2026-08-07 — verdict: ready-for-agent. Also flagged a KB gap worth an
addendum once this resolves: `interactions.md` doesn't record where the "viewport issues"
phrase originated or whether it was ever verified real — worth one line so nobody re-litigates
it. `-update` after landing closed that gap (see `owners/animations/history.md`).

## Answer

Landed: dropped `{ force: true }` from all five sites, updated the adjacent comments, kept the
`toPass` wrappers as a safety net (step 2 — trying without them — is a separate follow-up, not
done here). Verified: `./verify.sh verify-library-grouping verify-query-parameter-modals` twice
in a row, 19/19 both times, no new flakiness. `animations-update` recorded the resolution and
the KB-gap closure in `owners/animations/interactions.md` and `history.md`.
