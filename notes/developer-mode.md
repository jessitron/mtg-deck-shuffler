# Developer Mode (undocumented)

A per-browser toggle that reveals debug affordances. Intentionally **undocumented
to users** — you just have to know the URL. This note is for us (devs), not players.

## How to enter / exit

- **Enter**: visit `/dontdie` (a personal code). Sets a long-lived `devMode=1`
  cookie and redirects back where you came from.
- **Exit**: the "Exit dev mode" link inside the game's hamburger menu → `/dontdie/off`
  (clears the cookie). Or hit `/dontdie/off` directly.
- It's a cookie, so it's per-browser. To compare dev vs normal side by side, use
  two different browsers.

## What it currently reveals

- The debug block in the game hamburger menu (`.menu-debug`: game id, state
  version, browser tab id, and the "State" button). Hidden by default.

## How it works

- `app.ts`: a middleware reads the `devMode` cookie off `req.headers.cookie` (no
  cookie-parser dependency) and sets `res.locals.devMode`. The `/dontdie` and
  `/dontdie/off` routes set/clear the cookie.
- `formatPageWrapper` (`src/view/common/html-layout.ts`) renders
  `<body class="dev-mode">` when `devMode` is true. Only the full game-page route
  (`GET /game/:gameId`) currently passes `res.locals.devMode` through
  (`formatGamePageHtmlPage`).
- `public/game.css`: `.menu-debug` is `display:none` by default; `body.dev-mode
  .menu-debug { display: block }` reveals it. Because `<body>` is never swapped by
  HTMX, visibility survives every game-state swap with no JS. (See the
  animations feature owner's architecture notes — this is the body-anchored
  swap-surviving-state pattern, same family as `body.game-menu-open`.)

## Important limitation

This is a **declutter toggle, not a security boundary**. The debug HTML is present
in the DOM for everyone — CSS just hides it. That's fine for today's content (none
of it is sensitive). When we add dev-only features that genuinely must be withheld
from non-dev requests, render them **outside** the game fragment and gate them
server-side on `res.locals.devMode` (pass the cookie/flag explicitly), rather than
relying on CSS.

## Tests

`test/verification/verify-developer-mode.spec.ts` (Playwright). Run with
`npm run test:verify`.
