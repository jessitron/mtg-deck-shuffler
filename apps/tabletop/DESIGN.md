# DESIGN — the table, as a table

What the Tabletop canvas should look like and how it comes into being. This is
the target for Mountain 2 ("the physics of Magic") at the geography level: zones,
sizes, and who creates what when. It deliberately says nothing about rules.

Status: **the row layout below is built (2026-08-01); the Command Zone redraw
(2026-08-08, decided in `.scratch/tabletop-table-layout/issues/01-command-zone-and-player-area.md`)
is decided but not yet built.** The "playmat grows taller" edge case is still
separately deferred — see Deferred, below. `src/server/cardLayout.ts`
and `cardArrival.ts` implement the row-layout geometry as it stood before this
redraw; the seat-joined trigger lives in `src/server/seatJoined.ts`, and the
shared shape-drawing helpers in `src/server/tableFurniture.ts`. Building this
redraw touches those three files, `DESIGN.md`-first. The delta table at the
bottom describes what the row layout replaced. The original spoken ramble this
was distilled from is preserved at the end.

## The goal

When I sit down to play Magic, I put out a playmat. Everything I do happens in
relation to it. A table on the Tabletop should be recognizable as _that_ — not as
a whiteboard that happens to have cards on it. Concretely: **when a table is set
up and I open it, I should see my playmat, my library, my graveyard, my exile,
and the stack — before a single card is played.**

## Vocabulary

| Term            | What it is                                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Table**       | the shared board. A tldraw "room"; `/t/:tableName`. One per game.                                                    |
| **Seat**        | a player at the table. Identity is `seatId`; `playerName` is display-only.                                           |
| **Player area** | everything belonging to one seat: playmat + library + command zone + graveyard + exile + name label. A rectangle.    |
| **Playmat**     | the horizontal rectangle with the picture on it. On the Tabletop it _is_ the battlefield — nothing else lives on it. |
| **Library**     | the deck. Modeled in the Shuffler (hidden zone); pictured here as a card back with a shadow.                         |
| **Command Zone**| a labeled box beside the library, sized for **two** cards side by side (partner commanders). Home for the commander(s) when not on the battlefield. |
| **Graveyard**   | a labeled grey box you can drag cards into.                                                                          |
| **Exile**       | a labeled black box. Physically a sideways pile; here just a smaller box.                                            |
| **The Stack**   | a shared blue strip above all the player areas. Non-land plays arrive here.                                          |

"Player area" and "playmat" are _not_ synonyms — the playmat is one part of the
player area. This distinction is the point of the vocabulary table.

## The picture

Everything is right side up for everyone. Player areas sit in a **row**, left to
right, in join order.

```
 ┌───────────────────────────────────────────────────────────────────────────────┐
 │  The Stack                                                                    │
 │  (shared; spans all player areas; widens as each seat joins)                  │
 └───────────────────────────────────────────────────────────────────────────────┘

   Jess                                        Sam
 ┌──────────────────────┬────────┬──────────┐ ┌──────────────────────┬────────┬──────────┐
 │                      │ Library│ Command  │ │                      │ Library│ Command  │
 │  playmat             │ (card  │  Zone    │ │  playmat             │ (card  │  Zone    │
 │  = battlefield       │  back) │(2 cards) │ │  = battlefield       │  back) │(2 cards) │
 │                      ├────────┴──────────┤ │                      ├────────┴──────────┤
 │  (image background)  │                   │ │  (image background)  │                   │
 │                      │    Graveyard      │ │                      │    Graveyard      │
 │                      │      (box)        │ │                      │      (box)        │
 │                      ├───────────────────┤ │                      ├───────────────────┤
 │                      │   Exile (box)     │ │                      │   Exile (box)     │
 └──────────────────────┴───────────────────┘ └──────────────────────┴───────────────────┘
 └───────────── one player area ────────────┘
```

Reading of the physical table this comes from: library at the top right, graveyard
below it (closer to me), exile between/beside them. Here the library/command-zone
row and the graveyard/exile column below it move **off** the playmat, to its right,
so the playmat stays purely battlefield. The column's height matches the playmat's,
so the whole player area is a clean rectangle.

**Command Zone redraw (2026-08-08).** Jess: "the command zone is its own area... it
has to accommodate 2 cards, some commanders have partner." Decided in
`.scratch/tabletop-table-layout/issues/01-command-zone-and-player-area.md`: the
Command Zone takes the **old Exile spot**, next to the Library. Exile moves down
into the **bottom third** of the old Graveyard footprint; Graveyard shrinks to the
**top two-thirds** of that space. The column has to widen to fit Library + a
two-card-wide Command Zone side by side — and that ripples: every player area to
the seat's right shifts over (see Geometry, below).

