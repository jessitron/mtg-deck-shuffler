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

- **`playmat-two-visual-metaphors`** — a future design open-choice. Now that both play pages
  say "playmat" in the markup (`.playmat playmat-prepare` / `.playmat playmat-game`), the app
  asserts one domain object wearing two looks, and the old "the game one is a giant Magic card,
  a different thing" justification is gone. `.playmat-prepare` (`prepare.css`): 20px radius,
  `outline: 10px solid black`, no shadow, local `/images/aeoe-43-cascading-cataracts.png`.
  `.playmat-game` (`game.css`): 80px radius, `border: 5px solid black`,
  `box-shadow: 5px 5px black`, hotlinked Scryfall PNG `33ea0047…`. Decide: intentional
  per-page treatment, or drift to converge? If they converge, the shared appearance goes in
  `playmat.css` as a bare `.playmat` rule — the slot is reserved and commented. Sub-question:
  the game mat hotlinks Scryfall while prepare uses a local asset; `notes/FEATURE-playmat.md`
  wants playmat selection to become a prep setting anyway.

- **The Tabletop-replaces-Mural mountain is charted.** The parity list, the six maps it
  splits into, and their order: `notes/DESIGN-tabletop-replaces-mural.md`. Two maps exist
  so far — work them with `/wayfinder`, one ticket at a time, rather than picking lines
  from here:
  - `.scratch/tabletop-physics/map.md` — cards and furniture become real shapes. **Start
    here**; it blocks the other one.
  - `.scratch/tabletop-table-layout/map.md` — the square, the command zone, life totals.
    (Formerly `tabletop-card-physics-starter`.)

- [ ] `face-down-is-a-real-thing` Make Face-Down Card a real fleet concept, and decide if the Shuffler gets a "Play Face-Down" button
  - Surfaced 2026-08-07 grilling `.scratch/tabletop-physics/issues/02-what-a-card-is.md`. Jess:
    *"In our domain model, 'Face Down Card' will be a real thing, and it looks like a card back
    (in the future: a card sleeve) **even if the card itself is two-faced**."*
  - **The model, as decided:** two independent axes, not one. `face` = which *printed* side is up,
    and only ranges over sides that exist (so it's unreachable on a one-faced card). Face-down =
    concealment, showing the shared card back. They compose: a two-faced card **cannot be turned**
    face down, but it **can be played** face down, and then it shows the card back regardless.
  - **The two ships differ on purpose:** in the Deck Shuffler a one-faced card cannot be flipped;
    on the Tabletop *any* card can be turned over, and a turned-over one-faced card **is** face-down
    — a real domain event, not just a picture. Already recorded in the `two-faced-cards` owner KB
    (commit `0337e00`) with a "flip" translation table; it wants to move to `CONTEXT-MAP.md`, which
    doesn't exist yet even though the root `CLAUDE.md` references it.
  - Glossary work: `notes/GLOSSARY.md` has no face-down entry, and **nothing in the fleet models it
    at all** — no field on `CardDefinition`/`GameCard`, nothing in `contracts/`.
  - ⚠️ **Scope contradiction, Jess's call.** She said "Play Face-Down" *"needs to happen for full
    Mural replacement"* — but `notes/DESIGN-tabletop-replaces-mural.md:127` already lists
    *"Playing a card from the library face-down onto the table"* under **Out of scope**, reasoning
    "Mural doesn't do it either, so it isn't parity. Real Magic wants it; a later mountain can have
    it." One of those has to give: either edit that line and take it into the parity list, or keep
    it parked and treat the Shuffler button as post-parity. Don't build it until that's settled.
  - Related: `.scratch/tabletop-table-layout/issues/09-sleeve-and-playmat-picker.md` already notes
    "a sleeve image is what a face-down card needs anyway" — the sleeve picker and this share an asset.
  - **Not** the Tabletop shape design for face-down; that's inside the physics map (tickets 02/06).
  ← mountain: tabletop-replaces-mural

- [ ] `let-gamecardindex-out` Reverse the decision that `gameCardIndex` never leaves the Shuffler
  - **Jess is reversing her own earlier call** (2026-08-07): *"gameCardIndex never passes out of
    Shuffler because I made the wrong call on that and I wish it did. I don't want you to have to
    reason about what is hidden and what isn't."* The cost being paid isn't secrecy — it's that
    every agent and every future payload has to carry a model of what may cross which boundary.
    Simplicity of reasoning beats a guard nobody's threat model needs, on a trust-based table.
    Follows from the principle in `notes/DESIGN-the-table-vision.md` § Principles: the players own
    the game experience; the app doesn't enforce.
  - **What it actually is** (verified, since the docs describe it only as "a decodable secret"):
    `gameCardIndex` is the card's index in the *initial deck-list array* (`GameState.ts:120`).
    It is **not** library order — that's `location.position`, shuffled by Fisher-Yates
    (`shuffleCollectingMoves`). So what it decodes to is *which card in the decklist this is*,
    and decklists are public on Archidekt.
  - **The sites to undo** — the guard is small, which is part of why keeping it looked free:
    - `apps/tabletop/src/server/cardArrival.ts:56` and `apps/tabletop/src/server/seatJoined.ts:35`
      — the two rejection checks (the `// JES-128` markers).
    - `apps/tabletop/test/cardArrival.test.ts:132` and `apps/tabletop/test/seatJoined.test.ts:132`
      — the two tests asserting rejection. They invert rather than delete.
    - The field-by-field comment block in `apps/shuffler/src/port-tabletop/types.ts`, plus the
      claims in `apps/shuffler/CLAUDE.md:186`, `apps/tabletop/README.md:40`, `apps/tabletop/DESIGN.md:133`.
    - There is also a unit test under `apps/shuffler/test/port-tabletop/` guarding the same thing.
  - ⚠️ **Reconcile with a stated constraint before landing.** `SEAMAP.md` says spectator mode gets
    "public events, commentary, **hand counts but never hands**." Once `gameCardIndex` can cross,
    a future shadow event ("seat 2 drew a card") carrying it names the card, so that sentence
    either changes or the *shadow-event* payloads carry the restriction instead of the boundary
    doing it. **Decide which, and say so in `SEAMAP.md`** — don't just delete the checks and leave
    the promise standing. This is the one piece of real thinking in the ticket.
  - Separately: does anything *want* `gameCardIndex` on the far side, or is this purely removing a
    constraint? If nothing needs it, the win is only conceptual — still worth it, but it means the
    Tabletop keeps using `instanceId` as its identity and nothing downstream changes.
  ← mountain: overhead

- [ ] `deck-title-placement` On the game screen, move the deck title out of the command zone
  - > Put it above the table button(s), top-aligned with the hamburger menu.
  - This is the **Shuffler's** game screen (`formatCommandZoneHtmlFragment` in
    `src/view/common/shared-components.ts`), not the Tabletop canvas — it came back here from the
    old card-physics map because it isn't really the Tabletop-replaces-Mural mountain, and it's a
    one-sitting change that doesn't need a ticket.
  - Consult `shuffler-looks-like-itself` — layout change on a page that owner watches.

