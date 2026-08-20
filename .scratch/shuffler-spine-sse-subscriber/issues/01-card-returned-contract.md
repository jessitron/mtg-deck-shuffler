# 01 — `card.returned.v1` contract

**What to build:** A new JSON Schema payload for `card.returned.v1`, following
`card.played.v1`'s shape: `card: {scryfallId}`, `gameCardIndex` (top-level, required),
`seat`, optional `fromZone`. No `face` field — the table isn't authoritative for a table
card's face. Lives alongside `card.played.v1` in `contracts/`, composed with the shared
envelope schema the same way. This is the shared vocabulary both the Tabletop's send leg
and the Shuffler's subscriber leg validate against.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `card.returned.v1.json` payload schema exists in `contracts/`, matching
      `card.played.v1.json`'s structure (required/additionalProperties pattern)
- [ ] Schema declares `gameCardIndex` (required), `card.scryfallId` (required), `seat`
      (required), `fromZone` (optional) — no `face` field
- [ ] A schema-validation test proves a well-formed `card.returned.v1` payload validates,
      and a malformed one (missing `gameCardIndex`, or an unexpected `face` field) is
      rejected
