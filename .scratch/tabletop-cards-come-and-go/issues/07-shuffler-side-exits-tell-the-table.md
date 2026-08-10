# 07 — Shuffler-side exits tell the table (and the dedup trap dies)

Mountain: tabletop-replaces-mural
Ship: fleet
Status: ready-for-agent

**What to build:** New schema `card.returned.v1` — payload `card: { scryfallId, instanceId }`
(required), `seat: 1–4` (required), `fromZone` (optional, absent when `occurredIn:
"shuffler"` since the Shuffler doesn't know table geography). No `face`/`faceDown` — the
Shuffler stays authoritative for face; the table is never authoritative for a table card's
face.

Any transition out of the Shuffler's `Table` location sends this event with
`occurredIn: "shuffler"` — the card modal's Return button, and any other route that reaches
a Table card by crafted request (put-in-hand, put-on-top, put-on-bottom). The Tabletop
receives it and poofs the shape, identified by the shape's `instanceId` **prop** (not shape
meta); attachments stay behind, detached.

Send-then-commit, mirrored: the Shuffler does not commit the card's new location until the
Tabletop confirms delivery (mirrors the existing send-to-table-first behavior for arrivals).

This closes today's dedup trap: since the Tabletop's arrival dedup keys on shape-presence-
on-board, deleting the shape on exit is the whole fix — a returned card re-played with the
same `instanceId` passes dedup and lands as a fresh shape.

**Blocked by:** 05 — needs contract validation in place for the new schema.

- [ ] `card.returned.v1.json` schema written per the payload above
- [ ] Every Shuffler transition out of `Table` (Return button, and crafted
      put-in-hand/top/bottom) emits `card.returned.v1` with `occurredIn: "shuffler"`
- [ ] The Shuffler does not commit the location change until the Tabletop confirms
      delivery; on failure the GameState change does not happen
- [ ] The Tabletop poofs the shape by `instanceId` prop on receipt; attachments remain,
      detached
- [ ] Regression test: return a card via the modal, then play it again — it actually
      lands on the table (today it's silently swallowed)
- [ ] GameState unit tests cover the send-then-commit ordering (no 2xx → no location
      change)
