# 21 — Commander-damage counters per opposing commander

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: task
Status: ready-for-agent
Blocked by: 20 — life counter (the `mtg-counter` shape and name-row layout); 18 — commander arrives with owner (which commanders exist, and whose); 17 — sleeve color travels (counter identity is opponent name + sleeve color)

**What to build:** Each player's name row shows a commander-damage counter per opposing
commander — a partner-deck opponent gets two — starting at 0, always visible, appearing
as opponents' commanders arrive. Each counter is identified by the opponent's name and
sleeve color, so you can tell whose commander dealt the damage. They sit right-justified
on the name row, between the player name and the (bigger) life counter. Anyone can
change any counter; changes sync live to everyone; last-writer-wins is accepted. No
extra labeling distinguishes a partner pair — players adjudicate, per the
no-rules-engine principle.

Reuses the `mtg-counter` shape from ticket 20.

Design source of truth: [12 — life totals and commander damage](12-life-totals-and-commander-damage.md).

Test at the server event-handler seam: with commanders arrived for several seats,
assert each seat's name row carries one counter per *opposing* commander (none for its
own), at 0, labeled with the right opponent's name and sleeve color; partners produce
two. Playwright only if the interaction differs from ticket 20's already-covered
+/-/typing.

Consult owners: `shuffler-looks-like-itself` (how name + sleeve color identify a
counter visually).

- [ ] Each seat shows one damage counter per opposing commander, starting at 0, always visible
- [ ] A partner-deck opponent produces two counters
- [ ] Counters are identified by opponent name + sleeve color
- [ ] No counter for your own commander; counters appear as opposing commanders arrive
- [ ] Any player can change any counter; changes sync to all browsers
