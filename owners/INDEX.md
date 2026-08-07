# Owners

Standing guardians for things that must keep holding as this fleet grows — a **feature** that must
keep serving its users, or a **capability** that must keep working (invariants are capabilities
that aren't externally visible). Each owner is a knowledge base in `owners/<slug>/` plus three
animating skills — `<slug>-context`, `<slug>-review`, `<slug>-update` — symlinked into
`.claude/skills/`. Owners never close. Created by the `seamapping:create-owner` skill.

When you plan a change, scan the one-liners below; for any owner whose trigger matches, invoke its
`-context` skill (research), its `-review` skill (on the plan), and its `-update` skill (after the
change lands). See CLAUDE.md → Task Implementation Process. Each entry stamps *kind, scope* —
scope is a ship, or *fleet* when the charge crosses ships; a change confined to one ship may skip
owners stamped with a different ship, never the fleet-scoped ones.

- [two-faced cards](two-faced-cards/README.md) — *feature, fleet* — consult me before changes to card
  display/rendering, CardDefinition/CardFace types, deck adapters, card persistence, flip buttons,
  CSS card animations, card modals, library search grouping, game state, the Tabletop's card
  *face/image* rendering, or the event contract's card/face fields. Not click/drag/selection
  mechanics — see tabletop shape mechanics below.
- [tabletop shape mechanics](tabletop-shape-mechanics/README.md) — *capability, Tabletop* — consult
  me before changes to tldraw `ShapeUtil` hooks (`onClick`, `onTranslateEnd`, drag/drop), custom
  shape types under `apps/tabletop/src/client/shapes/`, shape selection state, or zone detection —
  regardless of what the shape displays.
- [library search](library-search/README.md) — *feature, Shuffler* — consult me before changes to card
  definitions, modals, persistence, game state, deck adapters, or the prep/game pages.
- [animations](animations/README.md) — *feature, Shuffler* — consult me before changes to card
  display/rendering, game.css, WhatHappened, HTMX swap attributes, card containers, drag-and-drop,
  game.js event handlers, or CSS keyframes/transitions.
- [the Shuffler looks like itself](shuffler-looks-like-itself/README.md) — *capability, fleet* —
  consult me before adding or changing any UI on **any ship** (Shuffler or Tabletop): new
  buttons/panels/inputs/states, any stylesheet, CSS tokens, colors, fonts, corner radius, spacing,
  alignment, focus states, the `<head>`s, tldraw-adjacent UI, or the `/design` gallery. **One
  identity across ships; new UI pulls toward the standard; never copy a raw Material/Bootstrap hex.**
- [the fleet is observable](fleet-is-observable/README.md) — *capability, fleet* — consult me before
  changes to telemetry wiring, env/secret sourcing, run/deploy scripts, OTel dependency versions,
  HTTP middleware, or trace-context propagation — and before recording that something happened
  (**never `span.addEvent`; attributes or a log instead**).

Keep each entry to one scannable line-or-two — every planning check reads this whole list. The
knowledge belongs in the owner's own directory. Don't sprawl: the gate for a new owner is
*valuable*, *fragile to distant change*, **and** *not already cheaply guarded by a test*.
