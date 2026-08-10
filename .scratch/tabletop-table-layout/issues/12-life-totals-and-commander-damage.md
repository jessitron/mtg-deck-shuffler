# Life totals and commander damage

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: grilling
Status: resolved

## Question

Numbers a player can modify: a life total per player, and a commander-damage count per
opponent. Nothing exists in code. The core decision: **what kind of object is a modifiable
number here** — furniture (locked `mtg-zone`-style shapes with their own interaction, like
the Command Zone), a new custom shape type, or something outside the canvas entirely (React
UI floating over tldraw)?

Downstream of that choice:

- Who can change whose life total? (The fleet principle is "the players own the game
  experience; the app doesn't enforce" — but a misclick on someone else's life is easy.)
- Where does it live in the player area's geometry (the square from
  [Design the square](10-the-square.md), the widened column from
  [Design command-zone geometry](01-command-zone-and-player-area.md))?
- Commander damage is per attacker — up to 3 extra numbers per player at a 4-seat table.
  Always visible, or expandable?
- Does a life change land in the event log someday (Mountain 2 wants the story), and does
  that shape the object choice now?

Graduated 2026-08-08 from the map's fog — was waiting on map 1 (Physics), which is fully
resolved.

## Answer

Grilled with Jess 2026-08-08. A **life counter is a new custom shape** (working name
`mtg-life-counter`), **locked furniture**, whose `component()` renders a number with +/-
buttons; the number is **also directly editable by typing**. It syncs through the tldraw
room like every other shape.

- **The name row** (above the command zone/library, per ticket 01's geometry): player
  name, **large font, left-justified**; then **right-justified**, all the
  commander-damage counters, followed by the **life counter, bigger**, on the far right.
- **Life starts at 40. Commander-damage counters start at 0**, are **always visible**,
  and appear as opponents join.
- **Commander damage is per commander, not per player** — a partner-deck opponent gets
  two counters (the command zone was sized for partners in ticket 01, so this follows).
  No extra labeling distinguishes the two; players adjudicate, per the no-rules-engine
  principle.
- **Each commander-damage counter is identified by the opponent's name + sleeve color.**
  Sleeve color is a solid color by ticket 09's v1 decision, and travels per-seat once
  [ticket 11](11-sleeve-color-to-card-back.md) resolves — no separate player-color
  concept. (Playmats are images, not colors, so they can't serve this role.)
- **Everyone can change everything** — no ownership enforcement on the buttons, matching
  the fleet's "players own the game experience" principle. tldraw sync is
  last-writer-wins, so simultaneous presses on the same counter can lose one — accepted;
  rare and self-evident on screen.
- **Life changes are important log events, but that work is Map 5's** ("The table
  reports", not yet charted). Parked as
  `.scratch/tabletop-replaces-mural/parked/life-change-events.md`: emission belongs in
  the counter's button/edit handlers, and the change event may need metadata we can't
  name yet.

Mechanical grounding (from `tabletop-shape-mechanics-context`, 2026-08-08): locking gates
tldraw's gesture state machine but **not** DOM events, so a locked shape's `component()`
can host working buttons — `pointer-events: all` on the control plus
`editor.markEventAsHandled()` in pointer handlers, the same pattern as tldraw's own
`HyperlinkButton`. Locked furniture is structurally immune to the `onClick`
selection-deferral watch points. Implementation notes: the new shape type pays the
four-step registration cost (watch point 6), and the typing affordance must shield
keystrokes from tldraw's tool hotkeys.
