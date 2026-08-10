# TODO

The fleet's inbox: raw captures, pre-decision. Jess writes here; so do agents (`drop-buoy`).
Format: the seamapping plugin's `INBOX.md`. Committed work lives in the tracker — see
`SEAMAP.md` § Tracking.

Nothing here is triaged. When an item turns out to be real, promote it with `/to-tickets` (or
`/to-spec` first, if it's a multi-session build) and **delete the line**. When an item turns out
not to be real, delete the line. Done work leaves no trace here — git remembers, and a `## Done`
section is just a wall between Jess and the live work.

## In progress

## Next


- GRILLING: Feature: Let a player exit the table so they can rejoin with a different deck! (fleet)
  - Triage research (2026-08-10): nothing about "leaving a table" exists today — seats are
    permanent once taken (`Table#take_seat!`), no `seat.left` contract event, and a deck binds
    to a seat only implicitly via whatever `seat.joined` carried at join time. Needs a spec:
    a new cross-ship contract event, Spine seat-release logic, and — the real open
    question — what happens to the leaving player's library/hand/battlefield cards on the
    Tabletop (removed? left as an orphaned zone?). That's a game-design call, not plumbing.
    Promote via `/to-spec` when ready to decide it.

- GRILLING: bug: counters can't be copied... actually neither can images, cards, etc. They can be duplicated, so there's a workaround. (Tabletop)
  - Triage research (2026-08-10): not a shape-specific bug — it's a side effect of the
    2026-08-09 decision to serve the deployed Tabletop over plain `http://` to dodge tldraw's
    unlicensed-HTTPS canvas-blanking. `navigator.clipboard` only exists in secure contexts
    (HTTPS or localhost), so on the deployed table it's `undefined` and tldraw's clipboard code
    silently no-ops for every shape type — matching the bug report exactly. Duplicate (`Ctrl+D`)
    works because it bypasses the clipboard via `editor.duplicateShapes()`.
  - Fixing it "for real" reopens the http/https tradeoff settled a day ago (serve HTTPS + pay
    for/acquire a tldraw license, or leave it). A narrower option: build an in-app, non-OS
    clipboard for same-canvas copy/paste — new interaction design, not a bug fix, and would
    want `tabletop-shape-mechanics` owner input.
  - Jess's call needed: is OS-level (cross-app/cross-tab) copy/paste actually required, or is
    same-canvas copy/paste enough to justify a custom in-app clipboard — or is `Ctrl+D` an
    acceptable permanent answer given the deliberate http-only tradeoff?

- GRILLING: `sharing-hidden-zones` Decide how library/hand information gets shared when it _should_ be
  - Jess, 2026-08-07, working out where "never hands" really lives: _"there's actually an
    outstanding decision: how do we share library/hand information when it **should** be shared?
    …Sometimes there's 'look at target player's hand' and we need a way to share that — it might
    wind up in Shuffler, probably not Tabletop."_
  - The fleet keeps hidden zones (that's the Shuffler's whole job) but Magic constantly demands
    **deliberate** revealing: reveal the top card, reveal until you hit a land, Thoughtseize
    someone's hand, play with the top card revealed. None of it has a home today.
  - **Half the mechanism already exists**, which makes this smaller than it looks: `GameState`
    has a real **`Revealed` zone** — `reveal(position)`, `revealByGameCardIndex()`,
    `listRevealed()`, `RevealedLocation` — and `playCard` already accepts a card that's in hand
    _or_ revealed. What's missing is that a `Revealed` card is only visible in **that player's own
    browser**; no other player can see it. Sharing today is "turn your screen" / Discord.
  - **The split that probably decides it — symmetric vs asymmetric reveals:**
    - **Symmetric** ("reveal the top card of your library to everyone") is _physical_. At a real
      table you reveal by **putting the cards where everyone can see them** — which is what the
      Tabletop is. That argues the Tabletop, not a Shuffler view: revealed cards become real card
      shapes on the shared canvas, and it composes with everything already decided there.
    - **Asymmetric** ("look at target player's hand" — one opponent sees it, nobody else) **cannot**
      be the Tabletop: the canvas has no privileged actor and hides nothing
      (`notes/DESIGN-the-table-vision.md` § Principles). So Jess's instinct is right for this half —
      it's a Shuffler affordance, or, per the players-own-the-game principle, possibly not a feature
      at all: hold your hand up to the camera.
      Worth checking whether that split is real before designing either half; if it holds, this is two
      small items rather than one hard one.
  - Interacts with `let-gamecardindex-out` above (that one removes an accidental-leak guard; this one
    is about intentional revealing — don't conflate them) and with spectator mode, which `SEAMAP.md`
    makes a constraint on every mountain: "public events, commentary, hand counts but never hands."
    ← mountain: tabletop-replaces-mural

- [ ] DEFERRED `card-images-through-backend` Route every rendered card image through our backend instead of straight to Scryfall — ruled out of scope for the verify-suite-speed effort (commit `50ca157`); real product work whenever it's picked up

- GRILLING: `card-zoom-modal` Give a Tabletop card a modal overlay that shows its text really big, and offers flip
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

- GRILLING: `playmat-colours-fleet-or-shuffler` Do the playmat colours belong to the fleet, or to the Shuffler?
  - Jess, 2026-08-10: "I think I intended these to be dynamic based on your playmat choice, but
    let's replace them with constants named by use instead."
  - `--playmat-one` (`#f5dc8b`) and `--playmat-two` (`#4b7bba`) were **deliberately left** in
    `apps/shuffler/public/game.css` when everything else moved into `packages/design-tokens`
    (`tabletop-css-tokens`, `4396aea`). Recording why, because the omission looks like an oversight
    and isn't.
  - The design owner's recorded position — _"the playmat is one object, one appearance, two
    scales"_ — was decided about the Shuffler's two **pages** (/prepare and /game). Extending "one
    object" **across the ship boundary**, to a tldraw-rendered seat mat, is a different and
    unratified identity claim. Moving the tokens into the shared package would silently assert an
    answer to it.
  - The question is real, not hypothetical: the Tabletop does draw playmats. If the answer is
    "yes, one object fleet-wide", the tokens move and the Tabletop's mats inherit them. If "no,
    a seat mat is its own thing", they stay put and the Tabletop picks its own.
  - Related: `.scratch/tabletop-physics/issues/11-what-a-zone-looks-like.md` — deciding what a
    zone looks like, armed and at rest. Overlapping territory; that ticket decides zones, this
    decides whether the mat under them is fleet-owned. Link, don't merge.

- GRILLING: `tabletop-view-rotation` Let a seated player flip their view of the table 180°, and stop hosting `<Tldraw>` full-window
  - Surfaced 2026-08-10 in conversation: the game-experience win is being able to rotate your own
    view of the shared table, like turning around a real card table, so your own side reads
    right-side-up to you regardless of where you're sitting.
  - tldraw has no camera-rotation API — confirmed in conversation, not yet re-verified against
    the SDK docs. **The workaround is CSS**: wrap `<Tldraw>` in a "canvas pane" box (`TablePage.tsx`
    currently hosts it directly inside a bare `position:fixed;inset:0` div) and toggle
    `transform: rotate(180deg)` on that box. This is local/per-browser only — it never touches the
    synced document or camera state, so it doesn't need to coordinate with anyone else at the table.
  - Two things the rotate toggle button needs, both outside `<Tldraw>` itself: (1) it lives in the
    surrounding page chrome, not tldraw's own toolbar; (2) tldraw's own UI chrome — the toolbar
    override (`ToolbarWithCounter`) and `TableContextMenu` — will visually rotate along with its
    rotated DOM ancestor unless counter-rotated, so menu text/icons need a compensating rotation to
    stay upright. Watch for the corner-anchoring side effect: rotating the parent flips which corner
    an absolutely-positioned child visually lands in, even after its content is counter-rotated back
    upright.
  - This is also the first step toward a separate, bigger idea (not this item — deliberately not
    captured here, too large for a buoy): giving the Tabletop room for a sidebar (game-event log,
    debug event log, card-zoom modal) alongside the canvas instead of only on top of it. Wrapping
    `<Tldraw>` in a canvas pane is the shared prerequisite for both, but scope this item to the
    rotation feature alone.
  - Consult `tabletop-shape-mechanics` before implementing — need to confirm CSS-rotating the
    canvas's DOM ancestor doesn't disturb pointer hit-testing or zone detection
    (`onTranslateEnd`/`zoneHitTest.ts`). Consult `shuffler-looks-like-itself` for where the button
    and any new Tabletop-only CSS should live (Tabletop has no ship-local stylesheet yet).

- [ ] DEFERRED `applygamecommand-as-journey` `applyGameCommand`'s protocol looks like a Journey — worth a future look
  - Surfaced 2026-08-08 while grilling `.scratch/shuffler-architecture-review/issues/02-tabletop-send-veto-hook.md`
    (designing a pre-mutate hook for `/play-card`/`/discard-card`'s send-then-commit protocol).
    `apps/shuffler/src/apply-game-command.ts`'s shared retrieve/reconstruct/version-check/status-check/
    mutate/persist protocol is exactly the shape `services/spine/interpreter/docs/journeys/`
    (`Briefasaurus::Journey` — stages, needs, enactments, explicit outcomes) exists to name.
  - Specifically: the tabletop send in send-then-commit reads as an **Enactment** — a declared
    effect handed to the world, with idempotency and an explicit outcome — not a permission-check
    veto. That reframing is worth keeping even without adopting the framework.
  - Jess's call in the moment: capture the resemblance, don't build it now — ticket 02 still gets a
    small, non-Journey shape (a typed pre-mutate hook). Two ways this could go later: a TypeScript
    port of the relevant Journey concepts for the Shuffler, or moving game-command orchestration to
    the Spine as an actual Journey (cross-ship, and the framework's Ruby home already).
  - Related: `.scratch/shuffler-architecture-review/issues/02-tabletop-send-veto-hook.md`,
    `services/spine/interpreter/docs/journeys/README.md`.

## Backlog

- GRILLING: `exile-and-table-provenance` Add an exile action, and show in the table list how each card got there ← was: JES-85
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

- GRILLING: `finish-undo` Say what was undone, and decide whether we want redo ← was: JES-83, JES-99
  - > When the player undoes with ctrl-Z, surface what was undone somehow — a toast, maybe.
  - cmd-Z/ctrl-Z is already wired (`public/game.js`, clicks the live undo button), but there is **no
    toast mechanism anywhere in the Shuffler** — so undo currently happens silently. The event log
    already names every event (`nameMoveCardEvent`), so the text is free; the surface is the work.
  - Sitting inside it is a decision, not a task: **do we want redo?** `GameEvents.ts:176` already throws
    "Cannot undo an undo, use redo instead", so the code anticipates it. Decide before building — a
    reflex key with no counterpart is where people get hurt.

- [ ] `animate-card-to-table` Animate a card moving to where it's going, using its current position ← was: JES-84
  - > HTMX requests can include the card's current position; the server calculates the destination
    > position (e.g. where the table is) and styles the card with a CSS transition that moves it from
    > current to destination.
  - Not a fresh idea — the **replacement** for a known failure. The card-play exit animation was broken
    for months and fully removed in `943ece6`; the client-driven pattern (JS class + HTMX swap delay)
    was abandoned, and every animation today is entrance-only via server-rendered `WhatHappened`
    classes. Sending position up and letting the server render the transition keeps it inside that
    working model instead of racing the swap.
  - Consult the `animations` owner before touching this.

- [ ] `shuffler-logs-not-console` Convert the Shuffler's remaining `console.*` to trace-participating logs ← was: JES-135
  - **53 sites left** outside `src/scripts/` (verified 2026-08-06): `app.ts` 40, `server.ts` 8,
    `GameState.ts` 2, and one each in `view/debug/state-copy.ts`, `SqlitePersistStateAdapter.ts`,
    `ArchidektDeckToDeckAdapter.ts`. None reach Honeycomb, and the Shuffler creates zero manual
    spans, so these catch blocks are the only record of most failures.
  - The pattern is established at `POST /deck` (`dc2df7e`): `markCurrentSpanAsError` with the
    failure kind and inputs **first**, then `log.error(msg, attrs, error)` only for the stack.
    Many `app.ts` catch blocks already do step 1 — don't re-stamp them.
  - `src/scripts/*` keeps `console.*` on purpose, already written down in `apps/shuffler/CLAUDE.md`.
    Don't "finish the job" there.

- [ ] DEFERRED `spine-logs-in-traces` Give the Spine Ruby logs that participate in traces ← was: JES-137
  - The last ship without a log pipeline. Rails `TaggedLogging` → STDOUT
    (`config/environments/production.rb`), no OTel logs gem, zero explicit app-level logging in
    `app/`, `lib/`, or `interpreter/` — so Spine request logs never land on the trace, even though
    Rack instrumentation already continues a Shuffler-initiated trace into the Spine.
  - **Decide the fork first**: (a) the alpha `opentelemetry-logs-sdk` gem + OTLP appender, same
    shape as the Node ships, trace correlation for free; or (b) lograge → JSON on STDOUT → a
    collector `filelog` receiver — stable, but you inject `trace_id`/`span_id` yourself from
    `OpenTelemetry::Trace.current_span.context`. The lean is (b). Record the reasoning.
  - Done when a Shuffler → Spine request shows the Spine's log lines on the same Honeycomb trace.

- [ ] `logs-docs-catch-up` Fix the owner docs' stale "no logs" claims and put logs in the new-ship runbook ← was: JES-138
  - `owners/fleet-is-observable/README.md` still says the browser has no logger (twice, plus
    "`log.ts` still has no real callers") and `interactions.md` repeats it — all false since the
    browser pipeline landed: `logError()`, its own `LoggerProvider`, the collector's `/v1/logs`
    route and the ingress path all exist. The KB is currently steering agents away from a paved road.
  - `notes/add-opentelemetry.md` is the runbook for a new TS ship and covers tracing only, so a
    fourth ship would arrive with no logs. Extend it.
  - Everything else the closeout wanted has landed — violation inventory gone, sampling trap
    recorded, wiring table updated, per-ship duplication written down.

- GRILLING: `build-sha-on-every-span` Every span says which build it came from ← was: JES-139
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

- [ ] `spine-probe-sampling` Downsample health-probe traces in the Spine ← was: JES-130
  - `services/spine/config/initializers/opentelemetry.rb` sets **no sampler at all** — `GET /up` is
    roughly half of all spine spans, so queries and BubbleUp skew toward probes instead of real
    table/seat activity, and it burns event quota for no insight.
  - Copy the Shuffler's pattern (`src/telemetry-sampler.ts`): keep a trickle rather than dropping
    probes entirely, so a _failing_ probe is still visible. Give it a test — the Shuffler's inline
    sampler was silently broken for months because it didn't have one.

- [ ] DEFERRED `set-up-ci` Run the three test suites on every push ← was: JES-119
  - > github actions, so tests run on every PR.
  - There is **no `.github/` directory at all** (verified 2026-08-06), yet all three ships have
    suites: `jest` in the Shuffler, `vitest` in the Tabletop, Rails `test/` in the Spine. Nothing
    runs them but a human remembering to.
  - The old argument against starting — one permanently-red Playwright test — is gone; that test is
    fixed. Decide this on its own merits.

- [ ] `fun-game-ids` Game IDs as fun word combos instead of numbers ← was: JES-97
  - > Make game IDs fun word combinations instead of numbers. That makes them not derivable
    > (a small privacy win) and still looks pretty.
  - The **privacy** argument is the stronger one: `SEAMAP.md` makes "no login/auth yet" an
    explicit non-goal, so today a sequential game URL is guessable by anyone.
  - Touches persistence, not CSS: `nextGameId++` in both `InMemoryPersistStateAdapter.ts:35` and
    `SqlitePersistStateAdapter.ts:65` (the latter seeded from `MAX(id)`), plus the game URLs.

- GRILLING: `game-page-to-ejs` Migrate the active game page to EJS templates ← was: JES-78
  - > The active game page renders via TypeScript view functions, a historical accident rather
    > than an intention. Migrate it to EJS like the rest of the pages.
  - Seven files under `src/view/play-game/` build the page as template strings; nothing in `views/`
    covers it. **This is the substrate the rest of the game-screen work edits** — its order relative
    to those matters more than its own priority does.
  - The concrete cost is two `<head>`s that have already drifted: `views/partials/head.ejs` and
    `formatHtmlHead()` in `src/view/common/html-layout.ts` load different stylesheets and set
    conflicting `body` fonts (Ovo vs Orbitron). Consult the `shuffler-looks-like-itself` owner.

- [ ] DEFERRED `game-screen-table-layout` Sort the auto-drawn opening hand by card type then mana value ← was: JES-89, JES-87
  - The library-placement half of this is done (library now renders after command zone and
    revealed cards in `.game-top-row`). Sorting the opening hand is deferred: Jess's users said
    they don't want it (2026-08-10). `GameState.listHand()` still sorts by position only.

- [ ] `library-sort-toggle` Let the game's library search sort alphabetically or by library position ← was: JES-152, JES-142
  - > Seeing the library in true top-to-bottom order is how you confirm a shuffle happened, check
    > what Put on Top / Put on Bottom did, and verify draw order.
  - **Half of this is on an unmerged branch.** `library-alphabet` (commit `9a3c1b5`, checked out in
    `../mtg-deck-shuffler-worktree1`, 19 behind `main`) makes the game library alphabetical and
    updates the `library-search` owner docs to say so. On `main` it is still position order. Land
    that branch or drop it before building the toggle.
  - Shape: a sort control beside the existing "Group by Type" toggle — `?sortBy=position` as a peer
    of `?groupBy=type`, in `views/partials/library-modal.ejs` and the `/library-modal/:gameId` route.
  - ⚠️ Sort for **display only**. `GameState.listLibrary()` returns position order and draw, Put on
    Top and Put on Bottom all depend on `location.position`.
  - Library search is the one part of the app outside users have complained about — Jess's college
    kid and their friends, 2026-08-01.

- [ ] DEFERRED `english-card-faces` Show English names and images for other-language printings ← was: JES-96
  - Blocked on `card-zoom-modal` (Jess, 2026-08-10).
  - > Some cards come in other-language editions. Offer English. Example: Adventurous Impulse in
    > the Squirrel Girl deck (Archidekt 23735063).
  - Two halves, one cause, both in `ArchidektDeckToDeckAdapter.ts`: the name comes from
    `card.displayName || oracleCard.name` (line 101) and `displayName` is the _printed_ name, and
    `scryfallId: card.uid` (line 118) is that same localized printing, so the image is foreign too.
  - `oracleCardName` is already on `CardDefinition`, so the name half is nearly free; the image half
    needs resolving the English printing of the same oracle card.

- [ ] `commander-tax-counter` Count how many times the commander has been cast, in the command zone ← was: JES-81
  - > Track how many times the commander has been cast (commander tax). Display a play counter in the
    > command zone.
  - Nothing exists yet — no cast count in `src/` at all — but the command zone is a real rendered
    surface (`formatCommandZoneHtmlFragment`, `src/view/common/shared-components.ts`), so this is an
    addition to something that's already there. Small, and genuinely useful mid-game.

- [ ] `focus-ring-manual-tabthrough` Actually tab through the app and look at the new focus ring
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

- [ ] `focus-ring-on-white-decision` Decide what to do about --light-pink's 1.35:1 on white
  - Depends on the tab-through above. Real flat-white surfaces exist: `.modal-dialog`
    (`playmat.css:180` + the `prepare.css` duplicate), `docs.css:130`, `.button-base:disabled`.
  - **This is Jess's call, not a local patch.** The sanctioned fallback (a hairline `--deep-space`
    companion) can only be drawn with `box-shadow`, which doesn't accumulate across rules — so it
    would erase `.pushable-flat`'s two-layer press bevel on every focused button. Taking it means
    re-declaring the bevel inside `:focus-visible` for `.pushable-flat` and `.pushable-flat.pushable-dark`.
    See `owners/shuffler-looks-like-itself/open-choices.md` choice 5.

- [ ] `vestigial-modal-tabindex` Is `tabindex="0"` on the modal overlays doing anything?
  - It appears in exactly four places, all the modal overlay: `views/partials/card-modal.ejs:21`,
    `views/partials/library-modal.ejs:59`, `src/view/play-game/game-modals.ts:12`,
    `src/view/play-game/history-components.ts:11`.
  - Looks vestigial: the Escape trigger is `keyup … from:body` and the click-outside trigger is
    `click[target==this]` — neither needs the overlay to be focusable. If it goes, so does the
    `playmat.css:173-176` inward-offset companion rule that exists only to serve it, and the app
    stops having a keyboard stop on a whole-viewport div.
  - Not done during choice 5 because it's four files of modal behaviour, not a CSS change.
  - **Read `modals-are-not-modal` below first — it probably answers this.** That attribute looks
    like the fossil of a focus trap nobody finished, so the answer is likely "build the trap"
    rather than "delete the attribute".

- [ ] `modals-are-not-modal` The modals do not manage focus at all (Jess found this 2026-08-06)
  - Jess, tabbing the app: _"the Library Content box doesn't even work for focus flow. It's a
    modal and the things behind it get focus. It's a mess."_ Confirmed by reading every
    non-vendor JS file and all three modal templates. There is no focus management **anywhere**:
    - nothing calls `.focus()`, so opening a modal never moves focus into it — focus stays on
      the button now hidden behind the overlay;
    - nothing sets `inert` or `aria-hidden` on the background, so Tab walks the page underneath;
    - no `role="dialog"`, no `aria-modal="true"` (the only `aria` in the templates is `role="img"`
      on card-type icons), so a screen reader is never told a dialog opened;
    - nothing restores focus to the opener when the modal closes.
  - `game.js:311` _looks_ like it participates but doesn't: it tests whether `.modal-overlay`
    exists in the DOM before letting Ctrl-Z through. Its comment says "while a modal is focused",
    which is not what it checks. Fix that comment whenever this is touched.
  - Not caused by choice 5 — but choice 5 is why it's visible. With no focus rings, focus
    wandering behind an overlay was unobservable. The ring surfaced it on day one.
  - **Blocks `focus-ring-manual-tabthrough` and `focus-ring-on-white-decision`**: you cannot
    judge whether the ring is visible inside the white modal interior while Tab refuses to stay
    inside the modal. Do this first, then re-run the tab-through.
  - Sites: `views/partials/library-modal.ejs`, `views/partials/card-modal.ejs`,
    `src/view/play-game/game-modals.ts`, `src/view/play-game/history-components.ts`. All four are
    HTMX-swapped fragments, so whatever moves focus has to run on swap (`htmx:afterSwap`), not on
    page load — and closing is also an HTMX swap, so focus restore hooks the same place.
