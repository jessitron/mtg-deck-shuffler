# 03 — Wire the diagnostic into the button, with full telemetry

**What to build:** The button from ticket 01 now triggers the real diagnostic from ticket
02, run entirely on the server. The server already holds everything it needs: the live
canvas state, via `entry.room.getCurrentSnapshot()` (the same `TLSocketRoom` `rooms.ts`
already keeps per table — no client round-trip needed to know what's on the canvas), and
the table's event history, via ticket 10's Spine fetch (fetching it again on every click is
fine — this is a one-shot diagnostic, not a hot path). The click handler's only job is to
POST a request; the server replays the log through `projectEvents`, snapshots its own room
through a records-based snapshot, diffs the two, and records the result as telemetry — a
summary span plus, on mismatch, full JSON dumps. This is the first end-to-end "does the log
match the canvas?" answer a player can trigger, even though it only checks card presence so
far.

**Blocked by:** 01, 02, 10 (server needs a way to fetch a table's real event history to
replay).

**Status:** ready-for-agent

- [ ] Extract a pure `snapshotFromRecords(records: TLRecord[]) -> TableState` out of ticket
      02's `snapshotCanvas(editor)`, so the same shape-reading logic works from either a
      live `Editor` (browser) or a `TLSocketRoom`'s record set (server). `snapshotCanvas`
      becomes a thin wrapper over it (`snapshotFromRecords(editor.getCurrentPageShapes())`
      or equivalent) — ticket 02's existing editor-based tests must keep passing unchanged.
- [ ] Button's click handler POSTs to a new server route (e.g.
      `POST /api/tables/:tableName/diagnostics`), no body needed, in place of the
      placeholder logic from ticket 01.
- [ ] The new server route: fetches the table's event history (ticket 10), runs
      `projectEvents` on it, runs `snapshotFromRecords` against the room's own
      `getCurrentSnapshot()`, and diffs the two (all from ticket 02).
- [ ] The run is wrapped in the server's `inSpan()` helper with summary attributes:
      `diagnostic.shape_count`, `diagnostic.discrepancy_count`, `diagnostic.match`,
      `diagnostic.discrepancy_kinds`.
- [ ] When `diagnostic.match` is false, the full projected `TableState`, the full live
      `TableState`, and the full discrepancy list are each logged in full (via the
      server's `log.ts`, one log call each — not summarized, not `span.addEvent`).
- [ ] Spin animation still triggers on click regardless of the response.
- [ ] The server route is tested directly (like `cardReturned.test.ts`) against a captured
      span/log recorder, using a real in-memory `TLSocketRoom` seeded with records (no
      browser, no editor) and a stubbed event-history fetch, for both outcomes: a matching
      pair (span only, `diagnostic.match: true`, no logs) and a deliberately desynced pair
      (span plus all three full-JSON log calls, `diagnostic.match: false`). This is
      significantly easier to set up than a browser-editor-based test would have been.
- [ ] The client's click handler is tested separately: it POSTs to the route and spins
      regardless of the response.
