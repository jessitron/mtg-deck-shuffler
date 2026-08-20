# TODO

The fleet's inbox: raw captures, pre-decision. Jess writes here; so do agents (`drop-buoy`).
Format: the seamapping plugin's `INBOX.md`. Committed work lives in the tracker — see
`SEAMAP.md` § Tracking.

Work here is untriaged or lightly triaged (big things marked GRILLING). Some things are small enough to not need a ticket. Delete anything that's done or no longer applicable.

## Next

- irritating bug: played cards should not keep appearing to the right of the previous location, after the other one has been moved! That's only for when the prior card is still on the stack right where it landed.

- RETEST post-tldraw upgrade: weird bug: occasionally, for no discernable reason, a bunch of cards return to the stack where they were initially played 😭

- bug: when a card is tapped, the counter on it animates... wrong. It does weird wiggly things instead of rotating properly with the card. Maybe rethink the card animation

- before I deploy Tabletop, I need to check whether anyone is playing! Because it will lose their game! Board: https://ui.honeycomb.io/modernity/environments/mtg-deck-shuffler/board/iFWhpa9AFeC/Is-Someone-Playing-Right-Now ... how can I make that part of the procedure?

- Cards in the graveyard or exile do not tap on click. Instead, they come to the front.

- Consider removing the animations owner, since the animations don't do much now.

- Consider timeout and restart on the SSE streams, and tabletops in memory. 30m-1h with no events or clicks is a reasonable time to unsubscribe. This needs to be easy to change. Also add a way in both apps (in debug mode or by special URL) to timeout the stream immediately, for testing.

- the Tabletop's tests should be able to receive a stream of events and applying them. Right now it has a cardPlayed HTTP shim, do not like.

