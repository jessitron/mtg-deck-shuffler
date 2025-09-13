# Improving the UI

Status: planned

I want to implement changes detailed in notes/DESIGN_interface, including

- rearranging the game view a little
- making the card clickable, leading to a modal with a big card and all the buttons
- make the cards draggable to the table and between sections, instead of the buttons underneath them.

But before that I want to refactor the view functions, they're a mess. See notes/STRUCTURE-view-organization.md

- break out the real common pieces into view/common.ts
- group the other functions according to application flow.

And before that I want snapshot tests. See notes/STRUCTURE-snapshot-tests.md
Problems with the snapshot tests:

- I don't know how to update the snapshots
- They show a bunch of irrelevant formatting changes. How can I normalize the HTML formatting?
- We need a few more of them, such as the modals.

9/13/2025, on an airplane: this stuff is not worth my headspace
