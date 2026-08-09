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

- [ ] `claim-tickets-on-main` Claim a ticket where other agents can see it — the worktree hides the claim
  - Surfaced 2026-08-09 while Jess took inventory of which wayfinder tickets were actively being
    worked: `tabletop-table-layout` ticket 16 showed `Status: ready-for-agent` on main while an
    agent was actively working it in `.claude/worktrees/ticket-16-prep-picker` — it had flipped
    the `Status:` line to `claimed` *inside the worktree*, invisible from main until the merge.
  - Why it matters: any other agent (or Jess) scanning main for `ready-for-agent` tickets can
    double-claim work already in flight. With parallel background agents now routine, the window
    is real, not theoretical.
  - Wanted: a convention — commit the `Status: claimed` change on main *before* entering the
    worktree (a one-line commit, cheap), or some other claim signal visible outside the worktree.
    Likely home: `docs/agents/issue-tracker.md`, plus wherever the wayfinder skill tells agents
    to claim.
  ← mountain: overhead

- [ ] `tldraw-license-key-expired` Prod tabletop deploys are blocked until a new tldraw key arrives
  - The evaluation key in `.be` expired 2026-08-09 (a day before its printed `2026-08-10` — tldraw
    parses expiry as UTC midnight then rebuilds it from local date parts, so it trips early west
    of UTC). Localhost is immune since `21ff05b` (TablePage passes empty-string `licenseKey` on
    loopback), but the deployed host still needs a real key.
  - ⚠️ **Don't deploy the Tabletop until then**: the expired key satisfies `deploy.sh`'s
    presence check, so the deploy proceeds and ships a canvas that blanks 5s after load —
    `check-deployed-canvas.mjs` only catches it after the rollout has already wiped the rooms.
  - Key status (2026-08-09): hobby license application pending, past tldraw's stated 2-week
    turnaround. Plan B: a 100-day enterprise trial key, to be requested when ready for real
    testing. Whichever lands first goes in the repo-root `.be` as `TLDRAW_LICENSE_KEY`.

