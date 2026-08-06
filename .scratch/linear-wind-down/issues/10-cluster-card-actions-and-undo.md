# Keep/kill: card-actions-and-undo

Mountain: overhead
Type: grilling
Status: resolved

## Question

Which of these 6 survive into `TODO.md`?

*Theme: moving a card on the Shuffler's game screen, seeing it move, and taking it back.*

- **JES-85** — track how cards got to the table; add discard/exile buttons. Strongest item here:
  real user feedback (2026-08-01) that players *delete cards from the whiteboard* to mean
  "discard." ⚠️ Cross-reads with **JES-149** (cluster 6) — that's the Tabletop half of the same
  confusion. Decide both halves together.
- **JES-84** — animate card movement using HTMX position data. Has the `animations` owner —
  consult it. Idea-shaped rather than spec-shaped, but the sketch is concrete.
- **JES-81** — play counter in the command zone (commander tax). Small, self-contained, genuinely
  useful in play.
- **JES-82** — make cmd-Z trigger undo. 🛑 **Already done.** `apps/shuffler/public/game.js:304-318`
  binds ctrl/cmd-Z, guarded against text inputs and open modals. Delete on sight; no discussion
  needed.
- **JES-83** — notify what was undone on ctrl-Z (a toast). ✅ Open — verified no toast anywhere in
  the Shuffler. Now the natural follow-on to the shipped JES-82.
- **JES-99** — do we want redo? ⚠️ **A question, not work.** `GameEvents.ts:176` already throws
  "Cannot undo an undo, use redo instead", so the code anticipates redo without implementing it.
  If kept, it's a decision to make, not a task to file.

## Answer

**Six issues become four `TODO.md` § Backlog lines: one killed as shipped, one pair merged into a
single line, no merges into existing inbox lines, no cross-cluster deferrals.**

Safe-harbor cluster, so no `← mountain:` marker and everything lands in `## Backlog` (which was
empty — these four are its first entries). Keep/kill called by the agent under Jess's delegation
(2026-08-06): *"dude I don't care, what will help you get it done?"*

### JES-82 — **killed**, already shipped

Confirmed at `apps/shuffler/public/game.js:298-318`: a `keydown` listener binds ctrl/cmd-Z (rejecting
shift/alt), skips `INPUT`/`TEXTAREA`/`contentEditable`, skips while `.modal-overlay` or
`.card-modal-overlay` is present, and clicks the live `.undo-button` inside the hamburger menu so
the current event index and expected-version ride along. Nothing left to do; no trace kept.

### JES-83 + JES-99 — **kept, merged into one line** (`finish-undo`)

Both are the same unfinished corner of one shipped feature, and neither is worth a line of its own.
Verified: **no toast anywhere in the Shuffler** (no `toast` match in `src/`, `public/`, or `views/`),
and `GameEvents.ts:176` still throws `"Cannot undo an undo, use redo instead"` — the code
*anticipates* redo without implementing it. So the line carries a task (say what was undone) and a
decision (do we want redo), which is exactly the "fewer, richer lines" shape. The redo question
stops being idle now that JES-82 shipped: cmd-Z is a reflex key, and a reflex key with no
counterpart is where people get hurt.

### JES-85 — **kept**, rescoped to the Shuffler half only (`exile-and-table-provenance`)

Its headline is half-false today. **Discard shipped** with JES-127: `POST /discard-card`
(`app.ts:1391`), `MoveCardEvent.verb?: "discard"` (`GameEvents.ts:43`), `GameState.discardCard`
(`GameState.ts:548`), and `nameMoveCardEvent` already renders "Discard" instead of location-derived
"Play". What is genuinely still open is narrower and worth writing down precisely:

- there is **no exile** verb or action — `verb` is typed as the literal `"discard"`, so exile is a
  type change plus a route plus a modal button;
- the **"Cards on Table" modal still shows bare names**: `formatTableCardListHtmlFragment` in
  `src/view/play-game/game-modals.ts` maps table cards to a card-name link and nothing else, even
  though the event log already knows how each one got there.

The real-user provenance (Jess's college kid and friends, 2026-08-01, deleting cards off the
whiteboard to mean "discard") stays on this line, because the fix it argues for is *dedicated
actions instead of ad-hoc deletion* — a Shuffler concern. **Not deferred to cluster 6:** the ticket
flagged a cross-read with JES-149, but cluster 6 already resolved and wrote `tabletop-card-shape`
into `## Next`, where zone-entry detection is covered. Splitting a Tabletop sub-bullet off this
issue would duplicate that line, so the new line just names it in prose instead.

### JES-84 — **kept** (`animate-card-to-table`), and it is stronger than it looked

The ticket called it "idea-shaped rather than spec-shaped." The `animations` owner's history turns
it into a live proposal: `owners/animations/history.md` records that the card-play **exit animation
was broken for months and fully removed in `943ece6`**, and that "the client-driven exit animation
pattern (JS class + HTMX swap delay) was abandoned. If exit animations are desired in the future, a
different approach will be needed." JES-84 *is* a different approach — send the card's current
position up with the HTMX request, let the server compute the destination and render the transition,
which keeps it inside the existing server-driven `WhatHappened` model rather than fighting the swap.
Everything today is entrance-only. That's a keep.

### JES-81 — **kept** (`commander-tax-counter`)

Verified absent: no `castCount`, `commanderTax`, or any play counter in `src/`. The command zone is
real and rendered (`shared-components.ts:125`, `formatCommandZoneHtmlFragment`), so this is a small
addition to an existing surface. Deliberately **not** merged into `playmat-command-zone` — that line
is the *Tabletop's* player-area drawing under the active Mountain; the two share a word, not a
concern.

### No merges into existing inbox lines

Ticket 01 flagged four overlap candidates (`deck-title-placement`, `playmat-command-zone`,
`no-doubleclick-crop`, `animate-tap`); all four are Tabletop, active-Mountain lines and none of them
overlaps this Shuffler cluster. `animate-tap` is the near-miss — it is tldraw shape rotation on the
Tabletop, not HTMX card movement on the Shuffler's game screen. Kept apart.

### No `JES-` left in prose

All four new lines carry `JES-` only in their `← was:` labels, so
[ticket 05](05-cut-the-linear-pointers.md) gains no new sites.
