# Journeys — Glossary

The framework speaks a travel lexicon, and the metaphors do work: each term names a
real mechanism, and the everyday sense of the word predicts the mechanism's rules.
Each entry links the ADR that owns the concept; the [guide](guide/README.md) shows
each in working code.

## The two foundations

Everything below rests on two decisions, in this order.

- **A process is a Journey** — the process itself becomes an object that outlives its
  steps and is its own record, rather than a call whose state is smeared across
  status columns, result objects, and callbacks.
  [ADR-0001](adr/0001-a-process-is-a-journey.md)
- **Every input and output is named** — that object declares every value it reads
  from the world and every effect it hands to the world, by name; nothing crosses the
  boundary anonymously. Reification comes first because a process must be an object
  before its boundary is worth naming.
  [ADR-0026](adr/0026-every-input-and-output-is-named.md)

## The core model

- **Journey** — a noun-ified process object owning one specific run of a multi-step,
  non-transactional task. Its own record: callers query the instance, not a result
  object. Disposable: an `over?` journey cannot be re-driven. The word "Journey"
  never appears in a class name. [ADR-0001](adr/0001-a-process-is-a-journey.md)
- **Stage** — one step of the process; declared with `stage def name … end` (or
  `stage :a, :b` over existing methods). Stage bodies are private. Inside a body,
  `stage :other` provisionally redirects the cursor, committing only if the stage
  completes. [ADR-0002](adr/0002-registers-itinerary-transactional-step.md)
- **Itinerary** — the ordered plan of stages: `:provision`, `:depart`, the declared
  stages in order, `:arrive`. `:finished` is the reserved terminal sentinel, reached
  only through `:arrive`. [ADR-0002](adr/0002-registers-itinerary-transactional-step.md)
- **Diversion** — a jump-only stage (`diversion def …`), reachable via `stage :name`
  but never walked by default; a completed diversion falls through to the itinerary
  position the cursor last held. [ADR-0002](adr/0002-registers-itinerary-transactional-step.md)
- **Registers** — the four pieces of framework state: **log** (append-only history
  of completed stages), **cursor** (`stage`: the stage to attempt next), **error**
  (from the most recent snag/failure), **enacted** (the effects ledger). The
  journey's own first-person account; only `journey_do_stage` writes them.
  [ADR-0002](adr/0002-registers-itinerary-transactional-step.md)
- **Conveyance** — the mover: the execution environment that drives a traversal, a
  stepping generator over the journey. The inline loop is the default; the fiber
  conveyance runs drives as guests of a reactor. Driving the enumerator by hand is
  condoned. [ADR-0002](adr/0002-registers-itinerary-transactional-step.md)
- **`traverse` / `traverse!` / `continue`** — drive to a halt and return `self` /
  same but raise if parked on an error / step exactly once. Targets: `to:` (park on
  a stage), `through:` (stop after it commits), `wait: false` (stop rather than
  block on a wake). [ADR-0002](adr/0002-registers-itinerary-transactional-step.md),
  [ADR-0020](adr/0020-waits.md)
- **Stage predicates** — `at?(:name)` (cursor), `past?(:name)` (log-based, repeat
  tolerant), `ahead_of?(:name)` (`!past?`), plus generated `at_x?`/`past_x?` sugar.
  Unknown names raise eagerly. [ADR-0002](adr/0002-registers-itinerary-transactional-step.md)

## Outcomes

- **Snag** — a non-terminal error: `error!(value)` or a raised
  `StandardError`. Cursor holds, `error` set, retryable by stepping again.
  `snagged?` = `error?` && !`failed?`. [ADR-0003](adr/0003-terminality-is-declared.md)
- **Failure** — terminal, business-declared, from inside a running stage:
  `fail!(reason)`. The framework never infers failure from an exception.
  [ADR-0003](adr/0003-terminality-is-declared.md)
- **`fail_on`** — per-class declaration of which *raised* errors end a run instead of
  parking it; matchers are `===`-responders, accumulated and inherited. Reaches
  raises the stage never sees, including from inside an excursed child.
  [ADR-0003](adr/0003-terminality-is-declared.md)
- **Abandonment** — terminality declared from *outside* a parked run:
  `abandon!(reason)`. The world revoked the run's mandate (purge, revocation,
  retention sweep, stranded job). Same register footprint as `fail!`; a write plus a
  boundary save, not a throw. [ADR-0003](adr/0003-terminality-is-declared.md)
- **Wait** — the fourth outcome: parked, and nothing is wrong. *Snagged because
  something went wrong; on wait because something has not happened yet.*
  `waiting?`, `wait` (the standing value). [ADR-0020](adr/0020-waits.md)
