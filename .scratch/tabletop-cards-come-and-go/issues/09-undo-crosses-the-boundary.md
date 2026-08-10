# 09 — Undo crosses the boundary

Mountain: tabletop-replaces-mural
Ship: fleet
Status: ready-for-agent

**What to build:** New schemas `undo.card.played.v1` and `undo.card.discarded.v1` — payload
`card` + `seat`, named by prefixing `undo.` to the full name of the event being undone. When
the Shuffler undoes a play or a discard, it emits the matching undo event. The Tabletop
poofs the shape wherever it's been moved on the board (identified by `instanceId` prop);
attachments stay behind, detached. Both undo kinds are informational and distinct from each
other and from the opposite action — the log (and someday the Interpreter) should be able
to tell "play was undone" from "discard was undone."

**Blocked by:** 07 (poof-by-instanceId mechanism, send-then-commit pattern), 08 (discard
must exist as its own kind before its undo can).

- [ ] `undo.card.played.v1.json` and `undo.card.discarded.v1.json` schemas written
- [ ] Undoing a play in the Shuffler emits `undo.card.played.v1`; undoing a discard emits
      `undo.card.discarded.v1`
- [ ] The Tabletop poofs the shape on either undo kind, wherever it was moved;
      attachments stay, detached
- [ ] GameState unit tests: undo-play and undo-discard each produce the correct outbound
      event
- [ ] Playwright/integration: play → drag card elsewhere on table → undo in Shuffler →
      shape disappears from the table for all viewers
