# Domain Definitions

We are in the domain of MTG, Magic: the Gathering. This is a card game published by Wizards of the Coast.

Our app is called MTG Deck Shuffler.

## Bounded Contexts

Archidekt: this is an external domain, a particular API we call.

Scryfall: this is an industry standard domain, standardized by Wizards at scryfall.com. It provides a database of all cards every published, including images of them. https://scryfall.com/docs/api

MTG Deck Shuffler (also: Shuffler): this is our original bounded context, one component of the larger system (see `DESIGN-the-table-vision.md`). There are two subdomains:

MTG Deck Shuffler UI: this is the user interface. The vocabulary here is presented to the user.

MTG Deck Shuffler Game State: this is where we track the game state. The vocabulary here is for developers, optimized for making invalid state unrepresentable.

Spine: the central bounded context of the larger system (Ruby service, planned). Its language — Tables, Seats, events of every kind — is the published language the other contexts translate themselves into. See "Spine terms" below.

Tabletop: the tldraw-based shared canvas (planned). Its language is the _physics_ of Magic — card identity, zone geography, gestures, notes — never card meaning. It emits Physical Events to the Spine.

Interpreter: the translation layer from Tabletop physics to Spine meaning — an anti-corruption layer that happens to be an AI. Lives inside the Spine app for now; its boundary (physical events in, game events out) is sacred regardless.

## Definitions

Player (MTG Deck Shuffler): this is what we call the user of the app. They're here to play a game of MTG; this app will track part of the game state for them.

Sleeve: the colored cover a player puts their whole deck in before the game. On the Tabletop
it renders as a rectangle of solid color slightly larger than the card: a face-down card or
the library pile shows only the sleeve; a face-up card shows its image centered inside the
sleeve rectangle. The sleeve color is that player's visual identity on the table. Sleeves are optional; an unsleeved deck shows the standard Magic card back.

Card - this is ambiguous. Are we talking about a card conceptually, or a particular card in a deck? A card by name, or a particular edition of it? This word by itself does not have a specific meaning.

Oracle Card: this word is defined by Archidekt, referring to a definition in the Scryfall domain. It references a card by name.

Card Name: this is ambiguous in the Archidekt and Scryfall domains. Usually the Card Display Name and the Card Oracle Name are the same, but not always. The Card Oracle Name is the unique identifier for a card. The Card Display Name is at the very top of the card, and this is what we use in MTG Deck Shuffler.

Card vs Face: cards have names, and faces have names. A two-faced card's canonical (Display) Name contains both face names, joined by `//` — e.g. "Eiganjo Dynastorian // Replenish". Deck Shuffler zones contain cards, not faces: the library, the hand, and the table hold cards. So anything that identifies or orders cards — sorting a list, matching a name — uses the canonical card name.

Face-down: concealment — showing the shared card back (or sleeve) instead of either printed
face. This is possible only on the Tabletop. This independent of Face. A two-faced card **can** be played face down — and once it is, the card back
appears regardless. Transform swaps which printed side is up (on two-faced cards), while Turn Face Down/Up toggles concealment. These are the Tabletop's only two card gestures.

Transform (Tabletop): swap which printed face of a two-faced card is up, front to back or back to front. A physical event (`card.transformed`). Offered only on two-faced cards; a one-faced card cannot Transform, it can only Turn Face Down. Independent of Face-down.

Flip (Shuffler only): private inspection of the other printed face of a two-faced card. It never leaves the Shuffler and is not an event. The Tabletop never says "flip"; its equivalent is Transform, a physical event the table can see.

Scryfall ID: Scryfall's card ID. This is a UUID. From this, we can derive a card image URL on Scryfall. Archidekt calls it `uid`.

Multiverse ID: Gatherer's card ID. This is an integer. From this, we can derive a link to the card's page on Gatherer.

Display Name (Scryfall): at the top of a card. This is the name that we use in MTG Deck Shuffler.

Oracle Name (Archidekt referring to Scryfall): the unique identifier for a card. Usually this is the Display Name at the top of a card, but sometimes it is instead a subtitle under that name. For instance, "Miku, the Renowned" is the Display Name, and "Feather, the Redeemed" is the Card Oracle Name. For game-rule purposes, the card is "Feather, the Redeemed." The Display Name in this case is a vanity name, to go with the sweet Secret Lair art.

Archidect Deck ID: a unique identifier for a deck in the Archidekt system. The deck is mutable in Archidekt!

Deck (Archidekt): a collection of cards meant to be played in a game. Archidekt exists to help people build decks, so the Deck in Archidekt is mutable, and it contains cards in categories like "Maybeboard" and "Sideboard" that aren't used in play (Excluded Cards).

Deck (MTG Deck Shuffler): an unordered collection of cards, along with some provenance info. These are immutable in the MTG Deck Shuffler domain. A deck is necessary to initiate a game.

