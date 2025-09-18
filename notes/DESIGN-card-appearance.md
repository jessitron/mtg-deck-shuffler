# Update the card appearance to look better

Status: not implemented

Currently, the cards appear with buttons underneath them. The buttons are hella ugly.

Instead, let's change this in phases.

Remember to use HTMX for the implementation, no custom JS.

# Phase 1

- make the cards clickable.
- When clicked, a full-screen modal displays the card much bigger.
- Next to the card image, there is a "See on Gatherer" button and a "Copy" button.
- If it's a two-faced card, there's also a "Flip" button.
- close the modal on clicking X or Escape.

# Phase 2

- all action buttons that appear below the cards should be in the modal.
- when an action button is clicked, the modal will close.
- remove buttons from under the cards in the game view.

This applies to the Revealed Cards and Hand sections.

Exception: the Swap button in the Hand section should stay. It only makes sense while you can see multiple cards.
Another exception: the Flip button stays.

# Phase 3

- change the Search and Table modals to pop the big-card modal when the card name is clicked, instead of the current link.

- to show people that the cards are clickable, make them react to hover by looking clickable. Like, add a raised border on hover or something.
