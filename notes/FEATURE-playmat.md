# Feature: Dynamic Playmat Background

## Goal

Simulate the physical MTG playmat experience by allowing players to select and display different background images during gameplay.

Example playmat images:

[Jumbo Cactuar](https://ultrapro.com/cdn/shop/files/38748_Mat_MTG_FIN_F_Front-min.png?v=1749178080&width=1500) - this one is best scaled to fit

[Roller Rink Carpet](https://www.omegapatternworks.com/replace_colors/3054/) - this one is best tiled

## Implementation

1. Store playmat URL in game state. It is optional.

2. Hard-code it to Jumbo Cactuar for now.

3. Make the Deck Review page use this background, dynamically from the code. Don't add the background in styles.css, because the point is for it to be different every game, and styles.css is static.

4. Make the Active Game page use this background, dynamically from the code.

## Stuff to do later

Add a selection option to Deck Review for choosing a playmat. It is a dropdown with a few options.
