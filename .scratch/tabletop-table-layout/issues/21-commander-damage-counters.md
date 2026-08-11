# 21 — Commander-damage counters per opposing commander

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: task
Status: done
Blocked by: 20 — life counter (the `mtg-life-counter` shape and name-row layout); 18 — commander arrives with owner (which commanders exist, and whose); 17 — sleeve color travels (counter identity is opponent name + sleeve color)

**What to build:** Each player's name row shows a commander-damage counter per opposing
commander — a partner-deck opponent gets two — starting at 0, always visible, appearing
as opponents' commanders arrive. Each counter is identified by the commander's own name
and the opponent's sleeve color, so you can tell whose commander dealt the damage — a
partner pair gets two distinctly-labeled counters (superseded 2026-08-11: the original
"players adjudicate, no extra labeling" call was revisited once the counters existed —
naming the commander was cheap and strictly more useful than a same-named pair). They
sit right-justified on the name row, between the player name and the (bigger) life
counter. Anyone can change any counter; changes sync live to everyone; last-writer-wins
is accepted.

Reuses the `mtg-life-counter` shape from ticket 20.

Design source of truth: [12 — life totals and commander damage](12-life-totals-and-commander-damage.md).

Test at the server event-handler seam: with commanders arrived for several seats,
assert each seat's name row carries one counter per *opposing* commander (none for its
own), at 0, labeled with the right opponent's name and sleeve color; partners produce
two. Playwright only if the interaction differs from ticket 20's already-covered
+/-/typing.

Consult owners: `shuffler-looks-like-itself` (how name + sleeve color identify a
counter visually).

- [x] Each seat shows one damage counter per opposing commander, starting at 0, always visible
- [x] A partner-deck opponent produces two counters
- [x] Counters are identified by the commander's own name + the opponent's sleeve color
- [x] No counter for your own commander; counters appear as opposing commanders arrive
- [x] Any player can change any counter; changes sync to all browsers

**Landed 2026-08-11.** `MtgLifeCounterShapeProps` gained optional `label`/`sleeveColor`
(both null for an ordinary life counter); `MtgLifeCounterShapeUtil` renders them as an
identity band (sleeve-colored strip + name, text color flipped via the same BT.601
luminance formula as the Shuffler's `isDarkHex`, ported rather than shared — no package
between ships) plus a sleeve-colored border on the counter row below, everything else
reused verbatim from ticket 20's chrome. New layout function
`commanderDamageCounterPosition` (cardLayout.ts) right-justifies counters leftward from
the life counter. `PlayerArea` gained `commanderCount` and `damageCounterCount`;
`handleSeatJoined` mints counters in both directions on every join — the new seat gets
one per already-seated opponent's existing commanders, and every already-seated seat
gets one per the new seat's brand-new commanders — since commanders only ever arrive
once, at seat-join (never later via `card.played`, confirmed while researching the
cardArrival.ts seam). Server event-handler seam tests only (test/seatJoined.test.ts);
no Playwright, since the DOM interaction is unchanged from ticket 20. Code review caught a
real race: two seat.joined requests seat each seat synchronously (in ensurePlayerArea)
before either's first await, so both requests' continuations can see both seats already
present and each attempt to mint the same (target, opponent) counter pair, doubling
counters and corrupting `damageCounterCount`'s position bookkeeping. Fixed by making
`addCommanderDamageCounters` idempotent per pair — the existence check and the mint run
inside the same synchronous `updateStore` callback, so whichever request's callback runs
first wins outright. Covered by a concurrent-join test.

**Follow-up 2026-08-11:** Jess asked for the counter to name the commander, with a
partner pair producing two distinctly-labeled counters instead of two identical ones.
`PlayerArea.commanderCount` became `commanderNames: string[]`; `addCommanderDamageCounters`
now takes that list instead of a bare count and labels each minted counter with its own
commander's name (sleeve color still identifies the opponent via the band/border). Same
idempotency guard, same tests, relabeled to assert on commander names.
