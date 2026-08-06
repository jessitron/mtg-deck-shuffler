# Choose the inbox line format for a migrated issue

Mountain: safe-harbor
Type: grilling
Status: needs-triage

## Question

What does a surviving Linear issue look like once it's a `TODO.md` inbox line?

HITL. `TODO.md`'s existing format is a slug, a title, an optional `← mountain:` or
`← priority:` marker, and indented detail beneath. A migrated issue has more baggage than a
fresh capture: a `JES-` id, a Linear URL that will 404 after archiving, a body that may run
several paragraphs in `notes/linear-archive.md`, a priority, and a creation date.

Things to settle:

- Does the line keep the `JES-` id, and if so where — in the slug, or as a pointer?
- How does a reader get from the inbox line to the full body in `notes/linear-archive.md`?
  A grep hint, an anchor link, nothing?
- Does the dead Linear URL survive anywhere, or does archiving mean it goes?
- Do migrated items get a `← mountain:` marker now, or stay unmarked until triage?
- How much body comes across inline — title only, or a sentence of intent?
- Do the 40 sit in `## Next`, `## Backlog`, or a section of their own that marks them as
  arrivals from Linear?

The answer is a written format plus one worked example, built from a real issue in the
archive, so the later write-out is mechanical.
