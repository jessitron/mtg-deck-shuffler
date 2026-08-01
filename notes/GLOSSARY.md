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

Tabletop: the tldraw-based shared canvas (planned). Its language is the *physics* of Magic — card identity, zone geography, gestures, notes — never card meaning. It emits Physical Events to the Spine.

Interpreter: the translation layer from Tabletop physics to Spine meaning — an anti-corruption layer that happens to be an AI. Lives inside the Spine app for now; its boundary (physical events in, game events out) is sacred regardless.

## Definitions

Player (MTG Deck Shuffler): this is what we call the user of the app. They're here to play a game of MTG; this app will track part of the game state for them.

Card - this is ambiguous. Are we talking about a card conceptually, or a particular card in a deck? A card by name, or a particular edition of it? This word by itself does not have a specific meaning.

Oracle Card: this word is defined by Archidekt, referring to a definition in the Scryfall domain. It references a card by name.

Card Name: this is ambiguous in the Archidekt and Scryfall domains. Usually the Card Display Name and the Card Oracle Name are the same, but not always. The Card Oracle Name is the unique identifier for a card. The Card Display Name is at the very top of the card, and this is what we use in MTG Deck Shuffler.

Card vs Face: cards have names, and faces have names. A two-faced card's canonical (Display) Name contains both face names, joined by ` // ` — e.g. "Eiganjo Dynastorian // Replenish". **Zones contain cards, not faces**: the library, the hand, and the table hold cards. So anything that identifies or orders cards — sorting a list, matching a name — uses the canonical card name, not whichever face happens to be showing. The face only decides which image and which text is displayed right now (`GameCard.currentFace`).

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

Game Prep (MTG Deck Shuffler): the preparation phase before a game starts. This is where deck review happens. A GamePrep stores the deck and configuration settings (future: playmat, card backs, etc.). GamePrep has its own URL space (/prepare/:prepId) and persistence layer separate from Game. Immutable once created.

Prep ID: a unique identifier for a GamePrep. Used in URLs and to link Games back to their originating prep.

Game (MTG Deck Shuffler): an active gameplay session. During a game, the position of each card is tracked. Games are created from a GamePrep and are always in Active status. A game references its prepId and prepVersion for restart functionality. In the larger system, a Shuffler Game connects to a **Seat** at a **Table** (Spine context) — "game" keeps its meaning inside this context; the translation happens at the boundary.

Game Status (MTG Deck Shuffler): the state of a game. Can be Active (gameplay in progress) or Ended (game finished). The NotStarted status was removed - prep phase is now handled by GamePrep.

Card Definition (MTG Deck Shuffler): a definition of a card, including name (from Display Name), Scryfall ID, and Multiverse ID. Immutable.

Game Card (MTG Deck Shuffler, game scope): a card involved in a game. It has a Card Definition and a Location.

Location (MTG Deck Shuffler, game scope): where a card is. A card is in exactly one location at a time. Many locations include a position, which is unique among cards in that location, for ordering. Locations include: Library(position), Table, Hand(position), Revealed(position).

Game State (MTG Deck Shuffler, game scope): all the state that is local to a game. This includes a list of Game Cards.

Hand (MTG Deck Shuffler, UI): a set of cards that are visible to a player. They represent cards a player has access to; the player can reorder them, or move a card to the table.

Draw: move a card from the Library to the Hand

Opening Hand: the seven cards dealt automatically when a game starts (fewer only for tiny test decks).

Mulligan Stage / Hand Acceptance Stage (MTG Deck Shuffler, game scope): the stage right after the opening hand is dealt, before play begins, while the player decides whether to keep their hand. It is **derived from the event log** (not stored): a "deal opening hand"/"mulligan" marker event is recorded after the deal, and the stage is active while that marker is the most-recent "live" event (hand rearrangement is transparent). It ends as soon as the player takes any action other than rearranging their hand (draw, play, reveal, ...) — and undoing that action brings the stage back automatically.

Mulligan: during the Mulligan Stage, return the whole hand to the Library, shuffle, and redraw an Opening Hand. Each mulligan increments the mulligan count; the button is labeled "Mulligan", then "Mulligan #2", "#3", and so on. A mulligan is recorded as a single atomic event carrying all its moves, so it can be undone in one step (restoring the previous hand and library exactly).

Reveal (MTG Deck Shuffler UI): flip a card from the top of the Library so that the player can look at it. _Naming caution: in MTG rules language this is actually "look at" — private to the player. MTG's "reveal" means showing a card to everyone (or a chosen subset). The Shuffler's Reveal button is a look-at. This subtlety is not yet handled in the larger system; see "Look At vs Reveal (Spine)" below._

