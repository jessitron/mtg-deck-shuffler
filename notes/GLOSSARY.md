# Domain Definitions

We are in the domain of MTG, Magic: the Gathering. This is a card game published by Wizards of the Coast.

Our app is called MTG Deck Shuffler.

## Bounded Contexts

Archidekt: this is an external domain, a particular API we call.

Scryfall: this is an industry standard domain, standardized by Wizards at scryfall.com. It provides a database of all cards every published, including images of them. https://scryfall.com/docs/api

MTG Deck Shuffler: this is our bounded context. There are two subdomains:

MTG Deck Shuffler UI: this is the user interface. The vocabulary here is presented to the user.

MTG Deck Shuffler Game State: this is where we track the game state. The vocabulary here is for developers, optimized for making invalid state unrepresentable.

## Definitions

Player (MTG Deck Shuffler): this is what we call the user of the app. They're here to play a game of MTG; this app will track part of the game state for them.

Card - this is ambiguous. Are we talking about a card conceptually, or a particular card in a deck? A card by name, or a particular edition of it? This word by itself does not have a specific meaning.

Oracle Card: this word is defined by Archidekt, referring to a definition in the Scryfall domain. It references a card by name.

Card Name: this is ambiguous in the Archidekt and Scryfall domains. Usually the Card Display Name and the Card Oracle Name are the same, but not always. The Card Oracle Name is the unique identifier for a card. The Card Display Name is at the very top of the card, and this is what we use in MTG Deck Shuffler.

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

Game (MTG Deck Shuffler): a temporal scope. During a game, the position of each card is tracked.

Card Definition (MTG Deck Shuffler): a definition of a card, including name (from Display Name), Scryfall ID, and Multiverse ID. Immutable.

Game Card (MTG Deck Shuffler, game scope): a card involved in a game. It has a Card Definition and a Location.

Location (MTG Deck Shuffler, game scope): where a card is. A card is in exactly one location at a time. Many locations include a position, which is unique among cards in that location, for ordering. Locations include: Library(position), Table, Hand(position), Revealed(position).

Game State (MTG Deck Shuffler, game scope): all the state that is local to a game. This includes a list of Game Cards.

Hand (MTG Deck Shuffler, UI): a set of cards that are visible to a player. They represent cards a player has access to; the player can reorder them, or move a card to the table.

Draw: move a card from the Library to the Hand

Reveal: flip a card from the top of the Library so that the player can look at it.

Revealed cards (MTG Deck Shuffler, UI): a few cards that a player is looking at. Each one may be returned to the top of the library, put on the bottom of the library, moved into the hand, or put on the table.

Table: where cards go when they are played. The table is where the game happens, but we don't track it in MTG Deck Shuffler. That is mysterious to us. It is possible for a player to return a card from the Table to the library or hand.

Included Card (Archidekt): a card that is played in a deck. We keep these.

Excluded Card (Archidekt): a card that is associated with a deck, but not currently played. We don't need to track these.

Commander: a card (or two) in a deck that has the "Commander" category. There may be zero, one, or two commanders in a deck, and in this app, they're always in the Command Zone.

Command Zone: This is a location on the screen. It is not a Location (MTG Deck Shuffler, game scope), because commanders are stored separately from game cards; they are not moved.
