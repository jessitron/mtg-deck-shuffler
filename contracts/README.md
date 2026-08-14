# contracts/ — the fleet's published language

This documents events flowing between the Spine and each other ship.

Events are published to the Spine with a POST. Events are received from the Spine by SSE (server-sent events) subscription.

Constraints:

1. Components (ships) are deployed at different times. Events need to be backwards-compatible at a scale of hours.
2. Games might be interrupted and finished later. Logs need to be readable on a scale of days.

These are short time-frames, so we're not looking at infinite backwards-compatibility here. We can be nice.

## Versioning

The envelope is versioned, and expected to advance very rarely.

Each event name is versioned, and expected to advance whenever useful.

Add optional field: no version bump

Add required field: version bump

Change the type of a field (eg, one commander to an array of commanders): version bump

Semantic change: at least a version bump, and consider a new event type.

## Files

envelope

payloads/

# PREVIOUS CONTENT

The event contract the Spine publishes and every app translates itself into.
Language-neutral JSON Schema; the decisions behind it live in
`notes/DESIGN-event-contract-v0.md` (all six settled for v0) and
`notes/DESIGN-schema-evolution-policy.md` (why the envelope and payloads are strict
differently, decided after v0).

## Files

- `envelope.v3.json` — the envelope every event wears. The file name carries the
  **envelope version**, bumped rarely (adding a `visibility` value, adding `scope`).
  `envelope.v1.json` and `envelope.v2.json` are kept as history, not deleted — never
  edit a shipped version file in place, bump instead. v2 added `origin` (which
  mechanism, within `occurredIn`, minted the event — see
  `.scratch/tabletop-table-reports/issues/01-every-event-carries-its-origin.md`) and
  `significance` (`physical` | `domain` | `administrative` — what kind of fact the
  event states). v3 dropped `traceparent` as an envelope field entirely: inbound, it
  travels in the HTTP `traceparent` header (standard W3C propagation), never in the
  body; outbound (SSE), it travels alongside the envelope as `meta.traceparent`, not
  merged into it (`.scratch/spine-roda-rewrite/spec.md`). The persisted event carries
  no trace field in either direction.
- `payloads/<name>.v<schemaVersion>.json` — one schema per event kind per version.
  Each `name` versions its payload independently; the envelope's `schemaVersion`
  field says which payload schema applies.

v0 catalog: `table.created`, `seat.taken`, `seat.joined`, `card.played`.

## The rules

- **Both sides validate on receipt.** The Spine (Ruby) validates every event it
  ingests against these files; the TS apps validate every event they receive from
  the Spine against the same files. Not shared types — shared schemas.
- **Fail loudly.** An unknown `name`, an unknown `schemaVersion`, or an envelope
  that doesn't validate is a hard error (HTTP 422 at the Spine, a thrown error in
  TS) — never a warning, never a best-effort parse. Consistent with
  `apps/shuffler/notes/DESIGN-persistence-versioning.md`: old data fails loudly; a deploy may
  invalidate a Table, and we accept that today.
- **Payload schemas ignore properties they don't recognize** (`additionalProperties:
true`, every `payloads/*.json` file, decided 2026-08-11) — a newer sender's extra,
  optional field reaches an older receiver as a no-op instead of a hard validation
  failure. This is _narrower_ than "fail loudly": known fields still type-check
  (wrong type, bad pattern, missing `required` all still reject); only genuinely
  unrecognized properties pass through unexamined. **The envelope schemas keep
  `additionalProperties: false`**, permanently — full reasoning, including why the two
  layers need different policies, in `notes/DESIGN-schema-evolution-policy.md`. Short
  version: the Shuffler, Tabletop, and Spine deploy independently, not in lockstep, so
  a payload only needs to tolerate a temporary rollout window; the envelope has no
  per-field version dial to fall back on, so its strictness is what makes "a new field
  needs a version bump" actually enforceable.
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
- **`origin` names the mechanism, `significance` names the kind of fact.** `origin`
  is an open, dot-namespaced string (same shape as `name`) identifying which code
  path minted the event, one level more specific than `occurredIn`. `significance`
  is a closed three-value enum (`physical` / `domain` / `administrative`) —
  orthogonal to `origin`: a `physical` event and a `domain` event can both come
  from the same app and the same gesture (e.g. a drag fires both
  `card.repositioned`, physical, and `card.moved`, domain).
