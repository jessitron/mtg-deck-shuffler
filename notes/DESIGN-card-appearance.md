# Update the card appearance to look better

Status: not implemented

Currently, the cards appear with buttons underneath them. The buttons are hella ugly.

Instead, let's change this in phases.

Remember to use HTMX for the implementation, no custom JS.

## Phase 1 - initially implemented

- make the cards clickable.
- When clicked, a full-screen modal displays the card much bigger.
- Next to the card image, there is a "See on Gatherer" button (opens in new tab)
- and a "Copy" button (copies the image, does not close the modal).
- If it's a two-faced card, there's a "Flip" button. This does not affect game state.
- close the modal on clicking X or Escape.
- do not close the modal on 'flip'

### Phase 1A: a card flipped in the modal should be flipped when the modal closes

The flip-card-modal endpoint should trigger a "game-updated" HTMX event.

The game-container needs to listen for that event and refresh itself with an hx-get.

## Phase 2 - not implemented

- all action buttons that appear below the cards should be in the modal.
- when an action button is clicked, the modal will close.
- remove buttons from under the cards in the game view.

This applies to the Revealed Cards and Hand sections.

Exception: the Swap button in the Hand section should stay. It only makes sense while you can see multiple cards.
Another exception: the Flip button stays.

## Phase 3

- the modal displays the card's location
- if there are cards before/after this one in the location, show previous/next buttons.

## Phase 4

- change the Search and Table modals to pop the big-card modal when the card name is clicked, instead of the current link.

- to show people that the cards are clickable, make them react to hover by looking clickable. Like, add a raised border on hover or something.
