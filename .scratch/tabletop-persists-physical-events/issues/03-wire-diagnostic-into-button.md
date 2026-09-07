# 03 — Wire the diagnostic into the button, with full telemetry

**What to build:** The button from ticket 01 now runs the real diagnostic from ticket 02
instead of its placeholder span. The client only snapshots the live canvas (the one thing
that must happen in the browser, since `snapshotCanvas` needs the live tldraw `editor`)
and posts that snapshot to a new server route; the server replays the table's log through
`projectEvents` (using ticket 10's history fetch), diffs it against the submitted
snapshot, and records the result as telemetry — a summary span plus, on mismatch, full
JSON dumps. This is the first end-to-end "does the log match the canvas?" answer a player
can trigger, even though it only checks card presence so far.

**Blocked by:** 01, 02, 10 (server needs a way to fetch a table's real event history to
replay).

**Status:** ready-for-agent

- [ ] Button's click handler calls `snapshotCanvas` (from ticket 02) and POSTs the
      resulting `TableState` to a new server route (e.g.
      `POST /api/tables/:tableName/diagnostics`), in place of the placeholder logic from
      ticket 01.
- [ ] The new server route fetches the table's event history (ticket 10), runs
      `projectEvents` + diff (from ticket 02) against the submitted live `TableState`.
- [ ] The run is wrapped in the server's `inSpan()` helper with summary attributes:
      `diagnostic.shape_count`, `diagnostic.discrepancy_count`, `diagnostic.match`,
      `diagnostic.discrepancy_kinds`.
- [ ] When `diagnostic.match` is false, the full projected `TableState`, the full live
      `TableState`, and the full discrepancy list are each logged in full (via the
      server's `log.ts`, one log call each — not summarized, not `span.addEvent`).
- [ ] Spin animation still triggers on click regardless of the response.
- [ ] The server route is tested directly (like `cardReturned.test.ts`) against a captured
      span/log recorder, for both outcomes: a matching pair (span only,
      `diagnostic.match: true`, no logs) and a deliberately desynced pair (span plus all
      three full-JSON log calls, `diagnostic.match: false`).
- [ ] The client's click handler is tested separately: it posts the right snapshot and
      spins regardless of the server's response.
