# 15. Listeners and telemetry: observation

A listener is any callable — `listener.call(event, journey, **payload)` — notified
after the fact at boundaries and resolution/enactment moments. **Listeners
describe; they never decide**
([ADR-0011](../adr/0011-listeners-describe-never-decide.md)): the registers are the
journey's own account, a listener's return value is discarded, and nothing a
listener does can change what the journey says happened.

## Events

| Event | Payload | Fires |
|---|---|---|
| `:stage_started` | `stage:` | before a stage body runs |
| `:stage_committed` | `stage:` | a stage completed (also for `:finished`) |
| `:stage_snagged` | `stage:`, `error:` | a stage snagged |
| `:stage_waiting` | `stage:`, `wait:` | a stage parked waiting; the `TelemetryListener` renders the `Wait` as `waiting_for:`/`wake_at:` at `:info`, since a wait is not a warning |
| `:journey_failed` / `:journey_abandoned` / `:journey_finished` | `stage:, error:` / `reason:` / — | terminal moments |
| `:need_resolved` | `need:`, `provided:` | provisioner vs default, distinguished |
| `:effect_enacted` / `:effect_elided` | `effect:` (values opt-in) / `effect:`, `discriminator:` | a handover ran / a `unique_by:` repeat was skipped, on purpose |
| `:excursion_started` / `:excursion_ended` | `child:` | around a sub-journey drive |
| `:mail_posted` / `:mail_received` / `:mail_awaited` / `:mail_unclaimed` | names and classes, never content | the courier's moments |

A walk is the `stage_committed`/`stage_snagged` pair: subscribe to both and you
see every stage attempted, in order, whatever the outcome.

## Wiring

Three scopes, **all additive**, read live on every notification — attaching one
never silences another:

```ruby
Journey.ambient_outfit.listeners << auditor       # the outfit scope (shared by reference)
run.journey_listeners << my_listener              # this journey
run.traverse(listeners: [debug_listener])         # this drive
```

**A raising listener propagates** — a bug in the listener, not a business outcome.
`journey_notify` wraps its `StandardError` in `ListenerError` (a `StageError`), so a
stage rescue can never mistake a broken reader for a snag; a store failure passes
through unwrapped. The production opt-out is quarantine:

```ruby
Briefasaurus.quarantine(listeners, within: 0.5)   # rescue wide, report, carry on; cap the hang
```

## Telemetry

`Journey::TelemetryListener` is installed ambiently at boot and produces the
`journey.*` machinery telemetry — **journeys never emit those inline**; a stage body
emits only its own domain events (`emit("extraction_run.started", …)`). Configure
the listener by what *not* to say: `muted_stages:`, `redacted_keys:` (default
`[:error]` — a plain error value may carry email content; `exception:` is never
elided, backtraces need it), `level_threshold:`. The adapter is injected at
construction; the class never reaches for the facade.

**Diagnostics are listeners too** — a warning is an observation with an opinion.
The rule of the family: warn, never raise; a strict bundle may raise in test, where
a raise is the point (the step-cap listener is the shipped example — default 100
stage attempts per spec, `StepCapExceeded` carrying the log's tail).

Flow-changing behavior is never a listener — that's a guide
([chapter 8](08-guides.md)).

## How it's tested

A listener is a lambda and a list; nothing needs framework help:

```ruby
it "announces the walk in order" do
  events = []
  run.traverse(listeners: [->(event, _journey, **payload) { events << [event, payload[:stage]] }])

  expect(events).to include([:stage_committed, :fetch_audio], [:stage_committed, :transcribe])
end

it "elision is observable, not silent" do
  events = []
  run.traverse(listeners: [->(event, *, **) { events << event }])
  expect(events).to include(:effect_elided)
end
```

## Pitfalls

| You wrote | Instead |
|---|---|
| `emit("journey.…")` from a stage body | The ambient `TelemetryListener` already covers machinery lifecycle; emit only domain events |
| A listener mutating the journey or deciding flow | Listeners read; guides decide |
| Swallowing listener errors in the machinery's name | Propagate is the default; wrap in `quarantine` for production tolerance |
| Replacing the listener list to add one | Scopes are additive — append |
| A diagnostic that raises in production | Diagnostics warn; strict raises belong in test |
