# Initialize the app

First I want a static index.html and styles.css. It's enough to say "Woohoo it's Magic time"

the Node backend serves the static files.

and a package.json with a run script in it.

... you kept it really simple, good work!

## first ability

Next let's make it accept input.

It needs an input field for archidekt deck number.

It needs an endpoint to accept that input and return some html that says "you have chosen deck [number]"

It'll need to bring htmx in as a script tag.

the input can then hit the endpoint, get the response, and replace its parent div with the response.

the latest version of htmx is 2.0.6

## second ability: how many cards are in the deck?

next, the server will call out to the archidekt api to get the deck, convert the result into its own type,
and then populate the HTML with the name and number of cards in the deck.

- please make a type of our own that is optimized for use in this app. Let's call it Deck.
- make a conversion function from the archidekt type to our type.
- call that conversion function from the endpoint.

- make another function that formats the html based on our type, and call that in the endpoint.

## next ability: show the commander name

This isn't working, so it's time to introduce tests. We will write tests for the conversion function.

What is the simplest test framework we can use, that lets us write tests in typescript?
