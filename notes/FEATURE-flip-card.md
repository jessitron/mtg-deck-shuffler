# Flip two-faced cards

Some cards are two-sided, instead of having the usual card back. The player needs to be able to flip them, when they're face up (revealed, in hand, commanders in command zone).

First we need to know which cards are two-faced. Add a flag to CardDefinition, and set it when we convert from Archidekt data. The trick in Archidekt is to look at card.oracleCard.faces.length == 2 (for single-faced cards, faces is an empty array)

THen, the scryfall image function needs to have the option of "front" or "back" (default front)

Then, any card with two faces needs a 'flip' button underneath it. That changes which image is displayed.

For bonus points, animate the flip.