- **`halted?` / `over?`** — nothing left to step right now (finished, snagged, or
  waiting) / terminal (finished or failed; what the disposability guard checks).
  [ADR-0003](adr/0003-terminality-is-declared.md)
- **`StageError`** — misuse of the machinery, in the `ScriptError` family; never
  caught by the failure path. `UnmetNeed`, `UndeclaredEnactment`, `StoreError`,
  `ListenerError`, `SnapshotVersionMismatch`, `UnpostableMail`, and
  `StepCapExceeded` all live here. [ADR-0003](adr/0003-terminality-is-declared.md)

## Needs and effects

- **Need** — a value the journey reads from the world, routed through the
  provisioner: class macro for whole-journey collaborators (warmed by the
  `:provision` stage), inline for one-stage reads; the block is the production
  default; `nil` from a provisioner means unprovided; unmet with no default raises
  `UnmetNeed`. [ADR-0005](adr/0005-needs-substitute-collaborators-never-authority.md)
- **Provisioner** — the needs-satisfier; the whole protocol is `provisioner[:name]`,
  so a Hash qualifies. `NullProvisioner` (provides nothing) is ambient by default.
  [ADR-0005](adr/0005-needs-substitute-collaborators-never-authority.md)
- **`provide` / `provide_once`** — spec-side counterparts to `need`: standing / next
  resolution only. `type: :journey` specs raise on any unprovided need.
  [Testing guide](guide/16-testing.md)
- **Enactment** — a declared pure output (return value unused): a write, delete,
  delivery, or recorded charge, handed over through the enactor. `enact def
  name!(payload)` declares; stages call the generated mediated entry point; returns
  `nil` always. [ADR-0006](adr/0006-enactments.md)
- **Enactor** — the effects-receiver, dual of the provisioner:
  `enactor.call(name, args, kwargs, action)`. `NullEnactor` (production) runs
  the action; a `TestEnactor` records to its **manifest** without executing.
  [ADR-0006](adr/0006-enactments.md)
- **Manifest** — the recorded set of enactments a `TestEnactor` accumulates;
  what `have_enacted(:name).with(...)` asserts against. Also: the declared set a
  sealed journey is held to. [ADR-0006](adr/0006-enactments.md)
- **`enacted` ledger** — the fourth register: effect names against handover times
  (never payloads), written when the enactor returns without raising, surviving
  arrival. `enacted?(:name)` is the re-entry guard; `enacted_at(:name)` the
  timestamp. [ADR-0006](adr/0006-enactments.md)
- **Discriminator (`unique_by:`)** — what makes one ledger entry under a name
  distinct; a callable over the payload or subscript sugar; must be a
  String/Integer/Symbol. A repeat handover is **elided** — skipped, with
  `:effect_elided` notifying in place of the silence. [ADR-0006](adr/0006-enactments.md)
- **Sealing** — `seal_enactments!` / `seal_needs!` / `seal_manifests!` close a
  declared set (inherited); `require_sealed_*` on a base class demands it of a
  family. **Guaranteed** (`guaranteed: true`) makes a declaration a promise checked
  at success. [ADR-0006](adr/0006-enactments.md)
- **A macro adds names, never replaces one** — the framework-wide invariant, enforced
  by a collision guard on every generated name: a def line defines exactly the method
  it appears to define. [ADR-0007](adr/0007-the-mediation-convention.md)
- **The bang pair** — what that invariant produces where a macro adds a sibling: `foo`
  is the mediated form (runs its seam), `foo!` the raw form the author wrote, and the
  bang is there because the bangless name is taken. Calling `foo!` from outside its
  own wrapper is **off-manifest** and mechanically detectable. Where the two forms
  would be different operations there is no pair and no bang (`post`, `wait`).
  [ADR-0007](adr/0007-the-mediation-convention.md)
- **`docket`** — the paperwork accompanying a declaration: a one-shot annotation
  consumed by the next declaration macro (plus a scoped block form); never sticky;
  inline options win. Spelled **`options`** by anyone who prefers it, and every
  error about a piece of paperwork uses the word its author wrote.
  [ADR-0007](adr/0007-the-mediation-convention.md)

## Composition

- **Excursion / `excurse`** — driving a sub-journey through the parent's own outfit,
  strictly, with listeners notified. Class form defers construction past a
  provisioner consult under a **synthesized name** (demodulized, underscored class);
  the named form (`excurse(:name) { … }`) is an ordinary need whose block defers
  construction, and is the form for a child whose class is a drive-time decision.
  [ADR-0012](adr/0012-excursions.md)
