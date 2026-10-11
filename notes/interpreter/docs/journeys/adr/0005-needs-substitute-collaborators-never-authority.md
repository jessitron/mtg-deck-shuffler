# ADR-0005 — Needs: every world input crosses a seam — and seams substitute collaborators, never authority

**Status:** accepted

## Context

This is the input half of
[ADR-0026](0026-every-input-and-output-is-named.md); enactments
([ADR-0006](0006-enactments.md)) are the output half.

The testing north star is a journey testable with **no mocks, no stubs of
class/module methods, no fiber-local overrides**: line up inputs, step it, read
state. That requires every input from the world — a DB find, an LLM completion, a
feature-flag read, `Time.current` — to arrive through one substitutable channel. The
prior idiom (an `attr_writer` + resolving-`initialize` + `||=` reader per
collaborator) was hand-rolled, unenumerable, and broke on `find`-resumed runs whose
`initialize` never ran.

Substitutability cuts both ways. An audit round found the same defect four times in
different clothes: an *obligation* placed above a surface built for *substitution*.
A revocation resolved through the provisioner reported success while writing no
REVOKED row; a consent check reachable through synthesized excursion names could be
swapped out wholesale; a purge's target set resolved as a need let a provided `[]`
silently narrow a delete.

## Decision

**A `need` is a value the journey reads from the world, routed through the
provisioner.** Two forms, one seam:

- **Class macro** for whole-journey collaborators —
  `need(:item_repository) { Briefasaurus.item_repository(user_identity:) }` registers
  the need, defines a private lazy accessor, and the framework's `:provision` stage
  (first on every itinerary) resolves each into its backing ivar, so a resumed run in
  a fresh process reaches working collaborators.
- **Inline** for a one-stage world read —
  `@candidates = need(:candidates) { item_repository.including_drafts }`. An
  `@`-prefixed name (`need(:@eml) { … }`) assigns the ivar while keying the need on
  the bare name.

**The block is the production default**, not a fallback for a broken provisioner.
Resolution ladder: provisioner's answer → inline block → registered macro block →
the raw `name!` method ([ADR-0007](0007-the-mediation-convention.md)) → raise
`Journey::UnmetNeed` (a `StageError`: a missed input seam is a logic error the
snag path never swallows). A **provisioner is anything answering `[](name)`** — a
plain Hash qualifies — and **`nil` from a provisioner means unprovided**: a Hash
answers `nil` for every key it was never given, and treating that as a provision
would silently swallow a default, including one that writes a durable record. A need
whose value may legitimately be nil says so in its own block. `as:` tags a need with
an Archetype ([ADR-0024](0024-archetypes.md)) for metadata; resolution does not
validate against it. `seal_needs!` closes the declared set for journeys that want it.

**Seams substitute collaborators, never authority.** Consent, entitlement, identity —
anything that must hold *no matter who is driving* — is never reached through a need,
a synthesized excursion name, or any provisioner-addressable path. Enforcement lives
**below the seam**: the consent gate wraps every LLM adapter as
`UserServicesFactory` hands it out (checked at `complete`, so an adapter warmed into
an ivar before a revocation still refuses after), which sits below every provisioner
and needs no list of which stages can reach a model. A journey-side
`ensure_consented!` survives only as an early exit and honest telemetry — not the
wall. Likewise a purge's scope is an obligation: its id queries live inside the
enact's own action, never behind a need.

## Consequences

- `type: :journey` specs `provide` instead of mocking, and default to raising on any
  unprovided need — a missed seam fails loudly instead of quietly reaching the world
  (see the [testing guide](../guide/16-testing.md)).
- Reaching `Briefasaurus.foo(...)`, `Time.current`, or a flag read directly from a
  stage body is a smell; route it through `need`.
- A provisioner cannot deliberately provide `nil` — the accepted trade for
  fail-closed defaults. Callers wanting "nothing" provide a sentinel or null object.
- Every journey with a consent check keeps one `type: :model` spec driving the real
  gate; the provisioner seam is how the journey specs run at all, so the gate must be
  proven below it.