Revealed cards (MTG Deck Shuffler, UI): a few cards that a player is looking at. Each one may be returned to the top of the library, put on the bottom of the library, moved into the hand, or put on the table.

Table (MTG Deck Shuffler, game scope): where cards go when they are played. The table is where the game happens, but we don't track it in MTG Deck Shuffler. That is mysterious to us. It is possible for a player to return a card from the Table to the library or hand. _(The Table Vision is the plan for the table to stop being mysterious: this Location converges with the Spine's Table — see below.)_

Included Card (Archidekt): a card that is played in a deck. We keep these.

Excluded Card (Archidekt): a card that is associated with a deck, but not currently played. We don't need to track these.

Commander: a card (or two) in a deck that has the "Commander" category. There may be zero, one, or two commanders in a deck, and in this app, they're always in the Command Zone.

Command Zone: This is a location on the screen. It is not a Location (MTG Deck Shuffler, game scope), because commanders are stored separately from game cards; they are not moved.

## Spine terms (planned — see DESIGN-the-table-vision.md)

Table (Spine): the shared thing itself — 1–4 hands plus a tabletop plus an event log plus whoever's watching. You join a table (by typing its name on the Prep screen, for now). A table has exactly one event log.

Seat: a player's place at a Table. A Shuffler Game connects to a Seat; a table has 1–4 of them. A seat shows its public shadow (card counts); only the player sees the cards.

Seat ID (Shuffler → contract): a short GUID minted by the Shuffler at prep/join time — the seat's identity, because player names are not unique. Travels as `initiator.seatId` in `card.played`; recorded on the Prep and the Game (becomes a Spine-owned sequence later).

Solo Mode (Shuffler): the default — no table name. Play/Discard copy the card image to the clipboard for Mural-style play. Unchanged by table mode.

Table Mode / At a Table (Shuffler): a game whose Prep supplied a table name + player name. Play and Discard send the card to the Tabletop instead of the clipboard, **send-then-commit**: the tabletop gets the card first; a failed send blocks the action and the card stays in hand. The game page's "at table _name_" link is the spectator-share URL.

Discard (Shuffler): identical to Play except the verb — the card lands in the Table location (the graveyard is table geography, not Shuffler state); at a table it is sent with zone hint "graveyard".

Spectator: someone at a Table without a Seat. Sees the public projection of the event log: what's happening, the commentary, hand counts but never hands. In some modes, may comment in chat.

Event Log: the append-only record of everything that happened at a Table. One per table. Never rewritten — see Supersession.

Visibility: an attribute of every event. Public events are seen by everyone at the table; private events belong to a player.

Public Shadow: the public event cast by a private one. "Jess drew a card" (hand count 6→7) is the public shadow of "Jess drew Lyra Dawnbringer." **The shadow is created at the source**: the Shuffler sends only the shadow; the Spine never receives hidden-zone card identities. The Spine's log knows exactly what a person standing at the table would know. (Visibility in the Spine is for audience scoping — reveals to some players, private tutor-chats — not zone secrecy.)

Look At vs Reveal (Spine, not yet designed): *look at* is private — a player sees hidden information (top of library, an opponent's hand via an effect); its public shadow says only that the looking happened. *Reveal* is deliberate publication of a card's identity, with an audience scope (everyone, or chosen players). The Shuffler's Reveal button is a look-at.

Table Event (Spine): joining a table, taking a seat, someday matching. Not a game event.

Chat Event (Spine): a message in the narration/chat panel, including player answers to the interpreter's questions.

Physical Event (Spine, emitted by Tabletop): what happened spatially, uninterpreted. "Card rotated to tapped." "A note was placed on Lyra Dawnbringer; the text says 'flying until end of turn'."

Game Event (Spine): meaning. "This spell was cast, targeting card A." Mostly born as interpretations of physical events; some born directly (the Shuffler's "drew a card" needs no interpreting). The fallback game event is "Player A moved this card and we don't know why."

Interpretation (Spine): an event that covers one or more physical events with meaning. Carries provenance (pointers to the events it was inferred from), causality ("because [ref: Acrobatic Leap cast]"), confidence, and commentary ("Lyra already had flying").

Correction (Spine): a chat event in which a player says an interpretation is wrong (or answers the interpreter's question). Triggers a superseding interpretation. An interpretation followed by its correction is a labeled training example — the log is the eval dataset.

Supersession: how interpretations change without rewriting the log. A new interpretation supersedes an old one; physical events are evidence and are never replaced. The Current Reading of a game is a projection: each physical event's latest surviving interpretation.