## Geometry

Derived from the physical objects, so proportions feel right:

- Magic card: 2.5″ × 3.5″
- Standard playmat: 24″ × 14″ — i.e. **9.6 cards wide, 4 cards tall**

Today's canvas card is `CARD_W = 170`, `CARD_H = 238`, which fixes the scale at
**68 canvas units per inch**. Everything else follows:

| Thing             | Size (canvas units)                   | In cards                                                             |
| ----------------- | ------------------------------------- | --------------------------------------------------------------------- |
| Card              | 170 × 238                             | 1 × 1                                                                |
| Playmat           | 1632 × 952                            | 9.6 × 4                                                              |
| Right-hand column | ~545 wide                             | ~3.2 (was 2.5, before the Command Zone redraw)                       |
| Library slot      | 170 × 238                             | 1 × 1 (top-left of the column)                                      |
| Command Zone      | ~360 × 238                            | 2 × 1 (top-right of the column, beside the library; two commanders) |
| Graveyard box      | ~545 × ~463                           | fills the top two-thirds of the space under Library/Command Zone    |
| Exile box         | ~545 × ~231                           | fills the bottom third of that same space, below Graveyard          |
| Player area       | ~2197 × 952                           | playmat + 20 gap + column                                           |
| Stack strip       | full width of all player areas × ~350 | "taller than a card"                                                |

Vertical order, top to bottom: **stack strip → player name label → player area**.

Graveyard+Exile width comes from the column's own width (Library + gap + Command
Zone); their combined height is unchanged from before the redraw — "it fits under
the library and above the bottom of the playmat" — just now split two-thirds
Graveyard, one-third Exile instead of being one box.

**The ripple.** `Right-hand column` growing from 425 to ~545 grows `Player area`
the same amount, and `playerAreaX(seatIndex)` in `cardLayout.ts` places every seat
at a fixed offset by join order — so this widens every seat's column by ~120 units
**and shifts every player area to the right of a widened one over to match**. In
scope for this redraw, not deferred.

## How a table comes into being

The trigger is **Shuffle Up on the Shuffler's prep screen**. Typing a table name
doesn't create anything; shuffling up does.

**First player shuffles up:**

1. The table (room) is created.
2. Their player area is drawn: playmat with its background image, library as a card
   back with a shadow, empty graveyard box, empty exile box, name label above.
3. The Stack strip is created above, spanning that one player area's width.

**Second (third, fourth…) player shuffles up at the same table name:**

1. Their player area is drawn to the **right** of the last one.
2. The Stack strip widens to span all player areas.

**Consequence for the wiring:** the Tabletop needs a message it doesn't have today.
Player areas are currently allocated lazily, on a seat's _first card_. That's too
late: the whole point is that the table looks like a table before anyone plays.

**Decided:** an event-shaped `seat.joined`, in the same envelope-lite style as
`card.played` (SCAFFOLDING, same seam the Spine absorbs) — so the eventual swap to
the Spine's event feed changes the gateway, not the callers.

```
POST /api/tables/:tableName/events
{
  id: "<guid, fresh per attempt — idempotency key>",
  name: "seat.joined",
  occurredAt: "<ISO 8601, the Shuffler's clock>",
  initiator: { seatId, playerName },
  playmatImageUrl: "https://…/aeoe-43-cascading-cataracts.png"
}
```

Dedup on `seatId` already seated, the same way card arrival dedups on `instanceId`:
a second `seat.joined` for a seat is a physical no-op. `gameCardIndex` stays
forbidden here as everywhere past the Shuffler's boundary.

The playmat image is the Shuffler's to choose (eventually in prep; there's one
hard-coded playmat today) and must ride along on that message. Same channel later
carries the sleeve / card-back image, once prep offers sleeve choice; until then
everyone gets the standard Magic card back (`apps/shuffler/public/images/mtg-card-back.jpg`).

### `playmatImageUrl` is a public, absolute URL — any image on the internet

The long game is that a player pastes _any_ image URL in prep and gets that playmat.
So the field is an absolute `https://` URL the browser loads directly, and the
Tabletop treats it as opaque — it never proxies, caches, or validates the picture.
Same posture as card art: Scryfall URLs are already hotlinked into tldraw image
assets, and a playmat is that with a different aspect ratio.

