# The Table

A polyglot monorepo for playing Magic together, remotely, at a table the system can see.

The fleet map — North Star, Mountains, Safe Harbor — is in [SEAMAP.md](SEAMAP.md).
The full vision is in [notes/DESIGN-the-table-vision.md](notes/DESIGN-the-table-vision.md).

## The ships

| Ship                                  | What it owns                                | State                    |
| ------------------------------------- | ------------------------------------------- | ------------------------ |
| [Shuffler](apps/shuffler/)            | The hidden zones: your library and hand     | Deployed, in use         |
| [Tabletop](apps/tabletop/)            | The shared tldraw canvas where play happens | Not built yet (seamap only) |
| [Spine](services/spine/)              | Tables, seats, the event log, the interpreter | Not built yet (seamap only) |

Each ship has its own `SEAMAP.md`.

**Deployed Shuffler: https://mtg.jessitron.honeydemo.io**

## Working in here

npm workspaces, so `npm install` at the root installs everything and
`package-lock.json` lives at the root.

```bash
npm install          # from the root
npm run build        # pass-through to the Shuffler
npm test             # pass-through to the Shuffler
```

Anything Shuffler-specific — running it, verifying it, deploying it — happens from
its own directory:

```bash
cd apps/shuffler
PORT=3344 ./run      # run locally
./verify.sh          # Playwright verification
```

See [apps/shuffler/README.md](apps/shuffler/README.md) for the Shuffler itself, and
[notes/](notes/) for design docs, vocabulary, and feature-owner knowledge bases.
