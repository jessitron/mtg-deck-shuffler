# 24 — The Stack appears when a card is played, disappears when it's empty

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: task
Status: needs-triage
Blocked by: None — can start immediately

**What to build:** The Stack is only present on the table while it holds at least one
card. It appears in its map-10 position (the square's center) when the first card is
played onto it, and disappears when the last card is removed from it — clearing the
middle of the table for attack/defend activity during combat. If someone casts a spell
mid-combat, the Stack reappears; this flicker is accepted, not a bug to design around.

Design source: Jess, 2026-08-11 — wants the middle area free during combat, since the
Stack currently sits there permanently regardless of whether it holds anything.

Interacts with map 10's "The Stack instead of a row" geometry (`issues/10-the-square.md`)
and with whatever zone-presence/z-order mechanics `mtg-zone` already has — consult
`tabletop-shape-mechanics` before implementing, since this is a shape appearing/disappearing
based on document state rather than a one-time layout decision.

Needs a decision this ticket doesn't make yet: whether "appear/disappear" is a real
shape create/delete, or a visibility toggle on an always-present shape. That choice
affects sync behavior and is worth resolving before implementation.

This is visible board state → Playwright: play a card onto an empty stack, see the
Stack zone appear; remove the last card from the Stack, see it disappear; play a second
card mid-combat, see it reappear.

- [ ] Stack is absent from the board when it holds zero cards
- [ ] Playing a card onto an empty Stack makes it appear in its map-10 position
- [ ] Removing the last card from the Stack makes it disappear
- [ ] The middle of the table is clear (no Stack) during combat when nothing is on it
- [ ] A card played mid-combat brings the Stack back
