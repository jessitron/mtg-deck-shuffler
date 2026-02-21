# Card Type Symbols

Status: available, not yet used in UI

## Overview

We have SVG icons for the standard MTG card type symbols. These are the same symbols that appear on physical Magic cards in the type line area.

## Available symbols

Located in `public/icons/card-types/`:

- `artifact.svg` - Chalice/goblet shape
- `creature.svg` - Claw marks
- `enchantment.svg` - Sunrise/radiance
- `instant.svg` - Lightning bolt
- `land.svg` - Mountain peaks
- `multi-type.svg` - Black and white cross (for cards with multiple types)
- `planeswalker.svg` - Five-pointed handprint
- `sorcery.svg` - Flame

## Types without symbols

These card types intentionally have no icon:

- **Kindred** (formerly Tribal) - no official symbol exists
- **Supplemental types**: Battle, Conspiracy, Dungeon, Emblem, Hero, Phenomenon, Plane, Scheme, Vanguard - none of these appear in our deck data

## Card types in our data

From scanning all decks in `decks/`, the types that actually appear are:
Artifact, Creature, Enchantment, Instant, Kindred, Land, Planeswalker, Sorcery.

## Source

All SVGs sourced from the [MTG Wiki card type page](https://mtg.fandom.com/wiki/Card_type), retrieved 2026-02-21.

## Usage

Reference as `/icons/card-types/{type}.svg` in HTML, e.g.:

```html
<img src="/icons/card-types/creature.svg" alt="Creature" class="card-type-icon">
```

For cards with multiple types, use `multi-type.svg` or show individual type icons for each type.
