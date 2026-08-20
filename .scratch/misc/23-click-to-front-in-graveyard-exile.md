# 23 — Clicking a card in the graveyard or exile brings it to front

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: task
Status: ready-for-agent
Blocked by: None — can start immediately

**What to build:** With overlapping cards in the graveyard, clicking the one behind
brings it to the front — and it stays in front. Clicking any card inside the graveyard
or exile does "bring to front" automatically. Persistent and synced: z-order is
document state, so the reorder travels to every browser like any other change. Exile
behaves the same (there it matters most — its cards stack directly on top of each
other).

Scoped to the graveyard and exile zones, not the whole board. This composes with —
never replaces — whatever click already does on a card.

Design source of truth: the spec's "Click-to-front in graveyard and exile"
implementation decision (added 2026-08-08 from Jess's user story 29).

Click handling on cards is exactly the territory with known selection-deferral watch
points — consult `tabletop-shape-mechanics` before implementing.

This is client pointer mechanics → Playwright, few and behavioral: stack two cards in
the graveyard, click the buried one → it renders on top, and still does in a second
browser context and after further clicks elsewhere.

- [ ] Clicking a card in the graveyard brings it to the front of the z-order
- [ ] It stays in front afterward (persisted, synced to other browsers)
- [ ] Same behavior in exile
- [ ] Clicking a card elsewhere on the board does not gain this behavior
- [ ] Existing click behavior on cards still works
