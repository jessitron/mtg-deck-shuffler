# ADR-0013 — Outfits are derived, never manufactured

**Status:** accepted

## Context

A journey's execution environment is several cooperating strategies: how stages step
(conveyance), how needs are satisfied (provisioner), how effects land (enactor),
how runs launch, how a child's trouble reads (condition strategy), who carries mail
(courier), who watches waits (concierge), plus the listener scope. Wiring these
independently breaks the ones that must cooperate (a fiber conveyance's provisioner
must know to yield), and reaching for them through ambient facade globals gave the
framework three separate fiber-local reaches that were really one abstraction.
Building a fresh bundle mid-program has a worse failure: a fresh object answers
"nothing" to every decision the app already made — and reads as a deliberate answer.

## Decision

**The `Outfit` is the whole execution bundle, a frozen value, derived rather than
built.**

- Slots: conveyance, provisioner, enactor, launch strategy, condition strategy
  (`on_error`), listeners, courier, concierge, (reserved) stack. **Choices fix at
  derivation; scopes are shared by reference** — the listener list, courier, and
  concierge are live tree-spanning state a derivation inherits unless it replaces
  them (replacing the courier draws a postal boundary; replacing the concierge gives
  a subtree its own clock). Nothing is cached: every read goes through the outfit at
  the moment of use.
- **Derivation is `with`** — Ruby's own copy-with-changes over a frozen `Data`,
  stamping `derived_from:` so the outfit tree has edges. `Outfit.new` belongs where a
  program starts; manufacturing one inside a running journey discards every decision
  the app made.
- **The verbs do the deriving.** `excurse`/`detach`/`traverse` peel the reserved
  outfit keywords (`conveyance:`, `provisioner:`, `enactor:`, `launch_strategy:`,
  `listeners:`, `on_error:`) and forward them to `journey_outfit.with(...)`; a Symbol
  names a registered conveyance. The everyday move is naming the change on the verb —
  `run.traverse(provisioner: fakes)`, `excurse(Child, conveyance: :inline)`; holding
  an outfit object directly is the rare, deliberate case (a program top, a
  request/job boundary kitting out a subtree via `Journey.outfitted`).
- **There is always an outfit and never a manufactured one.** `journey_outfit`
  bottoms out at `Journey.ambient_outfit` — two rungs: a process-wide null-kitted
  seed the host configures once at boot (the engine's one boot job is kitting it with
  the telemetry listener), and a fiber-local layer (`Journey.outfitted`) a request,
  job, or spec example scopes over it. A bare `Journey.new.traverse` inherits ambient
  decisions; falling back is inheritance, manufacturing is erasure.
- Resolution ladder, most specific first: per-drive keyword → the journey's own
  explicit setting → an outfit installed here → the class's declaration → ambient. A
  nil slot is *unset* wherever a rung below can still answer; provisioner and
  enactor have no rung below, so the null kit carries the null objects themselves.
- The old facade accessors for provisioner/enactor/listeners are retired, not
  re-expressed: Journey owns its seams and their ambient defaults; the engine's job
  is handing the right strategies in **at entry points**, named on the verb that
  starts the run.

## Consequences

- An app-wide policy (say, `on_error: :return` house style) is the top-level outfit's
  setting, inherited by descent — a global's reach with none of a global's ambience.
- Threading a parent's kit into children is one derivation instead of hand-copied
  seams, and `listeners:` threads additively (attaching never silences).
- The reserved keywords shadow same-named constructor keywords in `excurse`'s class
  form; a child whose constructor takes `conveyance:` is built by the bare form.
- `Outfit.null.with(...)` inside a running program is the anti-pattern: derive from
  the outfit in hand, or just name the change on the verb.
