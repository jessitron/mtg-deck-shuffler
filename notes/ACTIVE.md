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