- `/design` specimen owed for the on-brand `mtg-title` deck-title label (Orbitron via
  `var(--font-chrome)`, colored by the deck's darker identity color). Cross-ship: the shape
  lives in `apps/tabletop`, the gallery lives in `apps/shuffler/views/design.ejs` — stage it
  as a `.stage-white` Tabletop mock, per precedent (counter-disc, sleeved-card). Buoyed from
  the 2026-08-13 restyle rather than reached across from that Tabletop-scoped change. See
  `owners/shuffler-looks-like-itself/open-choices.md` → the deck-title `mtg-title` entry.

- GRILLING: Tokens support. Archidekt lets you add tokens to your deck. We could bring them in and make them available on the board. They can tap like cards, they hold counters etc. but if you drag them to the graveyard, they go back to their place under your playmat (or wherever we decide to line them up). Oh and if you drag a token from its spot where it was drawn to the board it immediately creates another one in the spot it left; each token is an infinite pile. Then: people need to add tokens as the game is going, because we rarely have them all prepped before hand. Paste any image, right-click and say "make token." A token (infinite pile) appears next to the others. Now they can be clicked to tap.

- The Shuffler's game page should display in-hand and revealed cards as sleeved, when the player has chosen sleevers. They need to be on a sleeve-colored rectangle, like in Tabletop.

- `commander-tax-tracker` on the Tabletop, Above the Command Zone, above each commander, add a Play Count tracker. It is a number that starts at 0. It can be incremented or decremented (down to 0) or typed in. When the commander leaves the command zone, it increments! (This is commander tax — how many times the commander has been cast.)

- when commander damage is incremented, decrement the life counter.

- `commander-snap` When I put my commander back in my command zone, it snaps to its starting position, covering its shadow.

- `drop-cards-linebreak` The Shuffler's hand re-ordering: there's a problem that when the cards are on two lines, like

```
A B C
D 👋🏾
```

and I want to drop a card in between C and D, then the drop zone between them is either after C or before D, it isn't both, and it isn't predictable. I want it to be both. What if instead of `[dropzone, card, dropzone, card, dropzone]` the flexbox contained `[[dropzone, card, dropzone],  [dropzone, card, dropzone]] such that two adjacent dropzones overlap completely and function the same as one? Then both C and D would have dropzones on either side.

- GRILLING: `card-zoom-modal` Give a Tabletop card a modal overlay that shows its text really big, and offers flip
  - this is dependent on Table Rotation, because that'll put something we own around tldraw.
  - Jess, verbatim, 2026-08-07: _"Something cards do need to offer: a modal overlay that displays
    the card text really big, and offers flip, similar to Deck Shuffler. This is not needed to
    replace Mural though, it's later."_
  - **This is the Tabletop** (`apps/tabletop`), not the Shuffler. A card there is becoming a custom
    tldraw shape type `mtg-card` — decided in `.scratch/tabletop-physics/issues/02-what-a-card-is.md`,
    which gives it `frontImageUrl` / `backImageUrl` / `face` / `faceDown` props and makes the shape
    render its own image. A zoom modal renders off those same props; nothing new needs fetching.
  - _"similar to Deck Shuffler"_ points at the Shuffler's existing card modals. The `library-search`
    and `two-faced-cards` owners both know that surface — consult them before designing a
    parallel one.
  - **Explicitly not Mural parity.** Jess scoped it as later work, after the
    `tabletop-replaces-mural` mountain. No `mountain:` below because it isn't confidently placed.
  - Related: `.scratch/tabletop-physics/issues/06-two-faces-and-face-down.md` must choose a **flip
    trigger**, and `onClick` on a card is already taken by tap (ticket 04, being resolved now). A
    zoom modal is a plausible home for the flip affordance — so 06 may want to know this exists,
    even though 06 lands first and this doesn't block it.
    ← priority: later
  - Let's do this after rotation, so that we have the option of the modal being outside of tldraw.

## Backlog

- GRILLING: `exile-and-table-provenance` Add an exile action to Shuffler, and show in the table list how each card got there ← was: JES-85
  - > For cards on the table, track how they got there. Give players 'discard' and 'exile' buttons
    > that move a card to the table, and display how it got there in the list of cards on the table.
  - Half of this already shipped: Discard exists end to end (`POST /discard-card`,
    `MoveCardEvent.verb: "discard"`, `GameState.discardCard`), and `nameMoveCardEvent` already renders
    it as "Discard" rather than "Play". What's left is **exile** — `verb` is typed as the bare literal
    `"discard"`, so it's a type change plus a route plus a modal button.
  - The other half: the "Cards on Table" modal still lists bare card names
    (`formatTableCardListHtmlFragment` in `src/view/play-game/game-modals.ts`), even though the event
    log already knows how each card got there.
  - **Real players hit this** (2026-08-01): Jess's college kid and friends absentmindedly delete cards
    off the whiteboard to mean "discard" instead of moving them to a graveyard. Dedicated actions beat
    ad-hoc deletion. The Tabletop side of that same confusion belongs to `tabletop-card-shape`, not here.

- GRILLING: `finish-undo` In the shuffler, Say what was undone, like in a toast.
  - > When the player undoes with ctrl-Z, surface what was undone somehow — a toast, maybe.
  - cmd-Z/ctrl-Z is already wired (`public/game.js`, clicks the live undo button), but there is **no
    toast mechanism anywhere in the Shuffler** — so undo currently happens silently. The event log
    already names every event (`nameMoveCardEvent`), so the text is free; the surface is the work.

- [ ] `animate-card-to-table` Animate a card moving to where it's going, using its current position
  - > HTMX requests can include the card's current position; the server calculates the destination
    > position (e.g. where the table is) and styles the card with a CSS transition that moves it from
    > current to destination.

- [ ] `shuffler-logs-not-console` Convert the Shuffler's last two stray `console.*` call sites to trace-participating logs ← was: JES-135
  - `src/scripts/*` keeps `console.*` on purpose

- GRILLING: `build-sha-on-every-span` Every span says which build it came from
  - Nothing in the fleet carries a build identity — no `service.version`, no `deployment.sha`,
    anywhere (verified 2026-08-06). Deploy markers mark a _moment_, so "is this error only on the
    new build?" is answered by eyeballing which side of a marker line events fall on, which breaks
    down with overlapping pods or two close deploys.
  - Shape: `deploy.sh` already computes the short sha for the image tag → Docker build arg → env
    var → OTel **resource attribute** at SDK init, so it lands on every span _and_ every log for
    free. The Tabletop's `ARG TLDRAW_LICENSE_KEY` is the precedent; do the browser bundle too — a
    user holding a stale bundle after a deploy is currently invisible.
  - `owners/fleet-is-observable/README.md` already holds this as Invariant 5, marked FUTURE.
    Landing it means dropping that marker and making it a standing check on any new init path.

- GRILLING: `game-page-to-ejs` Migrate the active game page to EJS templates ← was: JES-78
  - > The active game page renders via TypeScript view functions, a historical accident rather
    > than an intention. Migrate it to EJS like the rest of the pages.
  - Seven files under `src/view/play-game/` build the page as template strings; nothing in `views/`
    covers it. **This is the substrate the rest of the game-screen work edits** — its order relative
    to those matters more than its own priority does.
  - The concrete cost is two `<head>`s that have already drifted: `views/partials/head.ejs` and
    `formatHtmlHead()` in `src/view/common/html-layout.ts` load different stylesheets and set
    conflicting `body` fonts (Ovo vs Orbitron). Consult the `shuffler-looks-like-itself` owner.

- add the number of cards in the library and the hand to the tabletop. This is blocked by schema change monster and spine-in-the-middle.

- [ ] DEFERRED `english-card-faces` Show English names and images for other-language printings
  - Blocked on `card-zoom-modal` (Jess, 2026-08-10).
  - > Some cards come in other-language editions. Offer English. Example: Adventurous Impulse in
    > the Squirrel Girl deck (Archidekt 23735063).
  - Two halves, one cause, both in `ArchidektDeckToDeckAdapter.ts`: the name comes from
    `card.displayName || oracleCard.name` (line 101) and `displayName` is the _printed_ name, and
    `scryfallId: card.uid` (line 118) is t hat same localized printing, so the image is foreign too.
  - `oracleCardName` is already on `CardDefinition`, so the name half is nearly free; the image half
    needs resolving the English printing of the same oracle card.

- [ ] `focus-ring-manual-tabthrough` Actually tab through the app and look at the new focus ring
  - Unblocked: `modals-are-not-modal` landed (focus trap + dialog semantics on all four modals).
  - Choice 5 (global `:focus-visible` ring) shipped 2026-08-06 with build, 224 unit tests and the
    5-test gallery spec all green — but **no human has tabbed the pages**, which is the real test.
  - Cover `/`, `/choose-any-deck`, `/prepare`, `/game`, `/docs` (link-dense, and it has its own
    second `:root`), `/design`, the debug state view (the app's only `<summary>`), and **inside an
    open library modal and card modal** — the white-surface and full-viewport-overlay cases.
  - The suspected weak spot is the flat-white `.modal-dialog` interior: `--light-pink` on white is
    ~1.35:1, under WCAG 1.4.11's 3:1 floor for non-text indicators.
  - **Look at `.begin-button` specifically** (BEGIN on `/`, Shuffle Up on `/prepare`) — the ticket
    named it as the one place this treatment could mush, since a light-pink ring sits 3px off a
    10px light-pink border. The argument that it holds (the gap shows the page, not the button) is
    only an argument; on `/prepare` that gap shows card art rather than the dark gradient.

- [ ] DEFERRED `focus-ring-on-white-decision` Decide what to do about --light-pink's 1.35:1 on white
  - Depends on the tab-through above. Real flat-white surfaces exist: `.modal-dialog`
    (`playmat.css:180` + the `prepare.css` duplicate), `docs.css:130`, `.button-base:disabled`.
  - **This is Jess's call, not a local patch.** The sanctioned fallback (a hairline `--deep-space`
    companion) can only be drawn with `box-shadow`, which doesn't accumulate across rules — so it
    would erase `.pushable-flat`'s two-layer press bevel on every focused button. Taking it means
    re-declaring the bevel inside `:focus-visible` for `.pushable-flat` and `.pushable-flat.pushable-dark`.
    See `owners/shuffler-looks-like-itself/open-choices.md` choice 5.
