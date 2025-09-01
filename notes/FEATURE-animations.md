# Animations

Status: not implemented

The cards in the hand can be swapped with buttons. But it is not clear to the player what is happening when they blink into their new positions.

I want to use animations to make it clear what is happening.

We can do this if we add classes to the cards that were just swapped.

For this, formatActiveGameHtml() in src/html-formatters.ts needs to know which cards were just swapped.

For that, I want GameState.swapHandCardWithLeft() and GameState.swapHandCardWithRight() to return instructions about what just happened, that we can then pass to formatActiveGameHtml().

Like:

swapHandCardWithLeft(handPosition: number): { movedRight: GameCard, movedLeft: GameCard }

There will be other effects like this I want to apply, so let's call the returned type WhatHappened. That way other operations in GameState can also return instructions about what just happened, and they can be passed to formatActiveGameHtml().
