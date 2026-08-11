# 01 — Delete the existing Rails Spine

Mountain: spine-tells-the-story
Ship: spine
Status: done

**What to build:** `services/spine`'s current Rails 8 app (app structure, Gemfile,
config, `app/`, `test/`, `db/`) is deleted entirely — it's broken (looping) and nothing
in production depends on it. `services/spine/interpreter/docs/journeys/` (pure docs, 26
ADRs + a 16-chapter guide) is preserved untouched; nothing under it changes. `contracts/`
at the repo root is untouched.

The root `./run` script currently starts Spine alongside the Shuffler and Tabletop; it
should instead **skip Spine entirely** (with a visible log line saying so) until the new
app exists — the Shuffler and Tabletop already run fine without it today, so this just
makes `./run` stop trying to start a service that no longer exists. No new Spine code
lands in this ticket; that starts in ticket 02.

**Blocked by:** None — can start immediately

- [x] `services/spine`'s Rails app is deleted (app/, test/, db/, config/, Gemfile, etc.)
- [x] `services/spine/interpreter/docs/journeys/` still exists, untouched
- [x] `contracts/` is untouched
- [x] `./run` from the repo root starts the Shuffler and Tabletop and logs that it's
      skipping Spine, without erroring
- [x] No leftover references to the deleted Rails app's start command in root-level
      scripts (`./run`, any fleet-wide docs that assumed Spine always starts)

## Comments

Verified by running `./run` end-to-end (after `npm install`): it prints "skipping spine
— services/spine has no ./run yet (mid-rewrite)", then Tabletop and Shuffler build and
come up, and the "fleet is afloat" banner no longer waits on Spine's `/up`. `./run`'s
spine step is now conditioned on `services/spine/run` existing, so ticket 02 doesn't
need to touch this file again — dropping in a working `run` script there is enough to
resume starting it. `services/spine/CLAUDE.md`, `README.md`, `SEAMAP.md` were left in
place (not part of "Rails app structure") for ticket 02 to update. Root `CLAUDE.md`'s
"Run the whole fleet locally" section updated to describe the skip.
