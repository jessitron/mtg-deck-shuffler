# ADR-0023 — The framework/host boundary: Journey owns its own tree

**Status:** accepted

## Context

Journey is destined to be extracted as its own gem (with `Archetype` and the
disposability module as siblings) once the architecture is well exercised in a real
host. While the framework lived inside the engine's namespace and directory, every
question about what belongs to the framework and what belongs to the application
could stay unanswered, because nothing made anyone answer it.

## Decision

**A filesystem boundary as a forcing function**: the framework lives in
`lib/journey/`, before the gem extraction rather than as part of it, so every reach
across the line shows up as a reach. (`Briefasaurus::Journey` keeps its namespace for
now; the path deliberately disagrees. The gemspec follows once the line is somewhere
the code agrees with.)

What the line means in practice:

- **The core is pure Ruby.** Plain `Journey` runs with no Rails, no database, no
  facade. The framework defines the store *protocol*; `ActiveRecordJourney`,
  `Journey::Store::ActiveRecord`, and `JourneyJob` are the host's concretization, on
  the app side ([ADR-0010](0010-persistence-is-an-observation.md)).
- **The ambient-default surface is Journey-owned.** The outfit seed replaced the
  facade's per-seam ambient reaches ([ADR-0013](0013-outfits-are-derived-never-manufactured.md));
  the engine's job is providing strategies at entry points, plus one boot call
  kitting the seed with its telemetry listener.
- **No framework component hard-codes the facade.** The telemetry listener takes an
  injected adapter; framework code hand-rolls its own camelization rather than
  buying ActiveSupport for one word.
- **Journey → Archetype is a real inter-gem edge**, kept soft
  ([ADR-0024](0024-archetypes.md)); the remaining named engine dependencies
  (telemetry mixin, default launch strategy) are known, listed, and shaped for the
  same injected-adapter answer when extraction demands it.
- Project-local enforcement (the lifecycle-super cop, the journeys review guidance)
  travels with the framework at extraction.

## Consequences

- "Is this framework or app?" is answered by which tree the file lives in, and a new
  coupling is visible in the diff that introduces it.
- Hosts other than Briefasaurus are a require away in principle; the extraction is a
  namespace-and-gemspec exercise, not an untangling.
