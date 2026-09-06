# 03 — Wire the diagnostic into the button, with full telemetry

**What to build:** The button from ticket 01 now runs the real diagnostic from ticket 02
instead of its placeholder span: replay a table's log through `projectEvents`, snapshot
the live canvas through `snapshotCanvas`, diff the two, and record the result as
telemetry — a summary span plus, on mismatch, full JSON dumps. This is the first
end-to-end "does the log match the canvas?" answer a player can trigger, even though it
only checks card presence so far.

**Blocked by:** 01, 02.

**Status:** ready-for-agent

- [ ] Button's click handler calls `projectEvents` + `snapshotCanvas` + diff (from
      ticket 02) in place of the placeholder logic from ticket 01.
- [ ] The run is wrapped in the Tabletop's `inSpan()` helper with summary attributes:
      `diagnostic.shape_count`, `diagnostic.discrepancy_count`, `diagnostic.match`,
      `diagnostic.discrepancy_kinds`.
- [ ] When `diagnostic.match` is false, the full projected `TableState`, the full live
      `TableState`, and the full discrepancy list are each logged in full (via the
      Tabletop's logger, one log call each — not summarized, not `span.addEvent`).
- [ ] Spin animation still triggers on click regardless of outcome.
- [ ] Tested by invoking the click handler directly (no real click simulation) against a
      captured span/log recorder, for both outcomes: a matching pair (span only,
      `diagnostic.match: true`, no logs) and a deliberately desynced pair (span plus all
      three full-JSON log calls, `diagnostic.match: false`).
