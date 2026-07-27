# ADR-0011 — Listeners describe; they never decide

**Status:** accepted

## Context

The machinery once reached observers through three ad-hoc surfaces: a blank
after-stage hook (overridden for persistence), a per-journey observer list (ridden by
the verification instrument), and inline `emit("journey.*")` telemetry calls
hard-coded into the stepping path. Each consumer bolted observation on differently,
and one bug class kept recurring: a listener that raised from inside a stage was
written into `#error` as though the business had snagged — a retry then re-ran the
stage, listener bug and all.

## Decision

**Observation is one orthogonal layer.** A listener is any callable —
`listener.call(event, journey, **payload)` — notified at boundaries and
resolution/enactment moments, never arbitrary mid-stage points. Events:
`stage_started`, `stage_committed`, `stage_snagged`, `stage_waiting`,
`journey_failed`, `journey_abandoned`, `journey_finished`, `need_resolved`,
`effect_enacted` (describes by default; payload values are explicit opt-in),
`effect_elided`, `excursion_started`/`excursion_ended`, and the mail events.

- **The registers are the journey's own first-person account**; `journey_do_stage`
  is their only writer. A listener reads that account and never writes it. A
  listener's return value is discarded.
- **Three additive scopes** — the outfit's shared list, the journey's own, and a
  drive's `listeners:` — all fire together, read live on every notification.
  Attaching one never silences another.
- **A raising listener is a bug in that listener, not a business outcome.** The
  machinery never rescues on its behalf: `journey_notify` wraps a listener's
  `StandardError` in `ListenerError` (a `StageError`), so it can never fold into a
  snag — "the listener broke" and "the business snagged" are different incidents.
  A persistence listener's `StoreError` passes through unwrapped, so a store failure
  is never relabeled a listener bug.
- **Quarantine is the production opt-out**: `QuarantinedListener` rescues wider than
  `StandardError` (a quarantine that let `Timeout::Error` through would not be one),
  reports through the standard error funnel, and takes an optional wall-clock cap for
  the listener that hangs. Opt-in, because propagating is right for a bug.
- **`TelemetryListener` is the standard listener**, installed ambiently at boot; it
  maps outcome events onto an injected telemetry adapter (never reaching for the
  facade itself) and is configured by elision — `muted_stages:`, `redacted_keys:`
  (default `[:error]`, since a plain error value may carry email content;
  `exception:` is never elided), `level_threshold:`. Journeys never emit the
  machinery's lifecycle telemetry inline; they emit only their own domain events.
- **Diagnostics are listeners, not machinery conditionals** — a warning is an
  observation with an opinion. Diagnostics warn, never raise; a strict bundle may
  raise in test, where a raise is the point (the test step cap —
  [ADR-0019](0019-mail.md) — is this rule in action).
- Crosscutting behavior that **changes flow** is never a listener; that is a guide
  ([ADR-0015](0015-guides.md)).

## Consequences

- Persistence ([ADR-0010](0010-persistence-is-an-observation.md)), telemetry,
  verification, and future span/OTel consumers all plug into one seam.
- A walk is readable off `stage_committed`/`stage_snagged` — subscribe to the pair
  and you see every stage attempted, in order.
- Hosts choose their diagnostic posture by attaching listeners, without forking the
  machinery.
