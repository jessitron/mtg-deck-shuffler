# Animations History

## Timeline

### Card Flip Animations (attempted, reverted, succeeded)

- `9c59a3e` - "Improve card flip animation with proper image transition timing" — tried JS-driven flip timing
- `db5885a` - Reverted the above
- `c8bf381` - "Revert 'Add card flip animations using WhatHappened structure'" — tried using WhatHappened for flips, abandoned
- `546b20f` - "Implement animation for flip card feature" — successful CSS transition approach
- `9e03881` - "Fix flip animation to properly show both faces during flip"
- `0ea1616` - "Update commander display to show both faces for two-faced commanders"

**Lesson**: Card flip animation was attempted multiple ways. The WhatHappened approach (server-driven) was reverted. The current CSS transition approach (class toggle) works.

### Card Play Exit Animation

- `0090968` - "Accept. The copy works, the animation doesn't" — acknowledged the play animation was broken
- `a0c72de` - "Modify being-played animation to move cards toward Table instead of disappearing" — changed from vertical disappear to diagonal drift toward table area
- `e904a8c` - "Fix being-played animation for two-faced cards by targeting nested flip container images"

**Status**: The play exit animation has been broken for a while. The copy-to-clipboard part of Play works, but the visual animation doesn't play properly.

### Hand Rearrangement Animations

- `6c01dfd` - "Add moveHandCard method with tests for drag-and-drop hand rearrangement"
- `7467447` - "Add /move-hand-card endpoint for drag-and-drop hand rearrangement"
- `a9bf37f` - "Make card images draggable instead of card containers"
- `27d9daa` - "I got it animating well when dropped"
- `30afca8` - "tweak animation speed"

### Deck Selection Animations

- `446315e` - "Add staggered fade-in animation to precon tiles" — CSS custom property for stagger delay
- `8097bbd` - "Add smooth animation to deck selection width transition"
- `3970e53` - "Skip fade-in animation on precon tiles during search" — disabled animation during active search

### CSS Organization

- `ca27f4c` - "Separate game styles from home page styles"
- `f95319d` - "Complete CSS cleanup: separate game and shared styles" — game.css created from styles.css
- `9539966` - "Extract shared playmat component styles into playmat.css"

## Design Decisions

- **No animation library**: Animations are pure CSS. This was never explicitly decided, it just evolved that way.
- **WhatHappened for entrance animations**: Works well. Server tells the view what changed, view applies CSS classes.
- **JS class application for exit animations**: The card play exit uses JS because the old element needs to animate before being replaced. This pattern is fragile — it depends on timing alignment between CSS duration, JS class application, and HTMX swap delay.
- **Typo preserved**: `dropppedFromLeft/Right` has three p's. It's in the interface and multiple files. Not worth a rename.

## What Was Tried and Abandoned

- Using WhatHappened structure for card flip animations (reverted in `c8bf381`)
- JS-driven flip animation timing (reverted in `db5885a`)
