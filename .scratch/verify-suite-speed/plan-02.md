# Ticket 02 implementation plan — delete the redundant waits

## The rule being applied

Delete `await page.waitForLoadState('networkidle');` and `await page.waitForTimeout(N);`
wherever an auto-retrying Playwright assertion (`expect(locator)...`) or an auto-waiting
locator action follows. Those already poll; the wait in front is dead time.

**Not** deleted where the wait is the only synchronization. Those get a real condition, using
the convention already in this repo (six specs use it) rather than a new helper.

## What the animations owner changed about my approach

I had planned to replace the card-modal sleep with `expect(cardTitle).not.toHaveText(before)`.
That was wrong, and it failed in triage. The owner supplied the actual mechanism:

- The card modal has **no animation at all**. `?openCard=N` isn't server-rendered — 
  `public/modal-query-params.js` fires `htmx.ajax` on `DOMContentLoaded`.
- The nav arrows are plain `hx-get` → `hx-target="#card-modal-container"` → `hx-swap="innerHTML"`.
- `expect(modal).toBeVisible()` passes at the **swap** phase. A click then lands its mousedown
  on a node htmx is about to replace, mouseup lands on the replacement, and **no click event
  fires**. Impossible at human speed; routine at Playwright speed.
- **`{ force: true }` makes it worse** — it disables Playwright's actionability/stability wait,
  which would otherwise have absorbed this for free.

This is already documented: `owners/animations/interactions.md:27` and `history.md:112`.
The repo-standard fix is a retrying click:

```ts
await expect(async () => {
  await nextButton.click({ timeout: 2000 });
  await expect(cardTitle).not.toHaveText(initialTitle, { timeout: 3000 });
}).toPass({ timeout: 20000 });
```

Reference implementations: `verify-discard.spec.ts:39-50`,
`verify-prep-commander-flip.spec.ts:99-105`.

**So the triage ticket's instruction to "find out why the click is lost, and file it separately
if it's a real app race" resolves to: it is not an app race.** It's the documented swap/settle
straddle. No separate ticket.

## The mulligan waits — all deletable, per the owner

`.library-stack.shuffling` is server-driven: `GameState.mulligan()` returns
`WhatHappened { shuffling: true }`, `formatLibraryStack()` renders the class, and
`game.css:332-345` runs `shuffle-card-1/2/3` at **1.5s**. So 1800ms = 1.5s + margin, honest.

But **nothing in either test depends on the animation**. The class and the asserted state
arrive in the same swap, and the animation is on `.library-card-back` transforms, which none
of the asserted locators touch.

- `:71` → `expect(handCount).toHaveText('7')` + `expect(mulligan).toHaveText('Mulligan #2')`. Delete.
- `:125` → **delete the sleep, keep line 126.** That `expect(mulligan).toHaveText('Mulligan #2')`
  is the synchronization the following Ctrl+Z needs — it proves the swap landed, so `.undo-button`
  carries the post-mulligan event index. Do not reorder it after the keypress.
- `:130`, `:88`, `:104`, `:111` — plain swap waits with retrying `expect`s behind them. Delete.

Also learned, and worth recording: **`.shuffling` is never removed.** No JS touches it; it rides
until the next swap re-renders the stack. So `not.toHaveClass(/shuffling/)` would be *wrong* and
would pass instantly. Don't invent a class-based completion condition.

## Site-by-site

| Site | Action |
| --- | --- |
| All 65 `networkidle` | Delete. Every one is followed by another wait, a retrying `expect`, an auto-waiting action, or a locator handle whose next use is a retrying `expect`. |
| Most `waitForTimeout` | Delete — retrying `expect` follows. |
| `verify-query-parameter-modals.spec.ts` nav test (~409/419) | `toPass()` retrying click, both directions. The bare `.textContent()` reads become `toHaveText` / `not.toHaveText`. |
| `verify-mulligan.spec.ts` :71/:88/:104/:111/:125/:130 | Delete all six. Keep the `Mulligan #2` assertion at :126. |
| `verify-library-grouping.spec.ts` flip loops (~:257, :342) | Delete the sleeps. The flip click's follow-up assertion (`Card N of M`) is *unchanged by the flip*, so it cannot detect a swallowed click either way — pre-existing test weakness, not introduced here, and out of scope to fix. Note it in the ticket. |

## Deliberately NOT doing

- **Not removing `{ force: true }`.** The owner flagged it as the underlying cause and worth
  questioning, but removing it is a second behavioral change (it was added "in case of viewport
  issues with modal positioning") and `toPass()` fixes the symptom regardless. One change at a
  time. Filing the question instead.
- Not touching app code, CSS, `game.js`, `verify.sh`, or the harness telemetry.
- Not touching `workers: 1` / `fullyParallel: false` / `data.db` — ticket 03.

## Verification

1. Baseline: full suite, warm `data.db`, wall clock recorded.
2. Sweep, then full suite **three times** — one green run doesn't distinguish fixed from lucky.
3. Query `mtg-fleet-verify` for the new `networkidle` / `waitForTimeout` step totals; compare
   like-for-like (warm to warm) and put the link in the ticket.