**Anything can 404, redirect, or not be an image.** A broken playmat must degrade to
a plain empty mat, not a broken player area. The battlefield is a region that
happens to have a picture; the picture is the optional part.

## Where cards arrive

Only two arrival rules matter, and they're the two the Shuffler already knows how
to distinguish:

- **Lands** skip the stack and go straight to the playmat, filling the **bottom
  half**, left to right; a full row wraps to a new row below it. If there's no room,
  the playmat **grows taller** — impossible in real life, fine here.
- **Everything else** arrives on the **Stack**, above the playing seat's area so
  everyone can see it.

From the stack, a human drags it where it goes: creature/artifact/enchantment onto
the battlefield, instant/sorcery into the graveyard. **That's a person's job, not
the Tabletop's** — which is why the rest of my physical habits (creatures in a front
row, artifacts and enchantments bottom-right and right-justified) are recorded here
as _description only_, not as placement rules to implement. Cards hold wherever
they're dropped.

Nobody is restricted from moving anybody else's cards. That's not an oversight.

## Deferred

- **Per-seat rotated views / the square.** What I actually want is a circle of
  playmats — two facing each other, three as a triangle, four as a square — with
  _my_ mat in front of _me_ and the stack in the middle. tldraw (as far as Jess
  knows) can't rotate the view per viewer on a shared board. The row is the
  workaround, chosen only because everything must be right side up for everyone.
  Confirmed still wanted 2026-08-08, while resolving the Command Zone redraw —
  now its own ticket, [Design the square](../../.scratch/tabletop-table-layout/issues/10-the-square.md).
- **"Playmat grows taller" when lands overflow the bottom half.** Deliberately
  kept deferred, separately from the 2026-08-08 Command Zone redraw
  (`.scratch/tabletop-table-layout/issues/01-command-zone-and-player-area.md`):
  it's a *runtime* resize that cascades to everything below the playmat (Library,
  Command Zone, Graveyard, Exile all shift down when the mat grows), a different
  shape of problem from that redraw's one-time *static* geometry change. Bundling
  them would have made the redraw's ripple harder to review on its own.
- **Playmat selection** in prep (a dropdown; see `notes/FEATURE-playmat.md`).
- **Sleeve selection** in prep, which makes the card back vary per seat.

## Delta from what's built today

`src/server/cardLayout.ts` + `cardArrival.ts` currently give:

| Today                                                                   | This design                                                                             |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| A "battlefield row" per seat: bare canvas, cards in one horizontal line | A player area with an actual playmat image; lands fill the bottom half and wrap         |
| Graveyard + exile spots at the end of the row, card-sized               | A 2.5-card-wide graveyard and an exile box in a right-hand column, sized to the playmat |
| Rows allocated lazily on a seat's first card                            | Player area drawn at shuffle-up, before any card                                        |
| Stack: a fixed box at top-left                                          | A strip spanning all player areas, widening per seat                                    |
| No library on the canvas                                                | Library as a card back with a shadow                                                    |
| Card arrival is the only Shuffler → Tabletop message                    | Plus a seat-joined message carrying the playmat image                                   |
| `zoneHint: battlefield` auto-places in a row                            | Lands auto-place; nothing else is auto-arranged                                         |

## Open questions

1. **Graveyard height** — filling the full remainder under the library (~694, ~3
   cards tall) makes a tidy rectangle and room to spread a pile out. Alternative:
   one card tall, floating in that space. Recommending: fill. JESS: yes fill
2. **Exile placement** — the ramble says both "farther off to my right" and "above
   the graveyard, to the right of the library." Taken the latter (it makes the
   rectangle close). Confirm. JESS: yes
3. **Name label** — between the stack strip and the playmat, as written above. Any
   objection to it eating vertical space there? JESS: it's correct there

---

## Source: the original ramble

Preserved verbatim; transcription errors and all. If this design contradicts it,
the ramble is the ground truth about intent.

