# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`, **committed to git**.
This is a one-person project worked from several computers: a file round-trip beats an API
call, and git carries the state between machines. There is no collaborative ticket system.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at
  `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` — never a single
  combined tickets file
- Every spec and every issue opens with a header block, directly under the `# Title`:

      Mountain: tabletop-replaces-mural
      Ship: tabletop
      Status: needs-triage

- Comments and conversation history append to the bottom of the file under a `## Comments`
  heading

### `Mountain:`

Which of `SEAMAP.md`'s Mountains this work serves. **Required** on every spec and every issue —
a ticket that can't say where it belongs is a ticket worth questioning. Valid values:

| Value                        | Meaning                                                        |
| ---------------------------- | -------------------------------------------------------------- |
| `tabletop-replaces-mural`    | Mountain 1 — the synced tldraw canvas ← _achieved_             |
| `spine-gathers-data`         | Mountain 2 — the Spine records every physical event ← _active_ |
| `interpreter-learns-to-read` | Mountain 3 — guesses, ears, proactive help                    |
| `someday-asks-to-play`       | Mountain 4                                                     |
| `overhead`                   | **Not a Mountain.** Keeps an existing thing working or true — the upkeep that holds `SEAMAP.md` § Safe Harbor. |
| `none — <one-line why>`      | Genuinely serves no Mountain and isn't upkeep either. Say so out loud rather than guessing a Mountain. |

Only the first four are Mountains. `overhead` and `none` are the two ways of saying "no
Mountain" — the first because the work is upkeep, the second because it's neither.

**Safe Harbor is never a value here.** It's a *state* the repo is either in or out of
(deployed, green, docs true, nothing wrong), not a destination you sail toward, so nothing
can "serve" it. Work that keeps that state true is `overhead`.

Issues inherit their spec's Mountain unless a ticket plainly serves a different one.
Mountains themselves are never tickets — they live only in `SEAMAP.md`.

### `Ship:`

Which ship's `CLAUDE.md` governs this work — **required** on every spec and every issue,
same as `Mountain:`. Valid values: `shuffler`, `tabletop`, `spine`, or `fleet` for work
that genuinely spans more than one (a contract change, a cross-ship feature). This is
what tells an agent picking up the ticket which directory to stay in and which ship's
`CLAUDE.md` to read first — a Mountain can span ships even when a given ticket doesn't,
so `Mountain:` alone doesn't answer this.

Issues inherit their spec's Ship unless a ticket plainly touches a different one.

### `Status:`

The triage state. Use the role strings in `triage-labels.md`.

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number
directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` — the Notes / Decisions-so-far / Fog body.
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the
  question in the body. A `Type:` line records the ticket type
  (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file
  it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and
  unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then
  append a context pointer to the map's Decisions-so-far in `map.md`.
