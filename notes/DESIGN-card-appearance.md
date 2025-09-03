# Update the card appearance to look better

Status: not implemented

Currently, the cards appear with buttons underneath them. The buttons are hella ugly.

Instead, let's

# Phase 1

- make the cards clickable. When clicked, a full-screen modal displays the card much bigger, along with the buttons.
- close the modal on clicking X or Escape.
- remove buttons from under the cards.
- to show people that the cards are clickable, make them react to hover by looking clickable. Like, add a border on hover or something.

This applies to the Library, Revealed Cards, and Hand sections.

Exception: the Swap button in the Hand section should stay. It only makes sense while you can see multiple cards.

# Bonus Phase

- when the modal closes, the big card image animates back to its position, which might be the same, or might be different after the button click!

# Phase 2

- add "See on Gatherer" as a button.
- change the Search and Table modals to pop the big-card modal when the card name is clicked, instead of the current link.
- Then remove buttons from the Search and Table modals, since they're in the big-card one instead.
