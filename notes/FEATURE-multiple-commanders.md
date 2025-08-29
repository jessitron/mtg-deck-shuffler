# Support multiple commanders

Status: not implemented

Some decks have two commanders. We need to support them.
For instance, Rat Girl's Food Hoarding (Archidekt 13083247) has two commanders. However, our current Deck definition only supports one commander.

We need to

[] support zero, one, or two commanders in the Deck type
[] test the archidekt adapter with a deck that has two commanders
[] rerun the download-deck script to get 13083247 again, and confirm that it has two commanders.
[] update the html to show both commanders. They should be next to each other.
