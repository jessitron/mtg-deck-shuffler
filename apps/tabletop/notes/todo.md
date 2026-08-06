# jess writes notes here. The agent can either do them immediately or put them in Linear.

2 August 2025:

- on the game screen, let's move the title of the deck out of the command zone; put it above the table button(s), top-aligned with the hamburger menu.
- the Precon/Archidekt buttons on Choose a Deck don't work as toggles now that they've been made "primary button" - they need to be restored to what they were (or something else) ... working on that in one session now
- the Tabletop drawing needs to change: I forgot the command zone. Move exile down to replace the bottom third of the Graveyard, instead.
- have the player name include the deck name, above the playmat on the Tabletop
- When the Tabletop loads, have the commander appear in the command zone. Also place a transparent version of the commander in its spot, one that doesn't move when they play the commander.
- On the Tabletop, double-clicking a card brings up something useless, a weird cropping thing. Turn that off.
- Can we animate tapping the card?

## historical

All the outstanding items below turned into Linear tickets (team `jessitron`) on 2026-08-01.
Notes/opinions from Claude are inline under each. Original wording preserved as the quote.

**2026-08-01, reprioritized:** Jess redirected — the real question right now is whether
tldraw's architecture can even do what the game needs: drag-into-zone events and rotation
are essential mechanics, cosmetics are not, and persistence can wait (multiple viable
approaches later, no need to decide now). I went and read the installed `tldraw@5.2.5`
type declarations directly to answer the architecture question. **Verdict: yes, tldraw
supports it** — see JES-149 and JES-144 below, and the fuller writeup in
`notes/AGENT-NOTES.md` → "Tabletop gotchas". Priorities below reflect this: JES-149 and
JES-144 are High; everything cosmetic (JES-145/146/147/148/150) and persistence (JES-151)
are Low, deliberately, until the architecture spike lands.

- **[HIGH] Card zone-entry events — dragged into graveyard/exile/library, moved from here to here** → [JES-149](https://linear.app/honeycombio/issue/JES-149)

  > is it possible to make something happen when we drag a card into exile or the library?

  This is the architecture question, not a cosmetic nice-to-have. **Answer: tldraw supports
  it.** `ShapeUtil.onDragShapesOver`/`onDropShapesOver` fire on a target shape when another
  shape is dragged over/dropped on it (the same mechanism tldraw's own frame shape uses to
  reparent things dropped into it) — that's "card entered the graveyard." `onTranslate`/
  `onTranslateEnd` on the moving shape give "card moved from here to here." None of this
  fires today because cards and the zone shapes are stock `image`/`geo` shapes with no
  custom `ShapeUtil` registered at all. The work is: give cards and the zone regions custom
  `ShapeUtil`s, registered via `<Tldraw shapeUtils={[...]}>` in `TablePage.tsx`. That's the
  spike — do it before sinking more time into the cosmetic tickets below.

- **[HIGH] Rotate cards (and, riding along: popup menu cleanup, flip)** → [JES-144](https://linear.app/honeycombio/issue/JES-144)

  > We must be able to rotate cards. Ideally, clicking on a card turns it 90 degrees.
  > the card's popup menu should not have crop or download. I like alt, I'm OK with replace media that's entertaining. It should have rotate!
  > we need a way to flip cards. Is that something we could add to the card's submenu?

  Rotation is essential; menu cleanup and flip are secondary and just ride along on the same
  work. **Answer: tldraw supports rotation directly** —
  `onRotateStart`/`onRotate`/`onRotateEnd` on `ShapeUtil`, same investigation as JES-149.
  It needs the same custom card `ShapeUtil` that JES-149's move-tracking needs, so these two
  tickets share one client-side investment. Once that shape exists, curating the context
  menu (drop crop/download, add rotate) and flip (which should emit a `card.flipped`-shaped
  event like `card.played` does, per the two-faced-cards owner) are cheap additions — build
  them because the shape exists, not as the reason to build it.

- **[LOW, cosmetic] Library links back to the Shuffler** → [JES-145](https://linear.app/honeycombio/issue/JES-145)

  > Can we make the library link back to Deck Shuffler?

  Small when we get to it — the library shape already has a `url` prop, just hardcoded empty.

- **[LOW, cosmetic] Playmat: rounded corners, thick black border, no dotted line** → [JES-146](https://linear.app/honeycombio/issue/JES-146)

  > cosmetic: the playmat needs rounded corners. Ideally also a thick black border.
  > cosmetic: I can see gray dotty lines around the playmat, and I shouldn't.

  Border/dotted-line are one-line prop tweaks. Rounded corners are NOT — tldraw's `geo`
  rectangle has no corner-radius option, needs a custom shape or an image trick. Explicitly
  deprioritized per Jess ("rounded corners are not [essential]").

- **[LOW, cosmetic] Cards land centered on the Stack** → [JES-147](https://linear.app/honeycombio/issue/JES-147)

  > the card should land in the stack centered above the player's playmat

  Simple geometry fix, whenever it's time.

- **[LOW, cosmetic] Exile: distance from library, height, border, label** → [JES-148](https://linear.app/honeycombio/issue/JES-148)

  > Exile needs to be a little distance from the library. It also needs to be taller than a card. So the library probably needs a border around it and a label.

  Geometry/prop tweaks, no new shape types.

- **[LOW, cosmetic] Lands need spacing from each other and the playmat edge** → [JES-150](https://linear.app/honeycombio/issue/JES-150)

  > lands should leave a space between each other and the side of the playmat

  Small geometry fix in `landPosition()`.

- **Areas are locked/immovable — by design** (no ticket filed, this was a question)

  > The areas are immovable. I want to understand that. Are they part of the background? Can we change their appearance? Can we make it possible for players to change their size or move them?

  Confirmed in code: playmat/library/graveyard/exile are tldraw `geo`/`image` shapes created
  with `isLocked: true`, on purpose ("furniture: don't let a stray drag eat the graveyard").
  So: not background, real shapes; appearance IS changeable, just prop tweaks; nobody can
  move/resize them right now — deliberate, not a limitation. Making that player-adjustable
  would be a new feature (unlock + probably per-seat permissions) — say the word if you want
  it filed.

- **[LOW, deprioritized] Persistence — table state lost on restart** → [JES-151](https://linear.app/honeycombio/issue/JES-151)

  > persistence. Right now, shutting down the app and starting it up, the table is gone.

  Per Jess: matters, but solvable multiple ways later, no need to decide now. Revisit once
  JES-149/144 settle what the game state even looks like.