- [ ] `design-text-link-specimen` Stage the nav-link idiom (text links) on `/design`
  - Surfaced 2026-08-09 by the `shuffler-looks-like-itself` update after `6b6b927` (Tabletop
    landing page's Shuffler link) named the idiom: white `--font-chrome` on dark, two live
    instances (`site.css` → `.right-nav a`, `LandingPage.tsx` → `styles.shufflerLink`), two
    underline variants (none-at-rest with hover vs. always-underlined for inline-style
    contexts). The gallery has a typography row for nav links but no component specimen; a
    Tabletop-side mock follows the ticket-11 precedents (labelled a mock, `.stage-white` —
    though this link sits on a dark page, so the stage choice needs a thought).

- [ ] `design-sleeve-specimen` Stage a sleeved-card mock specimen on `/design`
  - Surfaced 2026-08-08 by the `shuffler-looks-like-itself` review of table-layout ticket 17,
    which shipped sleeve rendering on the Tabletop canvas (card image centered in a
    sleeve-colored frame — radius `w * 0.05`, margin `w * 0.03`, flat, no border; face-down
    and the library pile as the bare sleeve rectangle). The gallery has no specimen, so the
    treatment exists only on the canvas; the owner said don't skip the specimen silently.
  - Shape: a mock in `apps/shuffler/public/design-candidates.css`, labelled a mock, staged on
    `.stage-white` (ticket 11's first draft wrongly used `.stage-dark`) — same convention as
    the zone mocks (`a304c52`).
  - Related: `tabletop-landing-page-palette` below notes the gallery has no Tabletop stage at
    all; this specimen is another instance of that gap.
  ← mountain: tabletop-replaces-mural

- [ ] `life-counter-needs-own-name` table-layout ticket 12's life/commander-damage shape can't be called `mtg-counter` anymore
  - Surfaced 2026-08-08 by both owner reviews on tabletop-physics ticket 18: that ticket (and the
    tabletop-physics spec) explicitly assign the type string `mtg-counter` to the drag-onto-a-card
    counter, and it's now registered in the sync schema with `{w, h, text}` props. Table-layout
    ticket 12 (`.scratch/tabletop-table-layout/issues/12-life-totals-and-commander-damage.md`,
    resolved) used `mtg-counter` as the *working name* for a different shape — locked furniture
    with a number and +/- buttons. When that gets built it needs its own name
    (`mtg-life-counter`?), and the tabletop-shape-mechanics KB's old `mtg-counter` cautions
    (locked, HyperlinkButton, LWW increments) describe *that* shape, not this one.

- [ ] `custom-shapes-lack-toSvg` none of the three custom shapes render in tldraw's SVG/image export
  - Surfaced 2026-08-08 by the design owner's review on tabletop-physics ticket 18. `mtg-card`,
    `mtg-zone`, and `mtg-counter` all skip `toSvg`, so an exported table image is missing all of
    them. A three-shape gap, worth solving in one pass (the counter's needs the Orbitron webfont
    hand-carried into the SVG per the design KB's standing rule) rather than piecemeal.

- [ ] `tabletop-verify-helpers` the Tabletop's Playwright specs triplicate their helpers
  - Surfaced 2026-08-08 by the standards review on tabletop-physics ticket 18: `cardPlayed()`,
    the mouse-drag helper, and the `Shift+1` + settle-wait zoom idiom now exist in at least
    three specs (`verify-counter`, `verify-zone-entry`, `verify-drag-identity`). Third
    occurrence — extract a shared test-helper module under `test/verification/`.
  - Re-surfaced 2026-08-09 by the code review on tabletop-physics ticket 15:
    `verify-tap-animation.spec.ts` added a fourth copy of `cardPlayed()` (plus a `placeCard()`
    wrapper it shares with `verify-card-rotate`). The count keeps climbing; the helper module
    would now pay for itself four times over.

- [ ] `browser-tracing-key-guard` the browser tracing init should skip (with a `console.warn`) when the apiKey is empty or the literal string `"undefined"`
  - Surfaced 2026-08-08 by `fleet-is-observable-context` during arch ticket 06 (unify page shell,
    `.scratch/shuffler-architecture-review/issues/06-unify-page-shell.md`). The shell's
    `Hny.initializeTracing` guard (`window.Hny && window.browserTabId`, now in
    `apps/shuffler/src/view/common/html-layout.ts`) doesn't cover the key: when neither
    `HONEYCOMB_INGEST_API_KEY` nor `HONEYCOMB_API_KEY` is set, the interpolation emits the
    truthy string `"undefined"` and export silently 401s — the browser cousin of the
    "`x-honeycomb-team=` present, non-empty, useless" finding in the fleet-is-observable KB.
    Owner asked that this be its own visible decision, and that the silent-skip family get a
    `console.warn` in the same pass.

- [ ] `zone-look-not-landed` `tableFurniture.ts`'s zone boxes still draw the old provisional look, not the decided one
  - Surfaced 2026-08-08 by `shuffler-looks-like-itself-context` while starting
    `.scratch/tabletop-table-layout/issues/01-command-zone-and-player-area.md`. `regionShape()` in
    `apps/tabletop/src/server/tableFurniture.ts` still draws dashed grey, `serif` label, opacity
    0.5, no radius/tokens — but `.scratch/tabletop-physics/issues/11-what-a-zone-looks-like.md`
    (resolved 2026-08-07, staged and confirmed on `/design`) decided and confirmed a different
    look: `2px dashed var(--dark-pink)` at rest, `--armed-glow` amber ring+tint when a card is
    dragged over, Orbitron (`--font-chrome`) label — plus the playmat's own exception (`10px solid
    black`, radius computed as 5% of the shape's height).
  - Matters now because ticket 01 is about to draw a new command-zone box through this same stale
    code path — worth fixing `regionShape()` before or alongside that, so the new zone doesn't
    inherit the wrong look.
  - **Partial progress 2026-08-08**, resolving `.scratch/tabletop-table-layout/issues/04-player-area-polish.md`:
    `regionShape()` now takes an optional per-call `RegionStyle` override, and the playmat call
    site passes `{ dash: "solid", color: "black", size: "xl" }` — the closest stock `geo` props
    get to the decided `10px solid black` look. Still an approximation: tldraw's `geo` size enum
    has no arbitrary pixel width, and there's still no corner radius at all (needs a self-rendering
    `mtg-zone` custom shape to do `5%` of the shape's height at render time, per
    `.scratch/tabletop-physics/issues/11-what-a-zone-looks-like.md`). Other zones (library,
    graveyard, exile, stack) are untouched — still the old dashed grey.
  ← mountain: tabletop-replaces-mural

- [ ] `tabletop-no-shutdown-flush` The Tabletop's server has the same dropped-telemetry-on-shutdown gap the Shuffler just fixed
  - Surfaced 2026-08-07 while resolving `.scratch/verify-suite-speed/issues/08-no-shutdown-flush-hook.md`
    (the Shuffler's `tracing.ts` had no SIGTERM/SIGINT handler, so `verify.sh`'s `cleanup()` and every
    k8s pod termination dropped the last OTel batch). `fleet-is-observable-context`/`-update` grepped
    `apps/tabletop/src/server/tracing.ts` while updating the owner KB and confirmed: same gap, unfixed.
  - The fix shape already exists and is proven in production use: `apps/shuffler/src/shutdownHooks.ts`'s
    `installShutdownHandlers()` — bounded drain via an `unref()`'d timeout, exactly-once exit even if
    both signals fire, `onTimeout`/`onDrainError` callbacks so the caller can log without coupling the
    helper to `log.ts`. Copy the pattern into the Tabletop rather than sharing the module — its
    `tracing.ts` and `log.ts` are already deliberately duplicated (different OTel version lines; see
    fleet `CLAUDE.md` and `notes/AGENT-NOTES.md`).
  ← mountain: overhead

- [ ] `playmat-drop-shadow` Does the playmat cast a shadow — on both pages, or neither?
  - **Mostly resolved already.** Jess ruled 2026-08-07 that the two mats are one object and their
    differences were historical accidents, not design. Landed in `a4991f3`: shared art and
    `border: 10px solid black` moved into a bare `.playmat` rule in `playmat.css`; radius stays
    per-page (80px/20px) because *radius is a matter of scale* — /prepare draws the mat smaller.
  - **What's left is one declaration.** `.playmat-game` still has `box-shadow: 5px 5px black`;
    `.playmat-prepare` has none. Not converged because Jess named three changes and this wasn't
    one — converging it would have been an appearance change riding along on an approved one.
    It is now the only difference between the mats with no stated reason.
  - The argument both ways: the shadow is a survivor of the "giant Magic card" reading — /game's
    art used to be a literal Magic card face (Scryfall `/png/front/…`, portrait, cover-cropped),
    and 80px radius + shadow + card art read as one big card. Landscape art half-retired that.
    So the shadow is either the last thread of a reading worth keeping, or a leftover of a dead one.
  - ← blocked-by: `design-playmat-specimen` — the design owner declined to stage this as a
    `/design` `.choice` because the gallery can't render a real playmat yet, and staging a choice
    Jess can't look at defeats the point.

- [ ] `design-playmat-specimen` `/design` renders a fake playmat, not the real one
  - `.stage-playmat` in `design-gallery.css` is gallery *chrome* that hand-copies the mat's art
    URL, `background-size: cover`, `background-position: center` and its own `3px solid black`
    border. It's a lookalike. So the gallery has been describing the playmat in its tables while
    rendering an imitation — exactly the drift `/design` exists to prevent ("if a component
    changes in the app, it changes here").
  - **Newly possible.** Before `a4991f3` there was no shared playmat rule to reuse; now there is a
    bare `.playmat` in `playmat.css`, so `.stage-playmat` could honestly become
    `class="stage playmat"` and inherit the real appearance.
  - Not a one-line swap: it's gallery surgery, and the stage needs a thinner border at specimen
    scale (3px, not the real 10px).
  - Doing this unblocks `playmat-drop-shadow` above.

- **The Tabletop-replaces-Mural mountain is charted.** The parity list, the six maps it
  splits into, and their order: `apps/tabletop/notes/DESIGN-tabletop-replaces-mural.md`. Two maps exist
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
  - ✅ **Scope settled 2026-08-07: Play Face-Down stays OUT of scope.** Jess briefly said it was
    needed for Mural parity, then confirmed sticking with `apps/tabletop/notes/DESIGN-tabletop-replaces-mural.md:127`
    — *"Mural doesn't do it either, so it isn't parity. Real Magic wants it; a later mountain can
    have it."* (Technically it *is* reachable in Mural by pasting a card back, and low priority
    besides; workable around in test games.) **So there is no Shuffler button in this item** — what
    remains is the domain/glossary work below, which is real regardless, because the Tabletop side
    of face-down is being built by the physics map either way.
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
  - **On `SEAMAP.md`'s "hand counts but never hands":** that promise is about what the app
    *volunteers*, and it survives fine — a shadow event simply shouldn't carry a card identity
    whether or not a boundary check exists. So this is payload design, not a guard: put the
    restriction on the events that could leak a hand, and stop making every door enforce it.
    Add a sentence to `SEAMAP.md` saying so rather than leaving the promise looking unowned.
  - The genuinely hard part is **not** here — it's *deliberate* sharing, which is its own item:
    see `sharing-hidden-zones` below.
  - Separately: does anything *want* `gameCardIndex` on the far side, or is this purely removing a
    constraint? If nothing needs it, the win is only conceptual — still worth it, but it means the
    Tabletop keeps using `instanceId` as its identity and nothing downstream changes.
  ← mountain: overhead

- [ ] `sharing-hidden-zones` Decide how library/hand information gets shared when it *should* be
  - Jess, 2026-08-07, working out where "never hands" really lives: *"there's actually an
    outstanding decision: how do we share library/hand information when it **should** be shared?
    …Sometimes there's 'look at target player's hand' and we need a way to share that — it might
    wind up in Shuffler, probably not Tabletop."*
  - The fleet keeps hidden zones (that's the Shuffler's whole job) but Magic constantly demands
    **deliberate** revealing: reveal the top card, reveal until you hit a land, Thoughtseize
    someone's hand, play with the top card revealed. None of it has a home today.
  - **Half the mechanism already exists**, which makes this smaller than it looks: `GameState`
    has a real **`Revealed` zone** — `reveal(position)`, `revealByGameCardIndex()`,
    `listRevealed()`, `RevealedLocation` — and `playCard` already accepts a card that's in hand
    *or* revealed. What's missing is that a `Revealed` card is only visible in **that player's own
    browser**; no other player can see it. Sharing today is "turn your screen" / Discord.
  - **The split that probably decides it — symmetric vs asymmetric reveals:**
    - **Symmetric** ("reveal the top card of your library to everyone") is *physical*. At a real
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

- [ ] `card-images-through-backend` Route every rendered card image through our backend instead of straight to Scryfall — ruled out of scope for the verify-suite-speed effort (commit `50ca157`); real product work whenever it's picked up

- [ ] `deck-chooser-lazy-images` `/choose-any-deck` ships 191 remote Scryfall images on every visit, un-lazy-loaded
  - Surfaced 2026-08-07 grilling `.scratch/verify-suite-speed/issues/03-setup-cost-and-isolation.md`
    (ticket 05, closed out of that map once seeding removed the suite's reason to care).
    `views/partials/deck-selection-precon.ejs:17` renders a remote `<img>` per precon deck — 191
    of them, plus per-colour SVGs — nothing lazy-loaded, paginated, or virtualised. Real cost to a
    real player: server renders in 26.6 ms, browser then waits ~1,280 ms for `load`.
  - Options already scoped: `loading="lazy"` (one attribute), pagination/virtualisation, or serving
    the art through the Shuffler's own (cached) route rather than 191 cross-origin connections —
    the last option converges with `card-images-through-backend`-style work if that lands first.
  - Consult `shuffler-looks-like-itself` — lazy-loading or pagination changes what a player sees,
    not just how fast it loads.
  - **Free and unrelated to the decision above:** `GET /choose-any-deck` (`src/app.ts:303`) calls
    `deckRetriever.listAvailableDecks()` and passes it to a template that never reads
    `availableDecks` — `LocalFileAdapter.listAvailableDecks()` synchronously parses all 191 deck
    files (~15 MB) for nothing, twice per navigation. OS page cache is absorbing it today (hence
    26.6 ms), but it's a dead parse either way — delete it whenever someone's in the file.

- [ ] `deeplinks-prop-moved` Check whether `<Tldraw deepLinks>` still does anything
  - tldraw **v5.0.0 moved `deepLinks` from a top-level `<Tldraw>` prop into `options`**, and
    `apps/tabletop/src/client/TablePage.tsx:82` still passes it top-level. Found incidentally by
    the tldraw custom-shape research (2026-08-06); **not verified either way** — it may still
    work, or viewport-in-the-URL may have been silently dead since the v5 upgrade.
  - One-sitting check: load a table, pan, and see whether the URL updates.

- [ ] `card-zoom-modal` Give a Tabletop card a modal overlay that shows its text really big, and offers flip
  - Jess, verbatim, 2026-08-07: *"Something cards do need to offer: a modal overlay that displays
    the card text really big, and offers flip, similar to Deck Shuffler. This is not needed to
    replace Mural though, it's later."*
  - **This is the Tabletop** (`apps/tabletop`), not the Shuffler. A card there is becoming a custom
    tldraw shape type `mtg-card` — decided in `.scratch/tabletop-physics/issues/02-what-a-card-is.md`,
    which gives it `frontImageUrl` / `backImageUrl` / `face` / `faceDown` props and makes the shape
    render its own image. A zoom modal renders off those same props; nothing new needs fetching.
  - *"similar to Deck Shuffler"* points at the Shuffler's existing card modals. The `library-search`
    and `two-faced-cards` owners both know that surface — consult them before designing a
    parallel one.
  - **Explicitly not Mural parity.** Jess scoped it as later work, after the
    `tabletop-replaces-mural` mountain. No `mountain:` below because it isn't confidently placed.
  - Related: `.scratch/tabletop-physics/issues/06-two-faces-and-face-down.md` must choose a **flip
    trigger**, and `onClick` on a card is already taken by tap (ticket 04, being resolved now). A
    zoom modal is a plausible home for the flip affordance — so 06 may want to know this exists,
    even though 06 lands first and this doesn't block it.
  ← priority: later

- [ ] `tabletop-landing-page-palette` Bring the Tabletop's landing page onto the fleet's identity
  - `apps/tabletop/src/client/LandingPage.tsx` styles itself with an off-brand green/cream palette
    in **inline styles** — `#1a2a1f` (dark green field), `#f5f1e8` (cream text), `#3d5a45` (mid
    green) — while the fleet's identity is purple-and-pink. A live Layer-1 violation ("use
    `var(--…)`, not a literal") sitting on the Tabletop's front door.
  - **Surfaced by** the `tabletop-css-tokens` work (`4396aea` + two follow-ups), which created
    `packages/design-tokens` (`@fleet/design-tokens`) — the fleet palette, `--narrow-border`, and
    the mana colours, served by the Shuffler at `/fleet/tokens.css` and imported by the Tabletop
    through Vite — and loaded Orbitron/Ovo on the Tabletop via a Google Fonts `<link>` in
    `apps/tabletop/index.html`. The landing page was left **byte-for-byte unchanged** on purpose.
    Landing the tokens makes fixing this *possible*; it is **not permission** to fix it.
  - **Not a mechanical `var(--…)` swap.** This is the Tabletop's *only* styled surface, so
    restyling it is the Tabletop's design pass in miniature: what the Tabletop looks like when it
    isn't tldraw. It's an **appearance decision and needs Jess's explicit sign-off** — the design
    owner (`owners/shuffler-looks-like-itself/`) flagged it as the largest possible ride-along on
    the token change, which is exactly why it didn't ride along.
  - **Staging it on `/design` is blocked today**: the Shuffler's gallery has no Tabletop specimens
    and no Tabletop stage, so there's nowhere to show Jess the options side by side. Same shape of
    blocker as `design-playmat-specimen` above.
  - **There is still no ship-local stylesheet on the Tabletop.** Shared tokens have a home now, but
    the first Tabletop-*only* CSS rule has nowhere to live — inline styles are the status quo by
    default, not by choice. Whoever does this work decides that too.

- [ ] `playmat-colours-fleet-or-shuffler` Do the playmat colours belong to the fleet, or to the Shuffler?
  - `--playmat-one` (`#f5dc8b`) and `--playmat-two` (`#4b7bba`) were **deliberately left** in
    `apps/shuffler/public/game.css` when everything else moved into `packages/design-tokens`
    (`tabletop-css-tokens`, `4396aea`). Recording why, because the omission looks like an oversight
    and isn't.
  - The design owner's recorded position — *"the playmat is one object, one appearance, two
    scales"* — was decided about the Shuffler's two **pages** (/prepare and /game). Extending "one
    object" **across the ship boundary**, to a tldraw-rendered seat mat, is a different and
    unratified identity claim. Moving the tokens into the shared package would silently assert an
    answer to it.
  - The question is real, not hypothetical: the Tabletop does draw playmats. If the answer is
    "yes, one object fleet-wide", the tokens move and the Tabletop's mats inherit them. If "no,
    a seat mat is its own thing", they stay put and the Tabletop picks its own.
  - Related: `.scratch/tabletop-physics/issues/11-what-a-zone-looks-like.md` — deciding what a
    zone looks like, armed and at rest. Overlapping territory; that ticket decides zones, this
    decides whether the mat under them is fleet-owned. Link, don't merge.

- [ ] `applygamecommand-as-journey` `applyGameCommand`'s protocol looks like a Journey — worth a future look
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

