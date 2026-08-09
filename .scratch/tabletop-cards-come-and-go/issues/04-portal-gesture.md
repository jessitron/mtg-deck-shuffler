# The portal gesture — the library swallows a card

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: prototype
Status: resolved

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

## Comments

**Prototype built (2026-08-09, claude).** Branch `worktree-wayfinder-04-portal-gesture`
(worktree at `.claude/worktrees/wayfinder-04-portal-gesture/` while it lives; the branch
survives it). All prototype code is in
`apps/tabletop/src/client/shapes/portalGesturePrototype.tsx` plus two marked hook-ins
(`MtgCardShapeUtil.onTranslateEnd` + `getInterpolatedProps`; `TablePage`). Smoke-tested
per variant in `test/verification/verify-portal-prototype.spec.ts`; full Playwright
suite green.

**To react to it:** `./run` from the worktree root, play cards from the Shuffler to a
table, then drag a card onto the library. Flip variants with the floating bottom bar,
`←`/`→`, or `?variant=A|B|C`:

- **A — Ring · instant poof.** Pulsing amber/pink ring around the library, keyed on the
  *pointer* (same as today's armed glow). Drop → card vanishes immediately.
- **B — Maw · slide under.** Dark veil + dashed breathing "mouth" over the library image,
  keyed on the *card's center* (what drop detection actually uses). Drop → card shrinks
  and fades into the library over ~280ms.
- **C — Vortex · inhale.** Rotating two-color swirl over the library, card-center-keyed.
  Drop → card spins twice while shrinking in over ~500ms.

**Questions this stages for the resolution (Jess reacts, then this ticket closes):**

1. Which arming feel — A/B/C or a mix ("B's veil with A's ring")?
2. Which swallow moment — instant, slide-under, or inhale?
3. ~~Keying: pointer vs card-center.~~ **Decided (Jess, 2026-08-09): pointer-keyed.**
   The multi-select policy — the pointer picks the one destination — holds for a single
   card too. Prototype updated: arming and the swallow both key on the pointer in every
   variant. Recorded with the `tabletop-shape-mechanics` owner (its KB notes the tension:
   generic zone-entry `zoneAt()` is still center-keyed and needs reconciling when next
   touched).
4. Whose library? Owner-gating **cannot be prototyped yet** — cards have no `owner` prop
   until table-layout ticket 18 lands. Decide in principle; the command-zone plan
   (ticket 19's `isCommander && owner === seatId` gate) is the pattern it would share.
5. ~~Multi-select behavior.~~ **Decided by 3:** dropping a multi-select with the pointer
   on the library swallows the whole group (each card's settle hook checks the same
   pointer, deleting only itself). Smoke-tested.

**Mechanics facts learned (for the spec and the shape-mechanics owner's -update when this
resolves):** `onTranslateEnd` fires once *per moving shape* in a multi-select drag, and
`Translating.handleEnd` non-null-asserts `getShape` per shape — so a hook must never
synchronously delete a *sibling* moving shape (crash) and should defer even self-deletion
past the settle (the prototype uses `setTimeout(0)`). `animateShapes` interpolates only
x/y/rotation/opacity; numeric props (w/h shrink) need `getInterpolatedProps` on the
ShapeUtil. The existing armed signal arms for *any* translating shape — the portal signal
gates on `mtg-card` (a counter must not threaten a swallow); the real build should
probably fold that gate into the shared signal. Arming visuals can't render inside the
zone shape (opaque library image on top) — the prototype draws them in viewport space via
`TLComponents.InFrontOfTheCanvas`, which works well and pans/zooms correctly via
`pageToViewport` reads.

**Parked (2026-08-09, claude).** Jess's temporary tldraw license expired mid-review. The
prototype is preserved on branch `prototype/portal-gesture-ticket-04` (same commits as the
worktree branch, which may get cleaned up). To resume: check out that branch (or
`git worktree add` it somewhere), `./run` from its root, and react to the variants per the
comment above.

## Answer

Jess reacted to the live prototype (2026-08-09). The gesture, fully decided:

1. **Arming: Variant C — Vortex.** While a card drags over the library (pointer-keyed),
   a rotating two-color swirl (pink/amber conic gradient) spins over the library with a
   faint dark veil. ("I love option C SO MUCH.")
2. **Swallow: Inhale.** On drop, the card spins twice while shrinking and fading into
   the library's center over ~500ms, then leaves the table. Everyone at the table sees
   the swallow (it's a store write); the arming swirl stays local to the dragger.
3. **Keying: pointer.** Standing policy, recorded with the `tabletop-shape-mechanics`
   owner: the pointer picks the one destination — for multi-select AND for a single
   card. Consequence, smoke-tested: a multi-select dropped on the library swallows the
   whole group.
4. **Whose library: only your own** — owner-gated, same shape as the command-zone gate
   (table-layout ticket 19), sharing ticket 18's `owner`-prop dependency. Rationale:
   the Shuffler doesn't know how to handle someone else's card — the return channel
   lands the card in the *owner's* Reveal zone, so a foreign card has nowhere to go.
5. The card lands in the Shuffler's **Reveal zone** (from the map's founding decision);
   the message is `card.returned.v1` per [the vocabulary ticket](02-event-vocabulary.md),
   send-then-commit per [the return channel](01-return-channel.md): no 2xx, no poof.

**Asset:** the prototype, branch `prototype/portal-gesture-ticket-04` — all portal code
in `apps/tabletop/src/client/shapes/portalGesturePrototype.tsx` plus marked hook-ins;
per-variant + multi-select Playwright smokes. Implementation notes for the spec are in
the "Mechanics facts learned" comment above; the winning variant gets rebuilt properly
at implementation time, not merged from the prototype branch.