Deck Source: where a deck came from. This is either "archidekt" or "precon", or "test" in tests.

Precon Deck (MTG Deck Shuffler): A preconstructed deck stored locally in the decks/ directory. From the domain perspective, it's a "precon" (what it is). At the adapter level, it's stored as a "local file" (how it's stored).

Local File Adapter: Infrastructure component that retrieves decks from local JSON files. Uses "local file" terminology to describe the storage mechanism.

Deck Provenance: information about where a deck came from. This includes the Deck Source, a URL, and the retrieved date. Decks are mutable at their source, see, but immutable in MTG Deck Shuffler.

Library (MTG Deck Shuffler UI): an ordered collection of cards, a subset of those in the Deck. During a game, cards can be removed from the library, added back, reordered.

Game Prep (MTG Deck Shuffler): the preparation phase before a game starts. This is where deck review happens. A GamePrep stores the deck and configuration settings, including the chosen playmat and sleeve color. GamePrep has its own URL space (/prepare/:prepId) and persistence layer separate from Game. Immutable once created.

Playmat: the surface a player's stuff sits on. In real Magic it's the mat on the table; in the Shuffler it's the big art-backed panel that holds the library stack, command zone and hand; in Tabletop it's the background of the player's battlefield.

Prep ID: a unique identifier for a GamePrep. Used in URLs and to link Games back to their originating prep.

Game (MTG Deck Shuffler): an active gameplay session. During a game, the position of each card is tracked. Games are created from a GamePrep and are always in Active status. A game references its prepId and prepVersion for restart functionality. In the larger system, a Shuffler Game connects to a **Seat** at a **Table** (Spine context) — "game" keeps its meaning inside this context; the translation happens at the boundary.

Game Status (MTG Deck Shuffler): the state of a game. Can be Active (gameplay in progress) or Ended (game finished). The NotStarted status was removed - prep phase is now handled by GamePrep.

Card Definition (MTG Deck Shuffler): a definition of a card, including name (from Display Name), Scryfall ID, and Multiverse ID. Immutable.

Game Card (MTG Deck Shuffler, game scope): a card involved in a game. It has a Card Definition and a Location.

Location (MTG Deck Shuffler, game scope): where a card is. A card is in exactly one location at a time. Many locations include a position, which is unique among cards in that location, for ordering. Locations include: Library(position), Table, Hand(position), Revealed(position).

Game State (MTG Deck Shuffler, game scope): all the state that is local to a game. This includes a list of Game Cards.

GameStateVersion (Shuffler): a pointer into the Game State for the current game, showing where we are.

Spine Seq (Shuffler): the Spine's `seq` pointer into its event log. An event can be represented in both the Spine's event log for a Table, and the Shuffler's game state log.

Hand (MTG Deck Shuffler, UI): a set of cards that are visible to a player. They represent cards a player has access to; the player can reorder them, or move a card to the table.

Draw: move a card from the Library to the Hand

Opening Hand: the seven cards dealt automatically when a game starts (fewer only for tiny test decks).

Mulligan Stage / Hand Acceptance Stage (MTG Deck Shuffler, game scope): the stage right after the opening hand is dealt, before play begins, while the player decides whether to keep their hand.

Mulligan: during the Mulligan Stage, return the whole hand to the Library, shuffle, and redraw an Opening Hand. A mulligan is recorded as a single atomic event carrying all its moves, so it can be undone in one step (restoring the previous hand and library exactly).

Reveal (MTG Deck Shuffler UI): flip a card from the top of the Library so that the player can look at it. _Naming caution: in MTG rules language this is actually "look at" — private to the player. MTG's "reveal" means showing a card to everyone (or a chosen subset). The Shuffler's Reveal button is a look-at. This subtlety is not yet handled in the larger system; see "Look At vs Reveal (Spine)" below._

Revealed cards (MTG Deck Shuffler, UI): a few cards that a player is looking at. Each one may be returned to the top of the library, put on the bottom of the library, moved into the hand, or put on the table.

Table (MTG Deck Shuffler, game scope): where cards go when they are played. The table is where the game happens, but we don't track it in MTG Deck Shuffler.

Included Card (Archidekt): a card that is played in a deck. We keep these.

Excluded Card (Archidekt): a card that is associated with a deck, but not currently played. We don't need to track these.

Commander: a card (or two) in a deck that has the "Commander" category. There may be zero, one, or two commanders in a deck, and in this app, they're always in the Command Zone.

Command Zone: a Location (MTG Deck Shuffler, game scope) — commanders are ordinary game
cards at `CommandZone(position)`, with card instance IDs like everything else. (An older
version of this entry claimed commanders were stored separately from game cards; that was
stale — see `GameState.ts` `CommandZoneLocation`.) Commanders always arrive at a table
face up; a two-faced commander can be transformed in the command zone afterward, which is
table-local play, not seating data. (Confirmed 2026-08-08, cards-come-and-go ticket 02.)

Seat (spine): a player's place at a Table. A Shuffler Game connects to a Seat; a table has 1–4 of them. A seat is keyed by an opaque Join Request ID, so a retried join returns the same seat.

Join Request ID (spine): the opaque idempotency key on `POST /join` — "this particular join attempt". The Spine attaches no other meaning to it; the Shuffler sends its game id.

Seat ID (Spine-minted): the identity of an **occupancy** — a Shuffler game's connection to a
table position at a table — minted by the Spine
when a seat is taken.

Table Position (Spine): the 1-4 slot a seat occupies
at a table

Session ID (Tabletop): identifies one browser
tab/connection's participation

Anonymous Session (Tabletop): a session with no seatId — a
spectator, or anyone who opened a Tabletop URL without a `?seat=` param.

Solo Mode (Shuffler): the default — no table name. Play/Discard copy the card image to the clipboard for Mural-style play.

Table Mode / At a Table (Shuffler): a game whose Prep supplied a table name + player name.

Discard: In the shuffler, it is identical to Play except the verb. On the Tabletop, the card lands in the graveyard.

Undo event (contract): the undo of a logged event is named by prefixing `undo.` to the
full name of the event being undone — `undo.card.played`, `undo.card.discarded` — so
adding undo never removes information.

Card Returned (contract): `card.returned` — a card left the table for its player's
Reveal zone.

Spectator (Tabletop): someone at a Table without a Seat. They should be able to draw but not move cards. Not implemented

Event Log (spine): the append-only record of everything that happened at a Table. One per table.

Look At vs Reveal (Spine, not yet designed): _look at_ is private — a player sees hidden information (top of library, an opponent's hand via an effect); its public shadow says only that the looking happened. _Reveal_ is deliberate publication of a card's identity, with an audience scope (everyone, or chosen players). The Shuffler's Reveal button is a look-at. Later, we will implement a proper Reveal.

Table Event (Spine): joining a table, taking a seat, someday matching. Not a game event. Administrative.

Physical Event (Spine, emitted by Tabletop): what happened spatially, uninterpreted. "Card rotated to tapped." "A note was placed on Lyra Dawnbringer; the text says 'flying until end of turn'."

Game Event (Spine): an event that impacts the flow of the game. Draw a card, play a card.

Interpretation (not implemented): an event that covers one or more physical events with meaning. Carries provenance (pointers to the events it was inferred from), causality ("because [ref: Acrobatic Leap cast]"), confidence, and commentary ("Lyra already had flying").

Table State (fleet): the full state of a table at a point in time — every shape's identity, type, position, and type-specific attributes (tapped, face, zone, etc). Two independent things can each produce one: reading the live Tabletop canvas, or replaying a Table's Event Log from the start (a Projection). Comparing two independently-produced Table States is how a discrepancy between the table and its own history gets caught, instead of staying a mystery.

Projection (Tabletop): computing a Table State by replaying a Table's Event Log, in `seq` order. This logic lives in the Tabletop, not the Spine — the Tabletop already has to do this on reconnect, and will do it again (planned) to draw a table from scratch when a client loads an existing game. The Spine stays purely the log: it validates, stores, and replays events, but never computes a Table State of its own. See `docs/adr/0001-tabletop-persists-physical-events-and-owns-projection.md`.

Card Arrived (contract, planned): `card.arrived` — the Tabletop's own event recording where a card actually landed on the canvas when it was placed there. Distinct from `card.played`, which is the Shuffler's domain-level decision to play the card and carries no canvas position — the Shuffler doesn't know where cards land; the Tabletop decides that separately.

Shape events (contract, planned): `shape.created`, `shape.moved`, `shape.removed` — physical events for canvas objects that don't have a more specific event of their own; the fallback carries the raw tldraw shape JSON for shape types without dedicated tooling. Where a shape type has a more meaningful name for the same fact, that name is used instead of the generic one — `card.moved`, `card.tapped`/`card.untapped`, `card.transformed`, `card.turnedFaceDown`, `card.arrived`, and (planned) `counter.moved`/`counter.created` — never both the specific and the generic event for the same fact.

Designated Zone vs Undesignated Space (Tabletop, not yet decided): whether a card's move is a Physical Event or a Game Event depends on whether it crosses into or out of a zone the game cares about — library, hand, graveyard, and exile are designated zones (crossing them is game-significant, which is why menu-driven actions like Transform and Turn Face Down exist for them); a player's general battlefield space may be undesignated. The exact boundary isn't pinned down yet; `card.moved`'s `significance` field (see envelope contract) can be computed per-instance from it once it is — this doesn't block reconstructing Table State, which only needs positions, not significance.
