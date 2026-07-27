# ADR-0026 — Every input and output is named

**Status:** accepted

## Context

[ADR-0001](0001-a-process-is-a-journey.md) reified the process: a journey object
exists across steps and is its own record. That makes a boundary *possible* but not
yet *legible* — an object that persists is not the same as an object whose dealings
with the world can be seen.

Without this decision, a stage body reads:

```ruby
stage def retrieve
  @emails = EmailStore.for(@user_identity).fetch(@references)
  ItemRepository.for(@user_identity).store(*@items)
end
```

Both lines cross a trust boundary and neither says so. Three costs follow. To learn
what a process reads and writes, you read every line of every stage. To test it, you
replace collaborators — which means knowing *which* collaborators, which means the
spec encodes the implementation's structure, so changing which object does the work
breaks specs though nothing about the process changed. And to answer "what does this
system do with a user's email?" — the question privacy and consent reviews exist to
ask — somebody re-reads the whole call tree and hopes.

## Decision

**A journey declares every value it reads from the world and every effect it hands to
the world, by name. Nothing crosses the boundary anonymously.**

Inputs are **needs** ([ADR-0005](0005-needs-substitute-collaborators-never-authority.md)),
resolved through the provisioner. Outputs are **enactments**
([ADR-0006](0006-enactments.md)), handed over through the enactor and recorded in
the ledger. Both are declarations on the class; both are addressable by name from
outside the journey; neither requires a caller to know what object does the work.

The two are one decision seen from either side, which is why the mechanisms are
duals — provisioner and enactor, `provide` and `have_enacted`, `UnmetNeed` and
`UndeclaredEnactment`. A journey's declarations are the complete list of its
dealings with the world, in both directions.

This is the second foundational move and it depends on the first: a process must be
an object before its boundary is worth naming.

## Consequences

- **A spec addresses the boundary, not the collaborator.** `provide` answers the
  inputs, `have_enacted` asserts the outputs, and no double, stub, or spy appears
  anywhere. A spec that never names a collaborator cannot break when the collaborator
  is replaced — which is the property mock-heavy suites lack, and the reason they
  calcify the design they were meant to protect.
- **The declaration block is a machine-readable I/O contract**, and sealing
  ([ADR-0006](0006-enactments.md)) makes it an enforced one. For any process, the
  complete list of what it reads and what it changes is a class-side query rather
  than a code-reading exercise — which is what makes the privacy and consent audits
  tractable.
- **A journey that reaches past its own seams is mechanically detectable**, not a
  matter of reviewer attention. That detectability is what
  [ADR-0007](0007-the-mediation-convention.md) exists to preserve.
- **Naming is the cost**, paid once per world reach. It is a real cost and an
  intended one: a reach nobody can name is usually a reach that should not be there,
  and the pressure to name it is the point at which that gets noticed.