- [ ] `verify-suite-speed` Instrument the verification suite, *then* optimize it
  - `apps/shuffler/verify.sh` runs 52 Playwright tests in **~9.5 minutes**. That's slow enough
    that nobody runs it, so nobody learns whether a change broke something — and red stops
    meaning anything. Three table-mode specs were broken for weeks before anyone looked
    (fixed 2026-08-07; the cause was a `<details>` disclosure the specs never learned about).
  - **Instrument before optimizing.** The fleet already exports OTel to Honeycomb and
    `verify.sh` sources `.be`/`.env`, so a full run is already emitting traces to environment
    `local` — go read them rather than guessing. Where does the time actually go: server
    startup? deck loading from disk (or Scryfall) on `/choose-any-deck`? the precon-tile HTMX
    load? Playwright's own auto-waits? The specs are also littered with fixed
    `waitForTimeout(500|1000)` calls, which are pure unconditional cost.
  - Worth knowing: `workers: 1` and `fullyParallel: false` in `playwright.config.ts` are
    deliberate ("we're testing concurrent state"), so parallelism is a decision to make, not a
    free win.
  - Jess asked for this on 2026-08-07, mid-fix on those three specs.
  - Related: `set-up-ci` below — a 9.5-minute suite shapes what CI can reasonably run per push.

- [ ] `deeplinks-prop-moved` Check whether `<Tldraw deepLinks>` still does anything
  - tldraw **v5.0.0 moved `deepLinks` from a top-level `<Tldraw>` prop into `options`**, and
    `apps/tabletop/src/client/TablePage.tsx:82` still passes it top-level. Found incidentally by
    the tldraw custom-shape research (2026-08-06); **not verified either way** — it may still
    work, or viewport-in-the-URL may have been silently dead since the v5 upgrade.
  - One-sitting check: load a table, pan, and see whether the URL updates.

## Backlog

- [ ] `exile-and-table-provenance` Add an exile action, and show in the table list how each card got there  ← was: JES-85
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

