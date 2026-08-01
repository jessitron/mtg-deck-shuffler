# jess writes notes here. The agent can either do them immediately or put them in Linear.

All the outstanding items below turned into Linear tickets (team `jessitron`) on 2026-08-01.
Notes/opinions from Claude are inline under each. Original wording preserved as the quote.

- **Rotate cards, popup menu cleanup, flip cards** → [JES-144](https://linear.app/honeycombio/issue/JES-144)
  > We must be able to rotate cards. Ideally, clicking on a card turns it 90 degrees.
  > the card's popup menu should not have crop or download. I like alt, I'm OK with replace media that's entertaining. It should have rotate!
  > we need a way to flip cards. Is that something we could add to the card's submenu?

  I bundled these three into one ticket — they're one implementation. Today cards are
  stock tldraw `image` shapes with the stock tldraw context menu (that's where crop/download
  come from); there's no rotate, no flip, no custom menu at all yet. Getting any one of these
  means building a custom `ShapeUtil`/menu override for cards, so it's the same underlying
  work whether you want one of these or all three. Flip is the meatiest — it should emit a
  `card.flipped`-shaped event like `card.played` does, per the two-faced-cards owner.

- **Library links back to the Shuffler** → [JES-145](https://linear.app/honeycombio/issue/JES-145)
  > Can we make the library link back to Deck Shuffler?

  Genuinely small — the library shape already has a `url` prop, it's just hardcoded empty.
  The only real question is *which* URL (the seat's game screen on the Shuffler), which
  means the Tabletop needs to learn that URL per seat. Good first ticket to knock out.

- **Playmat cosmetics: rounded corners, thick black border, no dotted line** → [JES-146](https://linear.app/honeycombio/issue/JES-146)
  > cosmetic: the playmat needs rounded corners. Ideally also a thick black border.
  > cosmetic: I can see gray dotty lines around the playmat, and I shouldn't.

  Border color/weight and killing the dotted line are one-line prop tweaks (`regionShape()`
  already parameterizes these). Rounded corners are NOT — tldraw's `geo` rectangle has no
  corner-radius option, so that part needs either a custom shape or an image trick. Worth
  deciding the approach before diving in; if a custom card `ShapeUtil` gets built for
  JES-144, this might piggyback on that same investment.

- **Cards land centered on the Stack** → [JES-147](https://linear.app/honeycombio/issue/JES-147)
  > the card should land in the stack centered above the player's playmat

  Straightforward — `stackCardPosition()` currently piles from the strip's top-left corner,
  not centered at all. Simple geometry fix.

- **Exile: distance from library, height, border, label** → [JES-148](https://linear.app/honeycombio/issue/JES-148)
  > Exile needs to be a little distance from the library. It also needs to be taller than a card. So the library probably needs a border around it and a label.

  All geometry/prop tweaks to existing shapes, no new shape types needed.

- **Visual feedback dragging into exile/library** → [JES-149](https://linear.app/honeycombio/issue/JES-149)
  > is it possible to make something happen when we drag a card into exile or the library? for instance, could it get smaller or grayer?

  This is the least certain one. There's no drag-event handling in the Tabletop client at
  all today — this needs new infrastructure (bounds-intersection check on drop + a shape prop
  mutation), not a port of the Shuffler's CSS-keyframe animations, which are HTMX-specific
  and don't transfer to tldraw's canvas. I'd treat this as a small spike before committing to
  an approach.

- **Lands need spacing from each other and the playmat edge** → [JES-150](https://linear.app/honeycombio/issue/JES-150)
  > lands should leave a space between each other and the side of the playmat

  Small geometry fix in `landPosition()` — add a margin constant.

- **Areas are locked/immovable — by design** (no ticket filed, this was a question)
  > The areas are immovable. I want to understand that. Are they part of the background? Can we change their appearance? Can we make it possible for players to change their size or move them?

  Confirmed in code: playmat/library/graveyard/exile are tldraw `geo`/`image` shapes created
  with `isLocked: true`, on purpose ("furniture: don't let a stray drag eat the graveyard").
  So: not background, real shapes; appearance IS changeable (see JES-146/JES-148 above,
  they're just prop tweaks); but nobody can move or resize them right now — that's a
  deliberate choice, not a limitation. If you want players to be able to resize/move their
  own area, that'd be a new feature (unlock + probably a per-seat permission model) — say
  the word and I'll file it separately, didn't want to assume you want it.

- **Persistence — table state lost on restart** → [JES-151](https://linear.app/honeycombio/issue/JES-151)
  > persistence. Right now, shutting down the app and starting it up, the table is gone.

  Filed as one ticket, but flagging: this is architecture, not a quick fix. Rooms are
  in-memory (`TLSocketRoom`) with zero snapshotting today, and JES-140's design doc already
  frames the Spine as the fleet's eventual source of truth for table state via its event
  log. My opinion: worth a short design conversation before anyone starts coding, so we don't
  build a local-snapshot fix that gets thrown away the moment Spine wiring lands — or,
  alternatively, decide that's fine as a stopgap because Spine is still far off. Either way,
  it deserves a decision, not just a PR.
