# 06 — Admin screen, live

Mountain: spine-tells-the-story
Ship: spine
Status: ready-for-agent

**What to build:** `/admin/tables` shows every table (index) and, per table, its full
event log in order (show). The show page subscribes to that table's SSE stream (ticket
05) and appends new rows live as events arrive — no reload, replacing today's 5-second
full-page-reload poll. Honeycomb trace links render at receive time from each event's
`meta.traceparent` in the live envelope; rows already in the log before the page was
opened simply have no link, since trace context is ephemeral rather than durable. No
auth, no pagination/filtering/search — same as today.

**Blocked by:** 05

- [ ] `/admin/tables` lists every table that currently exists
- [ ] A table's admin show page lists its full event log in order
- [ ] Appending a new event to a table (via ticket 04) makes it appear on that table's
      open admin show page live, with no reload
- [ ] Each event shown while the page is live-subscribed carries a working Honeycomb
      trace link, built from that event's `meta.traceparent`
- [ ] Rows that existed in the log before the admin page was opened render without a
      trace link (no stored trace column to fall back on)
- [ ] HTTP integration tests cover the index and show routes end-to-end
