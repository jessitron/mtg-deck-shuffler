# Domain Definitions

We are in the domain of MTG, Magic: the Gathering. This is a card game published by Wizards of the Coast.

Our app is called MTG Deck Shuffler.

## Bounded Contexts

Archidekt: this is an external domain, a particular API we call.

Scryfall: this is an industry standard domain, standardized by Wizards at scryfall.com. It provides a database of all cards every published, including images of them. https://scryfall.com/docs/api

MTG Deck Shuffler: this is our bounded context. For now we only have one.

## Definitions

Player (MTG Deck Shuffler): this is what we call the user of the app. They're here to play a game of MTG; this app will track part of the game state for them.

Card - this is ambiguous. Are we talking about a card conceptually, or a particular card in a deck? A card by name, or a particular edition of it? This word by itself does not have a specific meaning.

Oracle Card: this word is defined by Archidekt, referring to a definition in the Scryfall domain. It references a card by name.

Card Name: this is slightly ambiguous. Usually the Card Display Name and the Card Oracle Name are the same, but not always. The Card Oracle Name is the unique identifier for a card. The Card Display Name is at the very top of the card, andwhat we show to the user.

Display Name (Scryfall): at the top of a card. What we call it.

Oracle Name (Archidekt referring to Scryfall): the unique identifier for a card. Usually this is the Display Name at the top of a card, but sometimes it is instead a subtitle under that name. For instance, "Miku, the Renowned" is the Display Name, and "Feather, the Redeemed" is the Card Oracle Name. For game-rule purposes, the card is "Feather, the Redeemed." The Display Name in this case is a vanity name, to go with the sweet Secret Lair art.

Archidect Deck ID: a unique identifier for a deck in the Archidekt system. The deck is mutable in Archidekt!

Deck (Archidekt): a collection of cards meant to be played in a game.

Deck (MTG Deck Shuffler): an unordered collection of cards that can be shuffled into a Library. These are immutable in the MTG Deck Shuffler domain.

Library (MTG Deck Shuffler): an ordered collection of cards, a subset of those in the Deck. During a game, cards can be removed from the library, added back, reordered.

Game (MTG Deck Shuffler): a temporal scope. At the beginning of a game, the cards in a Deck initialize a Library. The Library can be manipulated in various ways during the game. At the end of the game, the Library doesn't exist anymore.

Card in Deck (MTG Deck Shuffler): a definition of a card that is present in a Deck. Immutable, doesn't go anywhere.

Card in Library (MTG Deck Shuffler, game scope): an instance of a Card in Deck that is present in a Library. Immutable, can move around or be removed from the Library.

Game State (MTG Deck Shuffler, game scope): all the state that is local to a game. This includes the Library, cards in hand, revealed cards, and cards on the table. v mutable

Hand (MTG Deck Shuffler, game scope): a set of cards that are visible to a player. One per game, mutable.

Draw: move a card from the Library to the Hand

Reveal: flip a card from the top of the Library so that the player can look at it.

Revealed cards: a few cards that a player is looking at. Each one may be returned to the top of the library, put on the bottom of the library, moved into the hand, or put on the table.

Table: when cards go here, they are not visible in MTG Deck Shuffler.

Cards on Table (MTG Deck Shuffler, game scope): a set of cards that are not in the Library or in Hand. They're on the table somewhere. This app does not track cards that are on the table. The only reason we even track them is so that (on rare occasions) we can put them back in the Library.

Included Card (MTG Deck Shuffler, deck scope): a card that is played in a deck.

Excluded Card (MTG Deck Shuffler, deck scope): a card that is associated with a deck, but not currently played. It does not go into the Library at the start of the game.

Commander: a card in a deck that has the "Commander" category. There may be zero, one, or two commanders in a deck, and in this app, they're always in the Command Zone.
