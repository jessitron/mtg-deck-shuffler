# Gatherer search links when necessary

Not every card has a multiverseid. When they don't (when it's 0 in archidekt), then we can't link to Gatherer directly to the card.
Instead, we need to link to a search.

Here's the thing: Gatherer doesn't always have the card name either. However, gatherer always has the oracleCardName.

We need to store the oracleCardName in the card definition, whenever it's different from the display name.

Then, when the multiverseid is 0, format the Gatherer link as a search for the oracleCardName.
