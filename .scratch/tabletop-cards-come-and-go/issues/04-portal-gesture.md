# The portal gesture — the library swallows a card

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: prototype
Status: needs-triage

## Question

The decided experience: drag a card over the library furniture → the library changes
appearance to show it's about to take the card → drop → the card is swallowed (its
stuff falls off, per the physics rule) and lands in the Shuffler's Reveal zone. Prototype
the gesture so the spec commits to a feel Jess has actually reacted to:

- **The arming render.** Locked furniture can never be a drop target (tldraw limit:
  `getDraggingOverShape` filters `!isLocked`), so "the library reacts" must be a derived
  render — the same pattern as the command zone arming (table-layout ticket 08:
  `useValue` in the zone's own `component()`). What does "about to swallow" look like?
- **The swallow moment.** On drop: what does the player see between the card leaving the
  table and its appearance in the Shuffler? Does the card vanish immediately on drop, or
  is there a travel/waiting state?
- **Whose library?** Can a card be dropped on an opponent's library portal, or only your
  own? (The command zone arms only for the owner's commander — is the portal
  owner-gated the same way?)

The prototype is throwaway; the asset it produces is a decision, linked here. Consult
`tabletop-shape-mechanics-context` before building — this is squarely its territory.

Unblocked — the gesture's feel doesn't wait on the channel or the vocabulary.