- **`excursion` (the macro) / driver** — a declared, named way to drive a child, plus
  the method that does it. Over a class, or over a **promoted body** (`excursion def
  name!`, or the block form), which generates a one-stage journey named on the
  declaring class. An argument-free call is a **single-occupant slot** that fills
  `@name` and rejoins rather than re-running; an argument-bearing one gets a fresh
  child per call. [ADR-0012](adr/0012-excursions.md)
- **`journey { … }`** — a constructor yielding an anonymous journey class, at class
  and instance level; naming it (`journey(:name) { … }`) `const_set`s it on the
  declaring class and is what keeps an inline child substitutable in a spec. The rung
  between a promoted body and a file of its own. [ADR-0012](adr/0012-excursions.md)
- **Guide** — middleware for a single excursion: a journey wrapping another journey,
  built from a maker, engaged by an unclaimed keyword (`retries: 3`). Governs the
  excursion that engaged it and nothing below. [ADR-0015](adr/0015-guides.md)
- **Condition strategy / `on_error:`** — the owner's interpretation of a child's
  trouble: `:propagate` (default) or `:return` (trouble as a pattern-matchable
  value); a block on the call is the anonymous spelling. Every rung of the default
  ladder is the owner's declaration. [ADR-0014](adr/0014-a-childs-trouble-is-the-owners-to-interpret.md)
- **`ChildFailed` / `Trouble` / `Muster`** — a failed child's exception into the
  owner's stage body / one child's trouble as a value
  (`{child:, reason:, failed:, snagged:}`) / a rejoin's roll-call
  (`{arrived:, troubled:}`, troubled made of Troubles). Troubles are flight-only.
  [ADR-0014](adr/0014-a-childs-trouble-is-the-owners-to-interpret.md)
- **Detachment / `detach` / `rejoin`** — splitting the party: N children in flight,
  all awaited. `detach` returns an undriven child; `rejoin` takes the outcome;
  concurrency is the outfit's business; trouble is taken at `rejoin`.
  [ADR-0017](adr/0017-detachments.md)
- **Succession / `exec`** — a tail call between journeys: hand the remaining work to
  a successor and never return. Provisional until the stage commits; fresh log,
  ledger reachable through `journey_predecessor`. [ADR-0016](adr/0016-succession.md)
- **Journey tree / stack / `Children`** — a parent's children, recursively, are a
  tree (the live `Children` register records what exists); the chain currently being
  driven is only its rightmost path. [ADR-0018](adr/0018-the-tree-walk-belongs-to-the-outfit.md)

## The outfit and its scopes

- **Outfit** — the whole execution bundle: conveyance, provisioner, enactor,
  launch strategy, condition strategy, listeners, courier, concierge. A frozen
  value, **derived (`with`), never manufactured**; choices fix at derivation, scopes
  are shared by reference; the verbs do the deriving.
  [ADR-0013](adr/0013-outfits-are-derived-never-manufactured.md)
- **Ambient outfit** — the always-present bottom rung: a process-wide null-kitted
  seed plus a fiber-local layer scoped by `Journey.outfitted`. Falling back is
  inheritance; manufacturing is erasure. [ADR-0013](adr/0013-outfits-are-derived-never-manufactured.md)
- **Fiber outfit** — `Journey.fiber_outfit`: a conveyance/concierge pair running
  every drive as a **guest** of one reactor desk (the **lobby**); suspends only at
  stage boundaries; unwinds to the inline resting state when it cannot progress.
  [ADR-0021](adr/0021-the-fiber-outfit.md)
- **Launch strategy** — where/when a run starts: inline, or enqueue
  `Briefasaurus::JourneyJob` via `.launch`. Never a bespoke job class.
  [ADR-0010](adr/0010-persistence-is-an-observation.md)

## Mail

- **Mail** — journeys talking to each other: addressed, matched (`===`), and
  **freight** (`Ractor.shareable?`, enforced under every outfit). The payload is the
  message; there is no envelope. [ADR-0019](adr/0019-mail.md)
- **`post` / `receive`** — fire-and-forget send to a handle (returns `nil`, never
  blocks) / take the mail a journey declared an interest in; unfulfilled, it parks
  on a mail-shaped wake. Inline and declared (`stage receive def name!(mail)`)
  forms. [ADR-0019](adr/0019-mail.md)
- **`Journey::Handle`** — the opaque token naming a journey for delivery; grants
  exactly one right — to post. Flight-only. [ADR-0019](adr/0019-mail.md)
- **Courier** — the outfit's mail component: mints handles, accepts posts, holds the
  unclaimed, hands over what matches. A scope; replacing it at a derivation draws a
  **postal boundary**. **Deputize** is its bookkeeping for the excursion chain
  claiming a blocked ancestor's mail; **unclaimed mail** (held for a journey that is
  over) is announced, never silently dropped. [ADR-0019](adr/0019-mail.md)
