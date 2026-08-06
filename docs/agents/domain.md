# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the
codebase. This is a **multi-context** repo: most vocabulary is shared across the fleet, but each
ship has terms of its own, and a few terms mean different things in different ships.

## Before exploring, read these, in this order

1. **`notes/GLOSSARY.md`** — the shared fleet vocabulary. This is the primary glossary; there is
   no root `CONTEXT.md`.
2. **`CONTEXT-MAP.md`** at the repo root — the index of contexts, plus the translations table for
   terms that differ between ships.
3. **The relevant ship's `CONTEXT.md`** — ship-local terms and distinctions:
   `apps/shuffler/CONTEXT.md`, `apps/tabletop/CONTEXT.md`, `services/spine/CONTEXT.md`.
4. **ADRs** that touch the area you're about to work in: `docs/adr/` for fleet-wide decisions,
   `<ship>/docs/adr/` for ship-scoped ones.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest
creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and
`/improve-codebase-architecture`) creates them lazily when terms or decisions actually get
resolved. `notes/GLOSSARY.md` already exists and is the one to extend.

`contracts/` is the fleet's **published language** — JSON Schema for the event envelope and
per-kind payloads. Where a term appears there, the contract is authoritative over any prose.

## File structure

```
/
├── notes/GLOSSARY.md              ← shared fleet vocabulary (the primary glossary)
├── CONTEXT-MAP.md                 ← context index + cross-context translations
├── docs/adr/                      ← fleet-wide decisions
├── contracts/                     ← the published language (authoritative)
├── apps/shuffler/CONTEXT.md       (+ apps/shuffler/docs/adr/)
├── apps/tabletop/CONTEXT.md       (+ apps/tabletop/docs/adr/)
└── services/spine/CONTEXT.md      (+ services/spine/docs/adr/)
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a
test name), use the term as defined in `notes/GLOSSARY.md`, or in the ship's `CONTEXT.md` when
the term is ship-local. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing
language the project doesn't use (reconsider) or there's a real gap (note it for
`/domain-modeling`).

## When a term means different things in two ships

That belongs in the `CONTEXT-MAP.md` translations table, not in one ship's `CONTEXT.md` alone —
the whole value is seeing both sides at once. For example: a **Game** in the Shuffler corresponds
to a **Seat** in the Spine and the Tabletop.

When you notice such a correspondence while working, add it. When you cross a ship boundary in
code, check the table first — silently assuming one ship's meaning holds in another is the
failure this layout exists to prevent.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently
overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
