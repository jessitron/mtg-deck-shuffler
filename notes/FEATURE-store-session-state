# Tracking the library

Status: not started. not there yet.

Instead of keeping a count of cards, we need to store a list of cards in the library.

Hmm, this introduces a wrinkle. I like using htmx, but when someone draws from the library, that list needs to change, and we will display the card.

We will need to store the session state on the server.

## Where am I going with this app anyway?

In the end, I want to be able to save my state, but it doesn't have to be on the server; I'd be happy with cut-and-paste in the client.

It's probably silly to use htmx here, because this is more of an app than a site. Anything we can do on the server is trivial.

As much as I dislike client-side javascript, it's probably worthwhile here.

And while we're making an app with cut-and-pasteable state, it makes a lot of sense to use React. With a top-level State object that flows down.

Do people still use Redux? That's the style of programming needed here.