> We're gonna start rambling about the table the table top represents us playing a magic gathering game when I sit down to play a magic the gathering game I put out a play mat. A play mat is a horizontal rectangle. It often has a picture on it the shuffler app has a play map a play mat on the game screen like behind your hand and stuff there's a background and it represents a play mat so on the table top for each seat there's a plane which works as the battlefield pretty much for that player so the areas on the table for each player include a play mat. There's the library that's like my deck and that's modeled in deck Shepler, but it can be pictured on the table top just as a stack of cards. There's also the graveyard usually that OK so usually the library is in the top right corner of my play mat on the table in our table top I would like the play match to represent the battlefield and I would like the library a little bit off to the right and toward the top of the play mat and then below the library so closer to me is typically the graveyard on our table top the graveyard is like a box it's just a shape maybe it's gray and it says graveyard and it's a place that I can drag carts into. There's also exile which on a physical table, I usually represent as a sideways stack of cards between the library and the graveyard on our table top I think the exile should just be like farther off to my right and it's also a box and it's black so that's like one players area. Each seat has a plane mat and a graveyard in a library in an exile now ideally each player would click on the table and would see their own play mat in front of them, and other peoples play mats a raid like across from me in the center of the table is the stack so ideally there would be a circle of play mat well it's either two players so one across from the other or three, which would make a triangle or four, which makes a square. Those are the only well that's not true. I could be the first player to join in so it could just be me now on our table top I think we can't that I know of we can't like rotate the view differently per seat so assuming that restriction I I probably want I need all of them to be right side up. Every players perspective needs to be right up so how can we represent this to start with? We could just make a row I don't know that's unsatisfying. I definitely want in the future to figure some way to rotate the players perspective but for now I think we could just make a row of player areas so that everything is right side up and above the play mat we need to put the player name and then it's depending on who plays a card if it's a land it shows up on their play mat if it's any other spell, it shows up on the stack but now in this case that's like the area just above their play mat so the stack which we can represent as a box it's like a blue box in my head if we had a circle the stack would be a circle but if we have a row, I think the stack should be a long rectangle so when I play a spell, it goes onto the stack but like above my play mat so that everyone can see it and typically I will drag it from there onto the battlefield, which is my play mat if it's a creature or into my graveyard if it's an instant or sorcery lands are an exception they don't hit the stack they go straight to the play mat while we're talking about this on my play mat lands go in the bottom half and they lineup left or right to do to do unless I move them around just by default. A land would go to the right of all my other lands unless that rose full, and then it would go below it and since we have the option if there's not room on the play mat for another land, the play mat just get taller we can do that. It doesn't work in real life and then creatures and enchantments and artifacts. Also go on the play mat creatures in the front row and artifacts and enchantments. I put toward the bottom and kind of to the right so creatures are coming in in a row starting from the left and artifacts and enchantments are kind of right justified, but any of these things could be moved around by me or any other player technically, we're not restricting people from touching other people's cards. Any of these can be moved around and will of course hold their position. The knowledge here of where I usually put things is not super relevant because I'll be placing creatures and artifacts and enchantments from the stack to the battlefield myself so that doesn't actually matter this is fine yeah so what I need now is when we start a room in a room is the table tops term because it's the teal draw term when we start one the first player to type the name of the room is creating it and so their play mat in that image will eventually be passed by shuffler cause it'll be picked in prep. I want part of prep to be choosing a play map but right now there's just one but shuffler knows that the play mat image background and so that needs to be passed with the start of the room information now starting the room happens that when they type the room name, it happens when they shuffle up so the first player shuffle up is creating a room and they'll be the first seat and their mat gets drawn and their graveyard and their exile in the library right now the library can just look like a card back with a shadow. I don't know. Someday people will also be choosing sleeves in the prep phase of the Deck Shuffler, and then the card back will vary. Meanwhile, everyone just has the standard magic card back. There's an image for that in the shufflers images right so as the first player, I joined a table when I click on the link to see the table I see immediately there's my play mat and my library and microwave to my exile I should specify that the play mat you can look up typical play mat dimensions and then you can compare that to the real height of magic card, and then the height of the graveyard box, it fits under the library and above the top of the above the bottom of the play mat to fit in like the area under the library, but I do picture the graveyard is being two or three times as wide as the and then let's put exile above the graveyard, but to the right of the library it's a smaller space and that way it can make a nice rectangle, the player area, including the play mat library exile graveyard when the second player puts it put in the name of the same table and put shuffle up then we add their play mat to the table since we're making a row, put it to the right of the first players play mat oh and above the play mat is the player name that's te and then oh also when the first player joins, the stack is created as a blue rectangle above the play mat a little higher than a card and it's the width of the play mat and then the second player joint that stack rectangle gets wider so that it spans the . It spins the width of both play areas. I guess we need some terms here so we talked about the play mat which correspond to a battlefield. We need a play area associated with the seat, and that area includes the the play at the graveyard the exile, the library stack and I guess the players name and then the stack is a shared area. OK if all of that appears when a table is set up then I think I'll be able to play.
