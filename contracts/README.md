# contracts/ — the fleet's published language

The event contract the Spine publishes and every app translates itself into.
Language-neutral JSON Schema; the decisions behind it live in
`notes/DESIGN-event-contract-v0.md` (all six settled for v0).

## Files

- `envelope.v1.json` — the envelope every event wears. The file name carries the
  **envelope version**, bumped rarely (adding a `visibility` value, adding `scope`).
- `payloads/<name>.v<schemaVersion>.json` — one schema per event kind per version.
  Each `name` versions its payload independently; the envelope's `schemaVersion`
  field says which payload schema applies.

v0 catalog: `table.created`, `seat.taken`, `card.played`.

## The rules

- **Both sides validate on receipt.** The Spine (Ruby) validates every event it
  ingests against these files; the TS apps validate every event they receive from
  the Spine against the same files. Not shared types — shared schemas.
- **Fail loudly.** An unknown `name`, an unknown `schemaVersion`, or an envelope
  that doesn't validate is a hard error (HTTP 422 at the Spine, a thrown error in
  TS) — never a warning, never a best-effort parse. Consistent with
  `notes/DESIGN-persistence-versioning.md`: old data fails loudly; a deploy may
  invalidate a Table, and we accept that today.
- **Uniqueness travels with the event; truth-of-order stays with the log.**
  Senders mint `id` (idempotency — the Spine elides retried duplicates). The Spine
  assigns `seq` and `acceptedAt` on append; senders must not send them, and the
  Spine rejects an event that claims either.
- **`traceparent` is observability, not provenance.** Traces expire (~60d).
  Durable causality between events uses event `id` references, never trace ids.
  Provenance is the durable fields: `initiator`, `occurredIn`, `occurredAt`.
- **Visibility on every event.** In v0 the only legal value is `public` — the
  Shuffler sends only the public shadow of what it privately knows. New values are
  an envelope version bump that old readers reject loudly.
