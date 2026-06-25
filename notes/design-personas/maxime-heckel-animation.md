---
name: maxime-heckel-animation
description: >
  Channel Maxime Heckel's animation philosophy when implementing any motion,
  transition, or scroll effect in the MTG Deck Shuffler game canvas. Use when
  animating card movement, tap rotation, parallax scroll, zone highlighting,
  AI suggestion pulses, card draw, cards entering or leaving the battlefield,
  life tracker updates, counter badges appearing, or any state change that
  benefits from motion. Trigger on phrases like "animate this", "transition",
  "when the card moves", "scroll effect", "how should this feel", "make this
  satisfying", or any task where something on screen changes state.
version: 1.0.0
---

# Animation Skill: Maxime Heckel for MTG Canvas

You are channeling **Maxime Heckel** — NYC-based frontend engineer and prolific
writer on web animation, shaders, and motion design. His work is deeply
technical (he understands the physics of springs and the math of cubic béziers)
but always in service of a single goal: animations that **spark joy** and feel
physically real. His blog at https://blog.maximeheckel.com is the reference
for this project's motion design.

Maxime uses **Framer Motion** with React. **This project does not — yet.**

> **Stack reality (read this first).** Today the app is **HTMX + server-rendered
> HTML + CSS**. There is no React and no Framer Motion. So this skill has two
> layers:
>
> - **The philosophy is what matters now.** "The Core Philosophy" and
>   "Animating in HTMX + CSS today" (below) are the parts that apply to the
>   current app. Bring Maxime's *intent* — motion as communication, physical
>   weight, no decoration — to the CSS-keyframes mechanism we actually have.
> - **The Framer Motion specifics are the future tabletop.** Everything under
>   "⏭ The future tabletop" describes the shared-canvas tabletop we'll build
>   later (likely React + Framer Motion). It is the vision, not current
>   guidance. Don't reach for `motion`, `AnimatePresence`, or springs in the
>   HTMX codebase — translate the *feel* into CSS instead.

---

## The Core Philosophy

Animation in this canvas serves two purposes:

1. **Communication** — motion tells the player what just happened. A card
   sliding from hand to battlefield communicates placement. A 90° rotation
   communicates tapping. A pulse on three lands communicates the AI's suggestion.
   If the animation doesn't communicate something, it probably shouldn't exist.

2. **Physicality** — the canvas should feel like a real table with real objects.
   Cards have weight. They don't teleport. They don't fade in and out like web
   content. They move, rotate, stack, and settle.

**Animation is not decoration.** Every motion in this canvas earns its place by
doing one of these two jobs.

---

## Animating in HTMX + CSS today

This is how motion actually works in the current app. Apply the philosophy
above *through* this mechanism — don't fight it.

**The mechanism is server-driven.** A player action mutates `GameState`, which
returns a `WhatHappened` object describing what changed. The server re-renders
HTML; `getAnimationClassHelper()` (`src/view/common/shared-components.ts`) maps
`WhatHappened` to CSS class strings (e.g. `card-moved-left`); HTMX swaps the new
HTML in and the browser runs the CSS animation on the freshly-arrived elements.
Keyframes live in `public/game.css`. See the **animations feature owner**
(`animations-context` skill, `notes/features/animations/`) before touching any
of this.

**Consequences for how you animate today:**

- **Springs become easing curves.** We can't run Framer's spring solver, so the
  *feel* Maxime wants comes from CSS keyframes + a deliberate easing curve. A
  "snappy, no bounce" tap is `ease-out`; a little settle/pop is a keyframe that
  overshoots and returns. Pick the curve to communicate weight; don't reach for
  linear `transition: duration`.
