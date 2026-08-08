# Name the send-then-commit failure protocol

Mountain: overhead
Ship: shuffler
Type: task
Status: resolved

## Context

Architecture review candidate #5 (Speculative). Understanding "what happens when the tabletop
rejects a play" today means bouncing across four files, cross-referenced only by scattered
`JES-127` comments, not a shared type or function:

- `app.ts` — the try/catch around `sendCardToTableFirst` in `/play-card`/`/discard-card`,
  setting `HX-Retarget`/`HX-Reswap` and status 502
- `src/port-tabletop/sendToTable.ts` — `sendCardToTableFirst`'s doc comment on the
  send-then-commit invariant
- `src/view/play-game/game-modals.ts` — `formatTabletopSendErrorModal`, the actual message
- `src/view/common/html-layout.ts` — the `htmx.config.responseHandling` entry that tells the
  browser a 502 still means "swap this in, but mark it an error," which is what makes
  `game-modals.ts`'s `event.detail.successful` close-or-not-close branch work

## What to change

Marked speculative in the original review: the four-way split follows real seams (route /
gateway / view / layout), so this is a **documentation** deepening, not a structural one. A
single canonical statement of the contract — a comment block in one of the four files, or a
short `notes/` doc — that the other three reference, would make the four-file bounce a
one-stop lookup without changing runtime code.

Worth doing only if the `JES-127` comment trail keeps confusing whoever touches this next —
not urgent on its own. If ticket 02 (the veto hook) lands first, do this ticket as part of
that work rather than separately, since ticket 02 will already be reading all four files.

## Ship

`apps/shuffler/` only. Documentation-only; no test changes.

## Answer

Resolved 2026-08-08. The canonical statement is a new doc,
`apps/shuffler/notes/DESIGN-send-then-commit.md`, following the ship's `DESIGN-*.md`
convention — the protocol crosses four modules (route / command protocol / gateway /
view / layout), so no single code file was a natural home. It states the invariant
(send FIRST, mutate+persist only on success; failure blocks the action), the why, the
retry/dedup safety, the contrast with best-effort `seat.joined`, and the six stations
a failure travels in order: `sendCardToTableFirst` → `sendCardBeforeMutate` →
`applyGameCommand`'s `send-failed` outcome → `renderCommandOutcome`'s 502 +
HX-Retarget → htmx `responseHandling`'s `{502, swap:true, error:true}` → the
conditional close-modal in the Play/Discard button.

Each of the five code sites got a one-line pointer ("Full protocol, all stations:
notes/DESIGN-send-then-commit.md"), and CLAUDE.md § Table Mode links it. Note the
ticket's snapshot predated ticket 02: the app.ts try/catch it described is now the
`beforeMutate` hook — the doc describes today's shape. No runtime changes; build and
all 302 tests green.
