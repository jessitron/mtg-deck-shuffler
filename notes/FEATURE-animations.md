# Animations

Status: not implemented

The cards in the hand can be swapped with buttons. But it is not clear to the player what is happening when they blink into their new positions.

I want to use animations to make it clear what is happening.

We can do this if we add classes to the cards that were just swapped.

For this, formatActiveGameHtml() in src/html-formatters.ts needs to know which cards were just swapped.

For that, I want GameState.swapHandCardWithNext() to return instructions about what just happened, that we can then pass to formatActiveGameHtml().

They can return type WhatHappened. We will add { movedRight?: GameCard, movedLeft?: GameCard } to that file.

Then formatActiveGameHtml() can add classes to the cards that were just swapped.