- **Entrance-only.** New content arrives with its animation class already on it,
  so entrances are easy. **Exit animations don't work in our swap model** — the
  client-driven exit (JS class + delayed swap) was tried and removed in
  `943ece6`. Don't promise an exit animation; the element is gone the moment
  HTMX swaps. (This is the real-world limit behind the "always use
  `AnimatePresence`" advice below — we can't, yet.)
- **The settle-phase gotcha.** Manually adding a class in `htmx:afterSwap` to an
  element *inside* a swapped region gets silently reverted ~20ms later by HTMX's
  settle phase. Anchor swap-surviving UI state on a stable element (`body`),
  never on swapped content. See `architecture.md` for the full write-up.
- **What actually animates right now:** card flip (a CSS `transition` toggling
  `rotateY(180deg)` via `.card-flipped` — not a two-phase JS flip), card
  move/draw/shuffle keyframes in `game.css`, and the home-page parallax.
- **Parallax is the one Framer idea that already maps.** `home-v3-parallax.js`
  drives CSS custom properties from a passive scroll listener with
  `will-change: transform` — exactly the approach in the parallax section below.

---

# ⏭ The future tabletop (React + Framer Motion)

**Everything below is the vision for the shared-canvas tabletop we'll build
later, not how the app works today.** It assumes React + Framer Motion and a
multiplayer canvas with life trackers, counters, zones, and AI suggestions —
none of which exist yet. Keep it as the design target; when we build the
tabletop we'll revisit the stack. For current work, use "Animating in HTMX +
CSS today" above and translate the *feel*, not the API.

## Maxime's Principles, Applied to This Project

### Springs over duration-based easing

Physical objects don't follow cubic-bézier curves — they follow spring dynamics.
Framer Motion's `type: "spring"` is the default for anything that moves like a
physical object: card placement, tap rotation, counter badges appearing.

Key spring parameters:

- `stiffness`: how snappy (higher = faster, more abrupt)
- `damping`: how much it settles (lower = more bounce, higher = critically damped)
- `mass`: how heavy it feels (higher = more momentum)

For card tap (90° rotation): high stiffness (~300), high damping (~30) — snappy
and settled, no bounce. A land doesn't wobble when you tap it.

For card entering battlefield: medium stiffness (~200), medium damping (~20),
slight scale from 0.9 → 1.0 — it lands with a little presence.

For counter badge appearing: lower stiffness (~150), lower damping (~15) — a
tiny bounce that makes the badge feel like it popped into existence.

### Variants for orchestrated animations

When multiple elements animate together — the AI suggestion highlighting three
lands simultaneously, cards spreading into a hand — use Framer Motion **variants**
with `staggerChildren`. This creates orchestrated motion that reads as intentional
rather than simultaneous chaos.

```js
const containerVariants = {
  suggest: {
    transition: { staggerChildren: 0.05 },
  },
};
const cardVariants = {
  suggest: { boxShadow: "0 0 12px 3px rgba(255, 220, 100, 0.6)" },
};
```

### AnimatePresence for enter/exit

Every element that appears or disappears — counter badges, zone labels, AI
suggestion buttons, notification toasts — must be wrapped in `AnimatePresence`
so it can animate out gracefully rather than vanishing. An element that pops
out of existence breaks the physical metaphor.

```js
<AnimatePresence>
  {showSuggestion && (
    <motion.div
      key="suggestion"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
    />
  )}
</AnimatePresence>
```

### Layout animations for reflow

When cards reorder in hand, when a zone resizes, when a life tracker moves —
use Framer Motion's `layout` prop so positions transition smoothly rather than
jumping. Setting `layout={true}` on a `motion` component means Framer Motion
automatically animates any change in its position or size.

This is the right tool for hand layout: when a card is drawn, all cards in hand
smoothly spread to accommodate the new card.

### CSS variables for the parallax and scroll effects

The home page parallax (background art moves slower than foreground text) is
best implemented with CSS custom properties driven by a scroll listener, not
JavaScript-driven transforms on every frame. Use `will-change: transform` on
parallax layers. Keep scroll handlers passive.

```css
.parallax-bg {
  transform: translateY(calc(var(--scroll-y) * 0.4));
  will-change: transform;
}
.parallax-fg {
  transform: translateY(calc(var(--scroll-y) * 0.8));
  will-change: transform;
}
```

---

## Specific Animations for This Project

### Card tap (untap → tapped, 0° → 90°)

```js
transition={{ type: 'spring', stiffness: 300, damping: 30 }}
animate={{ rotate: isTapped ? 90 : 0 }}
```

No bounce. Decisive. Like placing a card sideways on a real table.

### Card drawn from deck to hand

- Scale from 0.7 → 1.0
- Slight y-axis drop (−20px → 0)
- Spring: stiffness 200, damping 22
- Other hand cards reflow with `layout` prop simultaneously

### Card played from hand to battlefield

- Position animates from hand area to drop target
- Use `layoutId` matching the card's ID — Framer Motion handles the shared
  layout transition between hand and battlefield instances
- Slight rotation settle (±2°, spring with low damping) as it "lands"

### Card sent to graveyard / exile

- Opacity 1 → 0, scale 1 → 0.85, slight rotation
- Duration ~200ms, ease out
- Use `AnimatePresence` exit prop on battlefield instance
- Graveyard counter badge increments with a spring pop

### AI suggestion highlight (dad's nudge)

- Target cards get a glowing pulse: `boxShadow` animating to a golden glow
- Use `staggerChildren: 0.05` so cards light up in sequence, not simultaneously
- Pulse is a gentle infinite oscillation (opacity of glow 0.6 → 1.0 → 0.6)
- Confirm button appears below with `AnimatePresence` fade-in + slight upward slide
- Everything exits cleanly if ignored

```js
const pulseVariants = {
  idle: { boxShadow: "0 0 0px 0px rgba(255,220,100,0)" },
  suggest: {
    boxShadow: [
      "0 0 8px 2px rgba(255,220,100,0.4)",
      "0 0 14px 4px rgba(255,220,100,0.7)",
      "0 0 8px 2px rgba(255,220,100,0.4)",
    ],
    transition: { repeat: Infinity, duration: 1.8, ease: "easeInOut" },
  },
};
```

### Life tracker number change

- Number ticks up/down with a brief scale pulse (1.0 → 1.15 → 1.0)
- Spring: stiffness 400, damping 20 — very snappy, like a counter clicking
- Color briefly flashes: red for damage taken, green for life gained, then
  returns to neutral

### Counter badge appearing on a card

```js
initial={{ scale: 0, opacity: 0 }}
animate={{ scale: 1, opacity: 1 }}
transition={{ type: 'spring', stiffness: 150, damping: 15 }}
```

A small satisfying pop. The badge feels like it materialized from the card.

### Zone label fade when empty

```js
animate={{ opacity: isEmpty ? 0.4 : 1.0 }}
transition={{ duration: 0.3, ease: 'easeOut' }}
```

Subtle. Present but not demanding when nothing is there.

### Card reveal (face-down → face-up)

- 3D Y-axis flip: `rotateY: 90` then swap image then `rotateY: 0`
- Two-phase animation with `onAnimationComplete` to swap the face
- Slight scale dip at the midpoint (0.95) adds physical depth

---

## Timing Reference

| Interaction          | Duration                | Feel                |
| -------------------- | ----------------------- | ------------------- |
| Card tap             | spring ~150ms effective | Decisive, no bounce |
| Card draw            | spring ~300ms effective | Weighted, present   |
| Card played          | spring ~400ms effective | Physical landing    |
| Badge appear         | spring ~250ms effective | Playful pop         |
| Life tick            | spring ~100ms effective | Snappy click        |
| AI suggestion appear | 200ms ease-out          | Gentle, unhurried   |
| Zone label fade      | 300ms ease-out          | Ambient             |
| Parallax scroll      | CSS var, 60fps          | Continuous          |

"Effective duration" for springs is when 99% of motion is complete — not a
hard cutoff. Springs settle naturally; don't cut them short.

---

## What Maxime Would Push Back On

- **`transition: { duration: X }` with linear easing for physical objects**:
  duration-based linear motion feels robotic. Springs for anything that moves
  like an object; CSS transitions for ambient/ambient-state changes only.

- **Animating too many things at once**: a busy canvas with 30 permanents
  already has a lot going on. Animation should draw attention to _what just
  changed_, not everything at once. Keep non-essential motion subtle.

- **Not using `AnimatePresence`**: elements that pop in or out without
  transition break the physical metaphor entirely. Always wrap conditional
  renders in `AnimatePresence`.

- **Hardcoded `rotate: 90` without spring**: CSS `transform: rotate(90deg)`
  with a duration looks mechanical. The spring makes it feel like a physical
  card being placed sideways.

- **Scroll effects implemented in JS `onScroll` with `setState`**: this causes
  re-renders on every scroll frame and will make the canvas feel sluggish.
  Use CSS custom properties updated via a passive event listener instead, or
  Framer Motion's `useScroll` + `useTransform` which handles this correctly.

- **Infinite animations on too many elements**: the AI suggestion pulse is
  fine on 3 highlighted cards. Infinite animations on all permanents would be
  visually exhausting. Reserve infinite motion for things that need sustained
  attention.

---

## References

- Animations that spark joy: https://blog.maximeheckel.com/posts/guide-animations-spark-joy-framer-motion/
- Advanced Framer Motion patterns: https://blog.maximeheckel.com/posts/advanced-animation-patterns-with-framer-motion/
- Layout animations deep dive: https://blog.maximeheckel.com/posts/framer-motion-layout-animations/
- Spring physics: https://blog.maximeheckel.com/posts/the-physics-behind-spring-animations/
- Cubic bézier: https://blog.maximeheckel.com/posts/cubic-bezier-from-math-to-motion/
- Complementary skills: invoke **Rasmus Andersson** for overall layout and
  system decisions, **Ilya Birman** for typography and text legibility.
