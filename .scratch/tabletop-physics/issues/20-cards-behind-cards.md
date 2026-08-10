# 20 — Cards tuck behind other cards

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: task
Status: wontfix

**Abandoned 2026-08-10**, after two built-and-reverted implementations (real parenting, then a
meta-link) both broke in production — the second badly enough (cards flying to/away from each
other) that it blocked deploys of unrelated features. Full postmortem and the group-based
redesign that was explored but not built: `apps/tabletop/notes/DESIGN-card-tucking-abandoned.md`.
Manual reorder/grouping via tldraw's stock UI covers the need for now; revisit with more user
input before a third attempt.

**What to build:** Extend the card-hosted drag-attach mechanism (ticket 18) so a card can be a
passenger too. A tucked card stays independently selectable, tappable, and draggable — plain
parenting, not grouping. Dragging the host carries every passenger for free (page transform
composition); dragging a passenger directly does not auto-detach it. Depth/stacking among
multiple passengers on one host is free via tldraw's own sibling `index` order.

Dropping any card onto a host lands it wherever dropped, on top by default — there is no
"cards tuck behind by default" rule, since the Tabletop has no card-type prop to decide a
default with. Getting a passenger to read as tucked-under is an explicit "Send backward"/"Send to
back" context-menu command, same surface as tap/flip/lock. This single mechanism covers both a
partial peek (equipment under a creature) and a full cover (a card set "under" a permanent) — the
physics layer draws no distinction between the two.

Face/faceDown state is unaffected by tucking — pure z-order, not a third concealment mechanism.

**Rotation compensation** (not free, unlike everything else here): tldraw composes rotation
through parenting unconditionally, so tapping a host would otherwise visibly rotate every
passenger with it. Apply an explicit counter-rotation compensation to each passenger at the
moment the host's tap toggles, written alongside the host's own tap-delta (ticket 12), and
reconcile it back to zero at detach time.

A host leaving the battlefield auto-detaches every passenger (card, counter, or note), which
stays behind, unattached, exactly where it was — never auto-routed to a "correct" destination.

**Blocked by:** 12, 13, 18

- [ ] Dropping a card onto another parents it, landing on top by default
- [ ] "Send backward"/"Send to back" context-menu command makes a passenger card read as
      underneath its host
- [ ] A tucked card is still independently selectable, tappable, and draggable
- [ ] Dragging the host moves every passenger with it; dragging a passenger alone does not detach it
- [ ] Tapping the host does not visually rotate a tucked passenger card
- [ ] A host leaving the battlefield detaches every passenger (card/counter/note) in place
