# Name the send-then-commit failure protocol

Mountain: overhead
Ship: shuffler
Type: task
Status: needs-triage

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
