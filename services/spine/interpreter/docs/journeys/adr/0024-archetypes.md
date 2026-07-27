# ADR-0024 — Archetypes: `===` is the floor for slot appropriateness

**Status:** accepted

## Context

Several layers need to say "this slot takes this kind of value" — snapshot members,
need tags, enactment payload annotations, mail matchers, terminal-error matchers —
and each could have grown its own mini type system. Ruby already has a universal
answering shape for "does this value fit?": `===`.

## Decision

**An `Archetype` is anything answering `===`** — that is the whole floor — with two
optional rungs: `#example` (a plausible sample value, for tooling and synthesized
payloads) and a `#to_data`/`#from_data` codec (for snapshot round-tripping).
`Archetype.for(x)` (Kernel sugar: `Archetype(x)`) resolves a value or class to its
archetype through an ordered chain: `[Klass]` array-of notation → the value's own
`#to_archetype` → an already-archetype-shaped object → registered custom archetypes →
the `JourneySnapshot` generic (target answers `.from_journey_snapshot`) → the
`Serializable` generic (`#serializable_hash`) → `Verbatim`, the always-matching
fallback.

Because the floor is `===`, every Ruby `===`-responder is admissible everywhere an
archetype is: a Class, a Regexp, a Range, a lambda. This is the same floor `fail_on`
matchers and mail `matching:` stand on — one convention, learned once. Domain value
objects that need to shape their own serialization implement `#to_archetype` rather
than the framework special-casing them.

Vocabulary discipline: `[Klass]` means **array-of-Klass**, everywhere — which is why
enactment `as:` annotates keyword payloads only, and why mail matching refuses an
Array form. One bracket meaning two things is how a vocabulary rots. Any future
combinators (`any_of`, `optional`, …) must themselves be plain `===`-responders, so a
call site can always sidestep the pattern language with a lambda — and Ruby's own
alternative pattern (`->(v) { v in Apple | Orange }`) already covers most of what
combinators would.

Archetype is its own gem candidate; Journey's dependency on it stays soft
([ADR-0023](0023-the-framework-host-boundary.md)). Attribute↔archetype tagging is
deliberately independent of snapshotting — a need may carry an `as:` tag that maps
to no snapshot member.

## Consequences

- One appropriateness vocabulary serves snapshots, needs, enactments, mail, and
  terminal errors; nothing grew a parallel type system.
- `as:` tags are metadata with consumers (tooling, payload checks, synthesized
  examples); need resolution deliberately does not validate against them.
- The escape hatch is always a lambda, so the pattern language can grow from real
  call sites instead of up-front design.
