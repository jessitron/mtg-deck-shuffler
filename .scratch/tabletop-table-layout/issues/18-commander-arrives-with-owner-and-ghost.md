# 18 — Commander arrives in the Command Zone, carrying owner and isCommander, leaving a ghost

Mountain: tabletop-replaces-mural
Ship: fleet
Type: task
Status: done
Blocked by: 13 — build command-zone redraw (there must be a Command Zone to arrive in)

note: Jess updated this on 8/9/26 to jive with decisions made since this ticket was defined. See /Users/jessitron/code/jessitron/mtg-deck-shuffler/.scratch/tabletop-cards-come-and-go/map.md line 75

**What to build:** When a player joins the table, the `seat.joined` event comes with an array of commanders (0-2). Create these cards as part of setup, and place them in the command zone (side by side if there are two, centered if 1).
`mtg-card` gains two first-class, schema'd, synced props: `owner` (seatId) and `isCommander`
(boolean), set via the ordinary card-arrival path as well. The
`card.played` contract gains the same two fields, the same way `face`/`faceDown` were
added. **`owner` grants no capability** — anyone can still move anything; it makes
"whose card is this" a fact the shape carries.

Behind the real commander, a **ghost copy** marks its home: a shape with similar rendering
to the `mtg-card` shape but none of the interactivity. It is locked, it is translucent. It stays in
the command zone marking the commander's spot, and making it clear who the commander is.

Implementer's choices (per the design ticket): exactly how/when the ghost is minted

Design source of truth: [08 — commander in command zone](08-commander-in-command-zone.md).
Zone arming is ticket 19, not this one.

Test at the contract seam (valid/invalid `card.played` payloads with the new fields)
and the Tabletop server event-handler seam (commander card minted in the Command Zone
with `owner`/`isCommander`; ghost minted locked and faded).

Consult owners: `two-faced-cards` (card props and `card.played` fields),
`tabletop-shape-mechanics` (new props on the shape, ghost hit-testing).

- [ ] Shuffler sends `owner` and `isCommander` when the commander is played
- [ ] The commander lands in its owner's Command Zone as an ordinary, draggable `mtg-card`
- [ ] A locked, faded, non-interactive ghost of the commander sits in the Command Zone and stays there when the real card moves out
- [ ] Any player can still move the commander — `owner` gates nothing
