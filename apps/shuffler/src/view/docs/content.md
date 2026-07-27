# MTG Deck Shuffler Documentation

## Playing MTG Remotely {#playing-remotely}

This section explains the complete setup for remote MTG play using this tool.

### When to use this app {#when-to-use}

If you already know how to play Magic the Gathering, and you and your friends want to play on the computer but you don't want the computer running the game for you, MTG Deck Shuffler is part of the solution.

Use an online whiteboard as a table, use any voice chat to talk to each other, and use MTG Deck Shuffler to manage your library.

This way of playing leaves all the rules enforcement to you. Use house rules, let each other change your minds or trigger effects late. Forget to trigger effects, this is normal. This way of playing is closer to the tabletop experience than to MTG Online or Arena.

// right here we need a video of how it works.

Alternative: shuffle your own physical cards, look up the card image on Scryfall each time you play one, and then you don't need MTG Deck Shuffler.

### What You Need {#what-you-need}

- This deck shuffler (MTG Deck Shuffler)
- A shared visual board (Mural or Miro)
- Experience playing the game
- Voice/video chat (like Discord)
- Your friends!

### What you don't need {#what-you-dont-need}

- Physical cards
- A webcam
- To follow the official rules

### Setting Up the Table {#setting-up}

**Visual Board**: Create a board in Mural or Miro
- Each player gets their own area
- Shared space for the battlefield/table
- How to use: drag card images from MTG Deck Shuffler to Mural/Miro

**Discord**: Voice channel for gameplay
- Announcing plays
- Discussing strategy
- Social interaction that makes MTG fun

### During Gameplay {#during-gameplay}

**Use MTG Deck Shuffler to:**
- Shuffle and draw cards
- Look at top cards of library
- Manage your hand
- Track which cards you've played

**Use Mural/Miro to:**
- Show the battlefield state
- Display permanents in play
- Track life totals (with sticky notes/shapes)

**Use Discord to:**
- Announce your plays
- Respond to opponent actions
- Use the stack correctly
- Have fun!

## Using the App {#using-the-app}

This section documents the three-screen workflow of the application.

### Overview: Three Screens {#overview}

Brief description of the linear progression:
- **Deck Selection** (entry point)
- **Deck Review** (prepare before playing)
- **Play Game** (active gameplay)

### Deck Selection {#deck-selection}

**What it does**: Choose which deck to play

**Options**:
- Enter an Archidekt deck ID/URL
- Choose a preconstructed Commander deck
- (Future: Moxfield support)

**Actions**:
- "Let's Play" button loads the deck and proceeds to Deck Review

**Notes**:
- Decks are fetched from Archidekt API
- Card images come from Scryfall
- Deck is immutable once loaded (snapshot from source)

### Deck Review {#deck-review}

**What it does**: Review your deck before starting the game

**What you see**:
- Commander card(s) in the command zone
- Library (unshuffled, face-down)
- Deck provenance information (source, URL, date)

**Actions**:
- "Shuffle Up" - shuffles library and starts the game
- "Choose Another Deck" - returns to Deck Selection
- "Search" - reveals the full card list in the library

**Game State**:
- Game exists but is "Not Started"
- Library is not shuffled
- Game ID is in the URL

### Play Game {#play-game}

**What it does**: Active game screen for playing

**What you see**:
- **Command Zone**: Commander card(s) (always visible)
- **Library**: Your shuffled deck (face-down)
- **Hand**: Cards you've drawn (ordered, draggable)
- **Revealed Cards**: Cards you're looking at from library actions

**Actions on Library**:
- "Draw" - move top card to hand
- "Reveal" - look at top N cards
- "Search" - look at entire library
- "Shuffle" - randomize library order

**Actions on Hand**:
- Drag to reorder cards
- "Play" button - move card to table (removes from tracking)

**Actions on Revealed Cards**:
- "To Hand" - move to hand
- "To Top" - return to top of library
- "To Bottom" - move to bottom of library
- "Play" - move to table

**Actions on Table Cards**:
- "Return to Hand" - retrieve a played card
- "Return to Library" - put a played card back in library

**Game Management**:
- "Restart Game" - reset game state, reshuffle
- "Quit" - return to Deck Selection

**Game State**:
- Game is active
- Library is shuffled
- Game ID persists in URL (bookmark to resume)

**Persistence**:
- Game state is automatically saved
- Can return to game via URL
- Survives server restarts (SQLite storage)

## Keyboard Shortcuts {#keyboard-shortcuts}

(To be documented based on existing functionality)

## Tips & Tricks {#tips-tricks}

- Copy card image URLs (right-click) for pasting into Mural/Miro
- Bookmark game URL to return later
- Use "Search Library" to find specific cards
- Reorder hand before playing to group lands/spells
- Use revealed cards area for tutoring/scry-like effects

## Troubleshooting {#troubleshooting}

Common issues and solutions:
- Deck won't load from Archidekt
- Card images not showing
- Game state lost
- Browser compatibility

## Support {#support}

This is a free toy project, built for fun and shared with the community. There's no official support, but if you run into issues or have ideas for improvements:

- **Report bugs or request features**: [Open an issue on GitHub](https://github.com/jessitron/mtg-deck-shuffler/issues)
- **Check existing issues**: Someone might have already reported the same problem or suggested the same feature
- **Contribute**: Pull requests are welcome if you want to help improve the tool!

No promises on response times or fixes—this is a hobby project maintained in spare time. But feedback is always appreciated!