- **Step cap** — the strict test-mode diagnostic that turns an accidental stage loop
  into `StepCapExceeded` carrying the log's tail, instead of a hung spec.
  [ADR-0019](adr/0019-mail.md)

## Waiting

- **`wait`** — the gate: passes when the wake is due, parks when it is not; retry is
  stage re-entrancy. Every form spells its condition with a preposition, and
  `waiting_on` is the reader that answers in the same word.
  [ADR-0020](adr/0020-waits.md)
- **Wakes by name** — an unclaimed keyword names a wake and its value is that wake's
  one argument (`wait for: 5.minutes`, `wait mail: Confirmation`, `wait quota: user`),
  resolved through the registry then by convention. `on:` takes a wake already built,
  in practice a composite. Exactly one condition, or it raises.
  [ADR-0020](adr/0020-waits.md)
- **`Wake`** — a readiness condition: `Wake.at`, `Wake.after`, `Wake.readable` /
  `writable`, `Wake.mail`, composed with `|`. `due?(now:)` is the poll floor;
  `offer(desk)` is what an outfit could block on. A class answering `for_journey`
  owns its own construction, which is how a mail wake gets a courier and a handle no
  call site named. No `Wake.all`; a timeout is a wake composed in, never a modifier.
  [ADR-0020](adr/0020-waits.md)
- **Concierge** — the outfit's waiting component: one clock (`now`) and
  `attend(wait) → :proceed | :parked | :stuck`. It can cause a step and never
  writes a register. The `TestConcierge` is a frozen virtual clock a spec `advance`s.
  [ADR-0020](adr/0020-waits.md)
- **Stuck** — a park nothing present can satisfy or wait out; a rejoin round of
  stuck members is a deterministic deadlock report. [ADR-0020](adr/0020-waits.md)
- **Anchor rule** — a relative wake resolves once, at its first park; re-entry
  matching the same `wake_key` reuses the resolved `wake_at`, so backoffs never
  slide. One relative wake per stage. [ADR-0020](adr/0020-waits.md)

## State across boundaries

- **Snapshot** — the frozen, detached capture of resumable state: four registers
  plus declared members; `Class.from_snapshot` rehydrates a fresh instance. *State
  round-trips, control re-derives.* [ADR-0008](adr/0008-snapshots.md)
- **`snapshot` (macro)** — declares which ivars round-trip, with per-member options:
  an Archetype (or Class / `[Class]` sugar), `capture:`/`restore:` lambdas, or
  `persist: false` for content that must never reach a column.
  [ADR-0008](adr/0008-snapshots.md)
- **`snapshot_version` / `snapshot_upcast`** — the schema-versioning pair: stamp
  every capture, bridge gaps with single-step upcasters, raise
  `SnapshotVersionMismatch` rather than guess. [ADR-0009](adr/0009-snapshot-schema-versioning.md)
- **Archetype** — the slot-appropriateness abstraction: `===` is the floor, with
  optional `#example` and `#to_data`/`#from_data`; `Archetype.for` resolves through
  an ordered chain ending at `Verbatim`. [ADR-0024](adr/0024-archetypes.md)
- **Store / `PersistenceListener`** — durability as observation: the listener
  `ActiveRecordJourney` installs projects `#snapshot` through the store at outcome
  events; registers map to ordinary columns; member columns drop at arrival and
  abandonment. `StoreError` / `StaleStoreError` classify refused writes.
  [ADR-0010](adr/0010-persistence-is-an-observation.md)
- **Visitor / tree walk** — the whole-tree operation, requested of the outfit: one
  callback per kind of element, node-offers-visitor-chooses for durable children,
  boundary-only when snapshotting, addresses from declarations.
  [ADR-0018](adr/0018-the-tree-walk-belongs-to-the-outfit.md)

## Observation

- **Listener** — any callable `listener.call(event, journey, **payload)`, notified
  after the fact across three additive scopes (outfit, per-journey, per-drive), read
  live. Describes, never decides; a raising listener propagates as `ListenerError`.
  [ADR-0011](adr/0011-listeners-describe-never-decide.md)
- **`TelemetryListener`** — the standard ambient listener mapping machinery events
  onto an injected telemetry adapter, configured by elision (`muted_stages:`,
  `redacted_keys:` — default `[:error]` — `level_threshold:`).
  [ADR-0011](adr/0011-listeners-describe-never-decide.md)
- **`QuarantinedListener`** — the production opt-out for a misbehaving listener:
  rescue wide, report through the standard funnel, optional wall-clock cap.
  [ADR-0011](adr/0011-listeners-describe-never-decide.md)
