# 10 — Commanders arrive with the seat

Mountain: tabletop-replaces-mural
Ship: fleet
Status: resolved (landed as `tabletop-table-layout` ticket 18, commit `cea6c37`,
  2026-08-09 — `seat.joined.v1` gained `commanders`, Tabletop mints them in the
  Command Zone with an owner + isCommander-carrying ghost)

**What to build:** `seat.joined.v1` gains optional `commanders`: an array of 0–2 entries,
each `{ card: { scryfallId, instanceId } }`. Commanders are ordinary GameCards in the
Shuffler's CommandZone location with real instanceIds; no `face` field per commander — a
commander always arrives in the command zone face up, and flipping it there afterward is
table-local. On the pre-Spine wire, scaffolding fields ride along off-schema (`cardName`,
`frontImageUrl`, `backImageUrl`), with `backImageUrl` derived from the card's `twoFaced`
flag, never from stored-URI presence (two-faced-cards owner's sharp edge). Once seated, a
commander is an ordinary card — same exits as anything else, no special-case physics.

This coordinates with table-layout ticket 18 (`owner` card prop, commander ghost) which is
in flight on that map — read its current state before building the command-zone side.

**Blocked by:** 05. Coordinates with `tabletop-table-layout` ticket 18 (in flight) —
confirm its landing shape for `owner` and the command zone before wiring commander seating
against it.

- [ ] `seat.joined.v1.json` gains optional `commanders` (0–2 entries) per the shape above
- [ ] The Shuffler includes each seat's commander(s) in its `seat.joined` payload, with
      correct `twoFaced`-derived `backImageUrl` scaffolding
- [ ] The Tabletop places commander(s) in the seat's command zone on `seat.joined`, face up
- [ ] A seated commander behaves as an ordinary card afterward — returnable via the same
      exits (portal, Shuffler-side transitions) as any other card
- [ ] Event-builder unit test covers the commanders payload shape (mirrors
      `cardPlayedEvent.test.ts`'s `backImageUrl`-from-`twoFaced` pattern)
- [ ] Playwright: seat into a Commander game, see commander(s) standing in the command
      zone immediately
