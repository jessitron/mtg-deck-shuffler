# 18 — Commander arrives in the Command Zone, carrying owner and isCommander, leaving a ghost

Mountain: tabletop-replaces-mural
Ship: fleet
Type: task
Status: ready-for-agent
Blocked by: 13 — build command-zone redraw (there must be a Command Zone to arrive in)

**What to build:** When a player's commander is played from the Shuffler, it appears in
their Command Zone as a real card that knows whose it is and what it is. `mtg-card`
gains two first-class, schema'd, synced props: `owner` (seatId) and `isCommander`
(boolean), set via the ordinary card-arrival path — no new event kind. The
`card.played` contract gains the same two fields, the same way `face`/`faceDown` were
added. **`owner` grants no capability** — anyone can still move anything; it makes
"whose card is this" a fact the shape carries.

Alongside the real commander, a **ghost copy** marks its home: a genuine second
`mtg-card` shape in the Command Zone — locked, reduced opacity, non-interactive,
showing the front image — persisting wherever the real commander goes, so it inherits
card rendering for free.

Implementer's choices (per the design ticket): exactly how/when the ghost is minted,
and how it's distinguished from the real commander for hit-testing (likely a
meta/props flag).

Design source of truth: [08 — commander in command zone](08-commander-in-command-zone.md).
Zone arming is ticket 19, not this one.

Test at the contract seam (valid/invalid `card.played` payloads with the new fields)
and the Tabletop server event-handler seam (commander card minted in the Command Zone
with `owner`/`isCommander`; ghost minted locked and faded).

Consult owners: `two-faced-cards` (card props and `card.played` fields),
`tabletop-shape-mechanics` (new props on the shape, ghost hit-testing).

- [ ] `card.played` contract carries optional `owner` and `isCommander`; both sides validate, unknown name/version still fails loudly
- [ ] Shuffler sends `owner` and `isCommander` when the commander is played
- [ ] The commander lands in its owner's Command Zone as an ordinary, draggable `mtg-card`
- [ ] A locked, faded, non-interactive ghost of the commander sits in the Command Zone and stays there when the real card moves out
- [ ] Any player can still move the commander — `owner` gates nothing
