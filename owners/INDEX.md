# Owners

Standing guardians for things that must keep holding as this fleet grows — a **capability** that must keep working (invariants are capabilities
that aren't externally visible). Each owner is a knowledge base in `owners/<slug>/` plus three
animating skills — `<slug>-context`, `<slug>-review`, `<slug>-update` — symlinked into
`.claude/skills/`. Owners never close. Created by the `seamapping:create-owner` skill.

When you plan a change, scan the one-liners below; for any owner whose trigger matches, invoke its
`-context` skill (research), its `-review` skill (on the plan), and its `-update` skill (after the
change lands). See CLAUDE.md → Task Implementation Process. Each entry stamps _kind, scope_ —
scope is a ship, or _fleet_ when the charge crosses ships; a change confined to one ship may skip
owners stamped with a different ship, never the fleet-scoped ones.

- [two-faced cards](two-faced-cards/README.md) — _feature, fleet_ — consult me before changes to card face
  display/rendering, CardDefinition/CardFace types, deck adapters, card persistence, flip buttons,
  card modals, library search grouping. On Tabletop, ask me about
  _face/image_ rendering, or the event contract's card/face fields.
- [tabletop shape mechanics](tabletop-shape-mechanics/README.md) — _capability, Tabletop_ — consult
  me before changes to tldraw `ShapeUtil` hooks (`onClick`, `onTranslateEnd`, drag/drop), custom
  shape types under `apps/tabletop/src/client/shapes/`, shape selection state, or zone detection —
  regardless of what the shape displays. These are tricky.
- [library search](library-search/README.md) — _feature, Shuffler_ — consult me before changes to card
  definitions, modals, persistence, game state, deck adapters, or the prep/game pages.
- [animations](animations/README.md) — _feature, Shuffler_ — consult me before changes to card
  display/rendering, game.css, HTMX swap attributes, card containers, drag-and-drop,
  game.js event handlers, or CSS keyframes/transitions.
- [the Shuffler looks like itself](shuffler-looks-like-itself/README.md) — _capability, fleet_ —
  consult me before adding or changing UI on Shuffler, or the appearance of custom elements on Tabletop: new
  buttons/panels/inputs/states, any stylesheet, CSS tokens, colors, fonts, corner radius, spacing,
  alignment, focus states, or the `/design` gallery. **One
  identity across ships; new UI pulls toward the standard**
- [the fleet is observable](fleet-is-observable/README.md) — _capability, fleet_ — consult me before
  changes to telemetry wiring, env/secret sourcing, run/deploy scripts, OTel dependency versions,
  HTTP middleware, or trace-context propagation — and before recording that something happened
  (**never `span.addEvent`; attributes or a log instead**).

Keep each entry to one scannable line-or-two — every planning check reads this whole list. The
knowledge belongs in the owner's own directory. Don't sprawl: the gate for a new owner is
_valuable_, _fragile to distant change_, **and** _not already cheaply guarded by a test_.
