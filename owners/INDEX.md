# Owners

Standing guardians for things that must keep holding as this fleet grows — a **feature** that must
keep serving its users, or a **capability** that must keep working (invariants are capabilities
that aren't externally visible). Each owner is a knowledge base in `owners/<slug>/` plus three
animating skills — `<slug>-context`, `<slug>-review`, `<slug>-update` — symlinked into
`.claude/skills/`. Owners never close. Created by the `seamapping:create-owner` skill.

When you plan a change, scan the one-liners below; for any owner whose trigger matches, invoke its
`-context` skill (research), its `-review` skill (on the plan), and its `-update` skill (after the
change lands). See CLAUDE.md → Task Implementation Process.

- [two-faced cards](two-faced-cards/README.md) — *feature* — consult me before changes to card
  display/rendering, CardDefinition/CardFace types, deck adapters, card persistence, flip buttons,
  CSS card animations, card modals, library search grouping, game state, the Tabletop's card
  rendering, or the event contract's card/face fields.
- [library search](library-search/README.md) — *feature* — consult me before changes to card
  definitions, modals, persistence, game state, deck adapters, or the prep/game pages.
- [animations](animations/README.md) — *feature* — consult me before changes to card
  display/rendering, game.css, WhatHappened, HTMX swap attributes, card containers, drag-and-drop,
  game.js event handlers, or CSS keyframes/transitions.
- [the fleet is observable](fleet-is-observable/README.md) — *capability* — consult me before
  changes to telemetry wiring, env/secret sourcing, run/deploy scripts, OTel dependency versions,
  HTTP middleware, or trace-context propagation — and before recording that something happened
  (**never `span.addEvent`; attributes or a log instead**).

Keep each entry to one scannable line-or-two — every planning check reads this whole list. The
knowledge belongs in the owner's own directory. Don't sprawl: the gate for a new owner is
*valuable*, *fragile to distant change*, **and** *not already cheaply guarded by a test*.