- [ ] `finish-undo` Say what was undone, and decide whether we want redo  ← was: JES-83, JES-99
  - > When the player undoes with ctrl-Z, surface what was undone somehow — a toast, maybe.
  - cmd-Z/ctrl-Z is already wired (`public/game.js`, clicks the live undo button), but there is **no
    toast mechanism anywhere in the Shuffler** — so undo currently happens silently. The event log
    already names every event (`nameMoveCardEvent`), so the text is free; the surface is the work.
  - Sitting inside it is a decision, not a task: **do we want redo?** `GameEvents.ts:176` already throws
    "Cannot undo an undo, use redo instead", so the code anticipates it. Decide before building — a
    reflex key with no counterpart is where people get hurt.

- [ ] `animate-card-to-table` Animate a card moving to where it's going, using its current position  ← was: JES-84
  - > HTMX requests can include the card's current position; the server calculates the destination
    > position (e.g. where the table is) and styles the card with a CSS transition that moves it from
    > current to destination.
  - Not a fresh idea — the **replacement** for a known failure. The card-play exit animation was broken
    for months and fully removed in `943ece6`; the client-driven pattern (JS class + HTMX swap delay)
    was abandoned, and every animation today is entrance-only via server-rendered `WhatHappened`
    classes. Sending position up and letting the server render the transition keeps it inside that
    working model instead of racing the swap.
  - Consult the `animations` owner before touching this.

- [ ] `shuffler-logs-not-console` Convert the Shuffler's remaining `console.*` to trace-participating logs  ← was: JES-135
  - **53 sites left** outside `src/scripts/` (verified 2026-08-06): `app.ts` 40, `server.ts` 8,
    `GameState.ts` 2, and one each in `view/debug/state-copy.ts`, `SqlitePersistStateAdapter.ts`,
    `ArchidektDeckToDeckAdapter.ts`. None reach Honeycomb, and the Shuffler creates zero manual
    spans, so these catch blocks are the only record of most failures.
  - The pattern is established at `POST /deck` (`dc2df7e`): `markCurrentSpanAsError` with the
    failure kind and inputs **first**, then `log.error(msg, attrs, error)` only for the stack.
    Many `app.ts` catch blocks already do step 1 — don't re-stamp them.
  - `src/scripts/*` keeps `console.*` on purpose, already written down in `apps/shuffler/CLAUDE.md`.
    Don't "finish the job" there.

- [ ] `spine-logs-in-traces` Give the Spine Ruby logs that participate in traces  ← was: JES-137
  - The last ship without a log pipeline. Rails `TaggedLogging` → STDOUT
    (`config/environments/production.rb`), no OTel logs gem, zero explicit app-level logging in
    `app/`, `lib/`, or `interpreter/` — so Spine request logs never land on the trace, even though
    Rack instrumentation already continues a Shuffler-initiated trace into the Spine.
  - **Decide the fork first**: (a) the alpha `opentelemetry-logs-sdk` gem + OTLP appender, same
    shape as the Node ships, trace correlation for free; or (b) lograge → JSON on STDOUT → a
    collector `filelog` receiver — stable, but you inject `trace_id`/`span_id` yourself from
    `OpenTelemetry::Trace.current_span.context`. The lean is (b). Record the reasoning.
  - Done when a Shuffler → Spine request shows the Spine's log lines on the same Honeycomb trace.

- [ ] `logs-docs-catch-up` Fix the owner docs' stale "no logs" claims and put logs in the new-ship runbook  ← was: JES-138
  - `owners/fleet-is-observable/README.md` still says the browser has no logger (twice, plus
    "`log.ts` still has no real callers") and `interactions.md` repeats it — all false since the
    browser pipeline landed: `logError()`, its own `LoggerProvider`, the collector's `/v1/logs`
    route and the ingress path all exist. The KB is currently steering agents away from a paved road.
  - `notes/add-opentelemetry.md` is the runbook for a new TS ship and covers tracing only, so a
    fourth ship would arrive with no logs. Extend it.
  - Everything else the closeout wanted has landed — violation inventory gone, sampling trap
    recorded, wiring table updated, per-ship duplication written down.

- [ ] `build-sha-on-every-span` Every span says which build it came from  ← was: JES-139
  - Nothing in the fleet carries a build identity — no `service.version`, no `deployment.sha`,
    anywhere (verified 2026-08-06). Deploy markers mark a *moment*, so "is this error only on the
    new build?" is answered by eyeballing which side of a marker line events fall on, which breaks
    down with overlapping pods or two close deploys.
  - Shape: `deploy.sh` already computes the short sha for the image tag → Docker build arg → env
    var → OTel **resource attribute** at SDK init, so it lands on every span *and* every log for
    free. The Tabletop's `ARG TLDRAW_LICENSE_KEY` is the precedent; do the browser bundle too — a
    user holding a stale bundle after a deploy is currently invisible.
  - `owners/fleet-is-observable/README.md` already holds this as Invariant 5, marked FUTURE.
    Landing it means dropping that marker and making it a standing check on any new init path.

