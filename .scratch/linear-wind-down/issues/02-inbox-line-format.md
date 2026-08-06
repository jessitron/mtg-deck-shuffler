# Choose the inbox line format for a migrated issue

Mountain: overhead
Type: grilling
Status: resolved

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

## Answer

**A migrated line is an ordinary `TODO.md` line.** No section of its own, no "from Linear"
badge, no shape a reader could tell apart from a fresh capture. The one concession to
provenance is a dead `JES-` id carried as a label.

### The format

```markdown
- [ ] `slug` Title in Jess's voice  ← mountain: <mountain>  ← was: JES-NNN
  - > the original ask, verbatim, when the archive has one
  - One or two lines of orientation: the non-obvious catch, the file it touches, or the
    cross-reference that stops it being walked twice.
```

- **`slug`** — kebab-case, derived from the title, matching the existing inbox
  (`deck-title-placement`, `no-doubleclick-crop`). The slug is the item's identity now.
- **`← was: JES-NNN`** — last marker on the line. Jess, 2026-08-06: *"put the linear ID just
  as a historical artifact. When that ticket is cleaned up, it'll go away."* It is a dated
  label, not a handle — nothing is expected to resolve it. It dies with the line when the
  line is promoted or deleted, which is how `JES-` finally leaves the repo.
- **`← mountain:`** — only for the active Mountain (`tabletop-replaces-mural`, clusters 1–3).
  `overhead` is the *absence* of a Mountain, so stamping it on a line is noise. Clusters
  4–7 get no marker.
- **No `← priority:`** — Linear's priority field is the stalest thing in the archive.
- **No Linear URL.** A URL is a live pointer and will 404; the destination says nothing in
  the repo points a future session at Linear.
- **Placement** — active-Mountain survivors go in `## Next`, everything else in `## Backlog`.
  Split by Mountain, not by provenance.

### The line stands alone

`notes/linear-archive.md` is being deleted, so there is no anchor, no grep hint, no
`git show` breadcrumb. Whatever a future session needs is on the line. This is deliberate:
what would be recovered is a Linear body written months ago, and the cluster tickets have
already fact-checked those bodies against today's codebase — ticket 01 found JES-133's
headline claim now false and JES-98's asks already shipped as `tracing_util.ts`. The cluster
answers are better than the archive bodies.

Corollary for the keep/kill sessions: **if a survivor can't be made to stand alone in two or
three sentences, that is evidence for a kill, not evidence it needs a pointer.**

### Depth: medium

Enough to know why it isn't done already; not a spec. Deep detail belongs to the `/to-spec`
run that promotes the line, and the cluster ticket holds it until then. Jess, 2026-08-06:
*"I absolutely do not care. Whatever is going to work for you when implementing them."* —
so this is a working rule, not a constraint to defend.

### Worked example — JES-145

Archive body:

> **From todo.md:** "Can we make the library link back to Deck Shuffler?"
>
> Quick win — the library shape's `url` prop is already a first-class tldraw field, currently
> hardcoded to `""` in both code paths in `apps/tabletop/src/server/tableFurniture.ts` (the
> image variant and the `regionShape` fallback). Setting it to the Shuffler's game URL for
> that seat should be enough for tldraw's stock click-to-open behavior to work. Need to
> figure out what URL to point at (per-seat game screen? needs seatId→Shuffler game URL
> mapping) since the Tabletop doesn't currently know the Shuffler's URL for a given seat.

Becomes, in `## Next`:

```markdown
- [ ] `library-links-to-shuffler` Link the Tabletop library back to the Shuffler  ← mountain: tabletop-replaces-mural  ← was: JES-145
  - > Can we make the library link back to Deck Shuffler?
  - Quick win: the `url` prop is already there in `tableFurniture.ts`, hardcoded `""`. The open
    part is *which* URL — needs a seatId → Shuffler game URL mapping the Tabletop doesn't have.
```

The second bullet is doing the real work: it carries the catch that is the whole reason this
isn't already done, and that a title-only line would lose.

### Merging with what's already there

Ticket 01 flagged four existing inbox items that overlap clusters 1, 2 and 6:
`deck-title-placement`, `playmat-command-zone`, `no-doubleclick-crop`, `animate-tap`. A
survivor that overlaps one of these **merges into that line** — its detail becomes another
sub-bullet, and `← was: JES-NNN` is appended to the existing line. It does not sit beside it
as a near-duplicate. The existing line keeps its slug and Jess's wording; the existing
`JES-` mentions in those bullets get rewritten to slugs by
[ticket 05](05-cut-the-linear-pointers.md).
