# 14 — Zone appearance: dashed at rest, glow when armed

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: task
Status: done

**What to build:** Give `mtg-zone` its real visual treatment, replacing today's unchosen stock
tldraw dashed-grey look.

At rest: port `.commander-placeholder`'s dashed "empty receptacle" pattern and retokenize it —
`2px dashed var(--dark-pink)`, radius `0`. Armed (a card is being dragged over it): a new
`--armed-glow` token (`#e6a33d`) drives a `box-shadow` ring plus a background tint, uniform
across every zone type — including the playmat and library, where the tint is invisible under
their opaque picture layer but the ring still shows. Compute the armed state reactively inside
the zone's own `component()` (e.g. `useValue` over shapes currently being translated) — never
written to the store, so it produces no synced document write and no undo entry. The armed
highlight is visible only to the player doing the dragging, never synced to other clients.

The playmat's border is plain `black`, `10px solid`, untokenized on purpose — matching the
Shuffler's mats exactly, not `--dark-pink`. The playmat's corner radius is computed at render
time as 5% of the shape's own `props.h`, applied equally to both axes (not a fixed pixel value,
not a bare CSS percentage — CSS percentage radii resolve width/height separately and draw an
ellipse on a non-square box). The Stack gets no distinct visual treatment — same
dashed-at-rest/glow-armed family as graveyard/exile/command.

`packages/design-tokens` already carries `--armed-glow` and the Tabletop already imports the
palette and loads Orbitron — no plumbing blocked here.

**Blocked by:** 13

- [x] A zone at rest shows the dashed pattern; an armed zone shows the glow ring + tint
- [x] The armed highlight is computed reactively, never written to the store, and appears only on
      the dragging player's own client (verify with two Playwright clients)
- [x] The playmat keeps its plain black 10px border
- [x] The playmat's corner radius is 5% of its height, computed at render time, equal on both axes
- [x] The Stack matches the graveyard/exile/command visual family

**Verified:** `tsc --noEmit` clean on both tsconfigs; `npx vitest run` 36/36; `./verify.sh`
14/15 — the one failure (`verify-card-drag-identity.spec.ts`) is the same pre-existing,
unrelated zoom-button timeout carried since ticket 13. New
`test/verification/verify-zone-armed.spec.ts` (2 tests): armed glow appears mid-drag and
reverts on drop (polling `box-shadow` via `getComputedStyle`), and a two-`BrowserContext` test
confirming the armed state never appears on a second client watching the same table while the
first drags. Screenshot-verified both rest and armed states visually match the staged `/design`
mockup.

The literal CSS values (`.zone-mock--rest`/`.zone-mock--armed-glow` in
`apps/shuffler/public/design-candidates.css`) were verified directly rather than trusting ticket
11's prose "Answer" summary alone — a `shuffler-looks-like-itself-review` pass on the plan caught
that the prose ("a box-shadow ring plus a background tint") didn't specify the actual staged
numbers, which turned out to be a 3px ring + a separate 16px/5px blur layer + a ~10%-opacity
tint, not the single 4px ring + full-opacity tint I'd first drafted.

A `/code-review` pass (medium effort) caught one real gap before commit: the armed-zone signal
only armed the *first* selected shape's zone during a multi-card drag, silently ignoring the
rest. Fixed by turning the shared signal into a set of armed zone ids (one per dragged shape),
so a multi-select drag over several zones arms all of them.

The topmost-zone-wins hit test (`zoneAt()`'s internals) was extracted into a shared
`apps/tabletop/src/client/shapes/zoneHitTest.ts`, used by both the card's zone-entry detection
and the zone's own armed-state check — the second consumer tabletop-shape-mechanics watch point
8 had already anticipated.

**Owners consulted:** `tabletop-shape-mechanics` (-context, -review, -update — confirmed
`editor.isIn("select.translating")` + `getSelectedShapeIds()` against tldraw source, confirmed
`useValue` inside `component()` is the sanctioned pattern, recommended the shared per-editor
signal over a naive per-zone rescan) and `shuffler-looks-like-itself` (-context, -review,
-update — supplied and verified the exact staged CSS values, confirmed `--dark-pink`/
`--armed-glow` resolve the same way `--font-chrome` already proved to in ticket 13, closed out
the open-choices entry for this decision as built).
