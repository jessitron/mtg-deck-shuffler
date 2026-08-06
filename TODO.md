# TODO

The fleet's inbox: raw captures, pre-decision. Jess writes here; so do agents (`drop-buoy`).
Format: the seamapping plugin's `INBOX.md`. Committed work lives in the tracker — see
`SEAMAP.md` § Tracking.

Nothing here is triaged. When an item turns out to be real, promote it with `/to-tickets` (or
`/to-spec` first, if it's a multi-session build) and **delete the line**. When an item turns out
not to be real, delete the line. Done work leaves no trace here — git remembers, and a `## Done`
section is just a wall between Jess and the live work.

## In progress

- [ ] `linear-wind-down` Get the work worth keeping out of Linear and into this inbox  ← priority: medium
  - **Charted 2026-08-06** as a wayfinder map: `.scratch/linear-wind-down/map.md`. Destination:
    Jess can work on this project again — everything worth doing is a live line here, everything
    done or dead is gone, and nothing points a session at Linear.
  - Content is safe in `notes/linear-archive.md` (68 issues, snapshotted 2026-08-06). 40 are live
    and need a keep/kill call; the other 28 are Done or Canceled and get no record.
  - What happens *inside* Linear is out of scope — it's abandoned in place, not archived.

## Next

- [ ] `tabletop-card-shape` Give Tabletop cards a custom `ShapeUtil` that reports zone entry  ← mountain: tabletop-replaces-mural  ← was: JES-149
  - > "card was dragged into the graveyard" / "card was dragged from here to here" are essential
    > game events — not cosmetic, core to whether this architecture works at all.
  - **The keystone.** Cards and zones are stock tldraw `image`/`geo` records today
    (`src/server/cardArrival.ts`, `tableFurniture.ts`), rendered by a bare `<Tldraw store={...}>`
    in `TablePage.tsx` with no `shapeUtils` registered — so no hook fires. Confirmed present in
    `tldraw@5.2.5`: `onDragShapesOver`/`onDropShapesOver` on the *target* (how tldraw's own frame
    shape reparents), `onTranslateEnd` on the mover.
  - Do this **first**. `no-doubleclick-crop` and `animate-tap` both want this same custom shape,
    and the persistence work waits on having named domain events instead of raw sync-protocol diffs.

- [ ] `tabletop-survives-restart` Persist the table by logging its events to the Spine and replaying on boot  ← mountain: tabletop-replaces-mural  ← was: JES-151, JES-154, JES-131
  - > persistence. Right now, shutting down the app and starting it up, the table is gone.
  - Still true: `apps/tabletop/src/server/rooms.ts` holds each table as an in-memory `TLSocketRoom`
    — no snapshot, no load-on-boot. A redeploy wipes the board everyone is playing on.
  - **Event-sourced, not snapshotted** (decided 2026-08-01), so it waits on `tabletop-card-shape`:
    today's only events are raw tldraw sync diffs, not "card was exiled". Three new pieces — a
    `card.moved` contract payload (`contracts/payloads/` has only `card.played`, `seat.taken`,
    `table.created`), a **Tabletop→Spine sender**, which is a direction of data flow that doesn't
    exist yet (today it's Shuffler→Spine and Spine→Tabletop), and replay on room startup. The
    receiving end is already built: `POST /tables/:table_id/events` in the Spine.
  - Freeform doodles are not game events and never will be in the log — they need a tldraw
    snapshot store regardless.
  - Design the event shapes to be replayable as test fixtures. Jess: "persistence is gonna wind up
    mattering for testing."

- [ ] `deck-title-placement` Move the deck title out of the command zone on the game screen  ← mountain: tabletop-replaces-mural
  - > on the game screen, let's move the title of the deck out of the command zone; put it above
    > the table button(s), top-aligned with the hamburger menu.

- [ ] `playmat-command-zone` Redraw the player area to include the command zone  ← mountain: tabletop-replaces-mural  ← was: JES-141
  - > the Tabletop drawing needs to change: I forgot the command zone. Move exile down to replace
    > the bottom third of the Graveyard, instead.
  - Touches `apps/tabletop/DESIGN.md` and `src/server/tableFurniture.ts` — the design doc is the
    spec for the player area, so change it first.
  - Same job: **the mat should grow taller when lands overflow its bottom half.** DESIGN.md always
    said so; it was the scope cut from the player-area build, and `landPosition()` still wraps
    lands inside a fixed-height bottom half so enough lands spill past the mat's edge.
  - Know the ripple before you start: library/graveyard/exile/label are fixed offsets off the mat's
    bounds, and seats sit in a row at fixed x offsets by join order — so growing one mat re-derives
    that seat's whole column *and* shifts every player area to its right. It also means the area is
    built with `room.updateStore` after seat-joined, not created once.

- [ ] `player-area-polish` Polish the player area's geometry and cosmetics  ← mountain: tabletop-replaces-mural  ← was: JES-150, JES-147, JES-146, JES-148
  - > lands should leave a space between each other and the side of the playmat
  - Four nudges in the same two files, one sitting's work with the table open: land gaps in
    `landPosition()`; center the Stack pile over the seat's playmat in `stackCardPosition()`
    (it doesn't even take a `seatIndex` today — it anchors at the strip's left edge); drop the
    grey dotted outline and give the playmat a thick black border (`regionShape()`'s
    `dash: "dashed"`, one prop); give the library a border and a label.
  - The library one is realer than it looks: the Shuffler always sends a `cardBackImageUrl`, so
    the library always renders as a bare image — the `regionShape` fallback that carries the
    "Library" label never runs.
  - **Rounded corners are the one that isn't a prop.** tldraw's `geo` has no corner radius, so
    it's either a custom shape or baking the corners into a playmat image asset. Decide which
    before starting.

- [ ] `library-links-to-shuffler` Link the Tabletop library back to the Shuffler  ← mountain: tabletop-replaces-mural  ← was: JES-145
  - > Can we make the library link back to Deck Shuffler?
  - Quick win: the `url` prop is already there in `tableFurniture.ts`, hardcoded `""` in both the
    image and `regionShape` paths. The open part is *which* URL — needs a seatId → Shuffler game
    URL mapping the Tabletop doesn't have.

- [ ] `seat-label-deck-name` Show the deck name with the player name above the playmat  ← mountain: tabletop-replaces-mural
  - > have the player name include the deck name, above the playmat on the Tabletop

- [ ] `commander-in-command-zone` Place the commander in the command zone when the Tabletop loads  ← mountain: tabletop-replaces-mural
  - > When the Tabletop loads, have the commander appear in the command zone. Also place a
    > transparent version of the commander in its spot, one that doesn't move when they play the
    > commander.
  - The ghost copy is the interesting half: it marks *where the commander lives* so the zone still
    reads as the commander's home once the real card is out on the table.

- [ ] `no-doubleclick-crop` Curate the card's menus — kill crop, add rotate  ← mountain: tabletop-replaces-mural  ← was: JES-144
  - > On the Tabletop, double-clicking a card brings up something useless, a weird cropping thing.
    > Turn that off.
  - Two surfaces, one job: the double-click gesture (above) and the popup menu — drop "crop" and
    "download", keep "alt" and "replace media", add "rotate". Also a way to flip MDFC cards, ideally
    from the same submenu.
  - Cosmetic; rides on `tabletop-card-shape`. Don't build the shape for this.

- [ ] `animate-tap` Rotate a card 90° to tap it, and animate it  ← mountain: tabletop-replaces-mural  ← was: JES-144, JES-143
  - > Can we animate tapping the card?
  - > We must be able to rotate cards. Ideally, clicking on a card turns it 90 degrees.
  - **Rotation is the essential half** — real players hit this. Jess's college kid and their
    friends (2026-08-01) wanted to tap lands for mana and turn creatures sideways for summoning
    sickness; without it they track tapped state out-of-band, which defeats a shared visual table.
  - `onRotateStart`/`onRotate`/`onRotateEnd` are real hooks in `tldraw@5.2.5`, on the same custom
    shape `tabletop-card-shape` builds. Consult the `animations` owner — the Shuffler already has a
    card-movement animation vocabulary worth matching.

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

- [ ] `personal-play-space` Let a player pick their playmat and their sleeves  ← was: JES-86, JES-79, JES-132
  - > On the deck preview page, let the player choose inner and outer sleeve colors for their
    > deck. Part of making the table feel like a real, personal play space.
  - **The plumbing already exists, end to end.** `seat.joined` carries both `playmatImageUrl`
    and `cardBackImageUrl` (`src/port-tabletop/types.ts`), hardcoded by `defaultPlaymatImageUrl()`
    and `cardBackImageUrl()` whose own comments say "playmat selection in prep is deferred" and
    "until sleeve selection exists". The Tabletop already renders the playmat as an image asset
    (`tableFurniture.ts`). This is one picker in prep feeding two optional fields — not a build.
  - A sleeve image is exactly what a face-down card needs: the back of a sleeved card *is* the
    sleeve. And a sleeve edge gives cards the square corners the site's style wants.
  - Only the **rectangular sleeve frame** waits on `tabletop-card-shape` — a natural first
    exercise of a custom shape's rendering. The picker and the card back need nothing new.

- [ ] `shuffler-design-choices` Answer the four open Shuffler design choices  ← was: JES-155, JES-80
  - Choices 1 and 2 (button press physics, secondary gray) landed 2026-08-02. Still `_(pending)_`:
    **3** card-modal buttons (seven Material hues vs. primary/secondary), **4** corner radius on
    chrome (`0` vs. `4px`), **6** text-input treatment. Each is staged side by side on `/design`.
  - The blocker is Jess's answers, not the work: `owners/shuffler-looks-like-itself/open-choices.md`
    already holds every option with exact `file:line` steps and a resolve checklist. One choice
    per commit; consult the owner's `-context` / `-review` / `-update` skills.
  - Ride-along, found while triaging: **the flip button looks sad.** Jess wants a circle of two
    arrows centered under the card. It's Material orange `#ff9800`, duplicated and already
    diverged across `prepare.css:246` and `playmat.css:506`, with a `5px` radius that's on
    choice 4's list. Three pieces of drift on one component.
  - Choice 5 (the focus ring) is split out as `keyboard-focus-visible` — it's a regression, not
    a taste question.

- [ ] `keyboard-focus-visible` Give the Shuffler a real focus ring; stop deleting the browser's
  - **An accessibility regression, not a missing style.** `deck-selection.css:61` and `:88` set
    `outline: none` on the precon-search and Archidekt-number inputs and substitute a
    border-colour change — actively worse for keyboard users than never having styled it.
  - The whole app has exactly one focus rule, `site.css:325` `.button-base:focus`. No shipped
    stylesheet uses `:focus-visible` at all. Everything else has nothing.
  - **Deleting the two `outline: none` rules is correct under all three ring options**, so this
    doesn't wait on `shuffler-design-choices`. Picking the replacement ring does — it's choice 5,
    with candidates already written in `design-candidates.css`. The global rule belongs in
    `styles.css`, the only sheet every page loads.

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
