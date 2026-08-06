# Keep/kill: card-actions-and-undo

Mountain: safe-harbor
Type: grilling
Status: needs-triage

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
