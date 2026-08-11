# 04 — Append events to a table's log, contract-validated

Mountain: spine-tells-the-story
Ship: spine
Status: done

**What to build:** `POST /tables/:table_id/events` stays a plain synchronous
request/response endpoint — the only way to write to a table's append-only log. It
validates the envelope against `contracts/` (json_schemer or equivalent) and rejects a
bad envelope or an unknown name/version loudly. It dedups on the sender-supplied event
id (a duplicate is recognized, not double-appended) and assigns `seq`/`acceptedAt`
server-side. Inbound trace context is read from the HTTP `traceparent` header (standard
W3C propagation), never expected in the JSON body — and the persisted `Event` row stores
no trace field at all, in either direction.

This ticket also carries the envelope contract version bump: `contracts/envelope.v2.json`
currently has `traceparent` as a required top-level field; it becomes optional-or-removed
in whatever new version this lands on. Confirm the bump follows `contracts/README.md`'s
conventions before making it — `contracts/` is fleet-shared language, not something the
Spine redefines alone.

**Blocked by:** 03

- [x] `POST /tables/:table_id/events` with a valid envelope appends to the log and
      returns the assigned `seq`
- [x] Sending the same event id twice is recognized as a duplicate, not double-appended
- [x] A bad envelope or unknown name/version is rejected with a clear error, not
      silently ignored
- [x] `traceparent` is read from the request header; the endpoint does not require or
      expect it in the JSON body
- [x] The persisted `Event` row has no trace-context column
- [x] `contracts/envelope.v2.json` (or its successor version) no longer requires
      `traceparent` as a body field, following `contracts/README.md`'s versioning
      conventions
- [x] Domain unit tests cover dedup and contract-violation rejection without going
      through HTTP
- [x] HTTP integration tests hit the endpoint end-to-end and assert on status codes and
      response bodies