- [ ] `spine-probe-sampling` Downsample health-probe traces in the Spine  ← was: JES-130
  - `services/spine/config/initializers/opentelemetry.rb` sets **no sampler at all** — `GET /up` is
    roughly half of all spine spans, so queries and BubbleUp skew toward probes instead of real
    table/seat activity, and it burns event quota for no insight.
  - Copy the Shuffler's pattern (`src/telemetry-sampler.ts`): keep a trickle rather than dropping
    probes entirely, so a *failing* probe is still visible. Give it a test — the Shuffler's inline
    sampler was silently broken for months because it didn't have one.

- [ ] `set-up-ci` Run the three test suites on every push  ← was: JES-119
  - > github actions, so tests run on every PR.
  - There is **no `.github/` directory at all** (verified 2026-08-06), yet all three ships have
    suites: `jest` in the Shuffler, `vitest` in the Tabletop, Rails `test/` in the Spine. Nothing
    runs them but a human remembering to.
  - The old argument against starting — one permanently-red Playwright test — is gone; that test is
    fixed. Decide this on its own merits.

- [ ] `fun-game-ids` Game IDs as fun word combos instead of numbers  ← was: JES-97
  - > Make game IDs fun word combinations instead of numbers. That makes them not derivable
    > (a small privacy win) and still looks pretty.
  - The **privacy** argument is the stronger one: `SEAMAP.md` makes "no login/auth yet" an
    explicit non-goal, so today a sequential game URL is guessable by anyone.
  - Touches persistence, not CSS: `nextGameId++` in both `InMemoryPersistStateAdapter.ts:35` and
    `SqlitePersistStateAdapter.ts:65` (the latter seeded from `MAX(id)`), plus the game URLs.

- [ ] `game-page-to-ejs` Migrate the active game page to EJS templates  ← was: JES-78
  - > The active game page renders via TypeScript view functions, a historical accident rather
    > than an intention. Migrate it to EJS like the rest of the pages.
  - Seven files under `src/view/play-game/` build the page as template strings; nothing in `views/`
    covers it. **This is the substrate the rest of the game-screen work edits** — its order relative
    to those matters more than its own priority does.
  - The concrete cost is two `<head>`s that have already drifted: `views/partials/head.ejs` and
    `formatHtmlHead()` in `src/view/common/html-layout.ts` load different stylesheets and set
    conflicting `body` fonts (Ovo vs Orbitron). Consult the `shuffler-looks-like-itself` owner.

- [ ] `game-screen-table-layout` Arrange the game screen the way a real table is arranged  ← was: JES-89, JES-87
  - > Move the library to the right side of the game screen — that's where it sits in a real game.
  - Library renders first in `.game-top-row` (`src/view/play-game/active-game-page.ts:84`), so it's
    currently on the left, ahead of revealed cards and the command zone.
  - Same argument, second half: sort the auto-drawn opening hand by card type then mana value —
    lands first, then creatures, then everything else. `GameState.listHand()` sorts by position only.

- [ ] `library-sort-toggle` Let the game's library search sort alphabetically or by library position  ← was: JES-152, JES-142
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

- [ ] `english-card-faces` Show English names and images for other-language printings  ← was: JES-96
  - > Some cards come in other-language editions. Offer English. Example: Adventurous Impulse in
    > the Squirrel Girl deck (Archidekt 23735063).
  - Two halves, one cause, both in `ArchidektDeckToDeckAdapter.ts`: the name comes from
    `card.displayName || oracleCard.name` (line 101) and `displayName` is the *printed* name, and
    `scryfallId: card.uid` (line 118) is that same localized printing, so the image is foreign too.
  - `oracleCardName` is already on `CardDefinition`, so the name half is nearly free; the image half
    needs resolving the English printing of the same oracle card.

- [ ] `commander-tax-counter` Count how many times the commander has been cast, in the command zone  ← was: JES-81
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
  - Jess, tabbing the app: *"the Library Content box doesn't even work for focus flow. It's a
    modal and the things behind it get focus. It's a mess."* Confirmed by reading every
    non-vendor JS file and all three modal templates. There is no focus management **anywhere**:
    - nothing calls `.focus()`, so opening a modal never moves focus into it — focus stays on
      the button now hidden behind the overlay;
    - nothing sets `inert` or `aria-hidden` on the background, so Tab walks the page underneath;
    - no `role="dialog"`, no `aria-modal="true"` (the only `aria` in the templates is `role="img"`
      on card-type icons), so a screen reader is never told a dialog opened;
    - nothing restores focus to the opener when the modal closes.
  - `game.js:311` *looks* like it participates but doesn't: it tests whether `.modal-overlay`
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
