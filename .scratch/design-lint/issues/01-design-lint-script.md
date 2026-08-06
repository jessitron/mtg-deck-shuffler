# Design lint: mechanize the checkable half of the design review

Mountain: safe-harbor
Status: ready-for-agent

No spec — single ticket, born from a conversation with Jess (2026-08-06): the
design owner's review skill only fires when an agent remembers to invoke it. The
mechanically checkable rules should be a script that never forgets.

## What

`scripts/design-lint.sh` (fleet-level `scripts/`, like `deploy-marker.sh`) that scans
the fleet's stylesheets and fails on **new** violations of the token discipline:

1. **Raw hex colors** outside `apps/shuffler/public/styles.css` `:root`. A tokenized
   color is `var(--something)`; a hex literal anywhere else is drift.
2. **`outline: none`** without a replacement `:focus-visible` rule nearby — don't
   grow the focus deficit.
3. (Stretch) raw `px` spacing values where a spacing token exists — only once
   spacing tokens actually exist; skip until then.

Scope: all Shuffler stylesheets (`apps/shuffler/public/*.css`, excluding
`design-candidates.css` and `design-gallery.css` — the gallery is allowed to stage
anything) **and** the Tabletop's CSS (`apps/tabletop/src/**/*.css` — locate exactly;
tldraw's own styles are out of scope, only ours).

## The ratchet — do not fail on existing debt

The Shuffler has ~57 legacy hex values today. The script must not turn the build red
on day one. Count violations per rule, compare against a committed baseline file
(`scripts/design-lint-baseline.txt` or similar):

- count > baseline → **fail**, print the new offenders
- count < baseline → **pass**, and say so — invite re-baselining downward
- Baseline only ever ratchets down.

## Wiring

- Runnable standalone: `scripts/design-lint.sh` from repo root.
- Called from the Shuffler's and Tabletop's `verify.sh` so it runs where tests run.
- On failure, point at the design owner: `owners/shuffler-looks-like-itself/README.md`.

## Done when

- Script exists, has a baseline, passes on current `main`.
- Adding `color: #4caf50` to `playmat.css` makes it fail with a message naming the
  file, line, and the token to use instead.
- Both verify scripts call it.
- The design owner's KB mentions it (run `/shuffler-looks-like-itself-update`).
