# Coding Standards

Repo-wide conventions for how code (including tests) gets written here. This is the file
the `code-review` skill's Standards axis should check against.

## No duplicated constants across specs

If two or more test/spec files need to agree on the same literal (an id prefix, a marker
string, a magic value used to distinguish two kinds of thing), don't repeat the literal in
each file. Export a named constant from the production code it actually describes, and
have every spec import it.

**Why:** a literal copied into several spec files can drift — one file's copy gets edited
and the others silently stop matching, and nothing points a future reader at the fact
several files are supposed to agree. A shared, exported, documented constant makes the
relationship explicit and keeps every consumer in sync automatically.

**Precedent:** `apps/tabletop/src/server/tableFurniture.ts` exports
`FURNITURE_IMAGE_ID_MARKER`, a shared id-prefix marker for the decorative furniture images
(playmat, library card back) that share tldraw's `image` shape type with player-dropped
images. Specs that need to exclude furniture images from "content someone actually put on
the table" import that constant instead of hand-typing the prefix.

This doesn't apply to a literal that only one file cares about — only to a value multiple
files depend on being the same.
