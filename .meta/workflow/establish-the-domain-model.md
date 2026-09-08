GOAL: Establish, for the first time, a written domain model for one bounded context — a clear language and clear boundaries where that language applies — in a `<NAME>_DOMAIN_MODEL.md` file.

Work in a worktree on a branch. Commit at every step. Where a step says "iterate", run
`.meta/workflow/iterate-on-a-document.md` on the file, naming the section under review.

## Phase 0 — Scope and file

1. Ask the user which bounded context we are establishing, what its purpose is, and what
   additional purposes it happens to have.
2. Ask the user for the name of the bounded context. Set `<NAME>` to that name in
   SCREAMING_SNAKE_CASE.
3. Choose the file location: the module's root when the bounded context corresponds to one
   module; the nearest common ancestor directory when it spans several modules or when the
   boundary is not yet clear-cut. State your choice and why in one sentence.
4. Create `<NAME>_DOMAIN_MODEL.md` at that location containing the user's answers to step 1,
   verbatim, under a heading `# <NAME>`. Commit.

## Phase 1 — Concrete example

5. Ask the user for a concrete example: one specific thing that happens in this context,
   start to finish.
6. Be curious. Ask follow-up questions, one at a time, until the example is specific rather
   than general. Ask what is persisted, since persisted shapes are the hardest to change
   later.
7. Ask whether another example is needed to cover the gist of the domain, including the
   major ins and outs. If so, repeat steps 5–6 for it. Multiple examples are fine.
8. Write everything the user said into the file, verbatim, under `## Examples`. Commit.
9. Rewrite the examples in place as prose narratives, with the most important domain
   concepts CAPITALIZED. Commit.
10. Iterate on the file, asking the user to check whether the examples are right and
    whether the correct words are capitalized.

## Phase 2 — Boundaries

11. Ask the user an open question about this context's boundaries: where it ends, and what
    it talks to. Say explicitly that "look at the existing code and docs" is an acceptable
    answer.
12. Read the code. Look for boundaries the user did not mention, including boundaries that
    are not between software components: libraries and frameworks have their own terms,
    which we may adopt or may insulate our code from.
13. Present the boundaries you found that the user did not mention, and ask which are real.
14. Write everything the user said into the file, verbatim, under `## Boundaries`. Commit.
15. Rewrite the boundaries section in place as a list. Give each boundary: its name, the
    direction (entry, exit, or both), what is on the other side, and its interface
    language, chosen from the context-mapping patterns:
    - Partnership — two contexts succeed or fail together and coordinate their models.
    - Shared Kernel — an explicitly shared subset of the model, changed only by agreement.
    - Customer/Supplier — downstream's needs are a budgeted priority for upstream.
    - Conformist — downstream adopts the upstream model wholesale, no translation.
    - Anticorruption Layer — downstream translates the upstream model into its own.
    - Open Host Service — upstream publishes a protocol for all its downstreams.
    - Published Language — both sides speak a third, publicly defined language.
    - Separate Ways — no integration at all.
    - Big Ball of Mud — no discernible model on the other side; treat it as one blob and
      translate at the edge.
    Commit.
16. Iterate on the file, asking the user to check the boundaries and the interface language
    at each one.

## Phase 3 — Words

17. List every domain term already appearing capitalized in the examples and named in the
    boundaries.
18. Ask the user for domain terms that did not come up in the examples.
19. Read the code. Find words that look important — type names, module names, recurring
    identifiers — and ask the user which of them are domain terms of this context.
20. Write every term into the file under `## Terms`, one per line, with no definitions.
    Commit.
21. Iterate on the file, asking the user to define any terms they choose to define
    themselves and to delete any that do not belong.
22. When the user is done, write definitions for every term still blank. Commit.
23. Ask the user about any definition they wrote that you do not understand, one question
    at a time. Record the answers. Commit.
24. Iterate on the file over the whole `## Terms` section.

## Phase 4 — Relationship to code

25. For each term, find the type, function, or module in the code that carries it. Add that
    reference to the term's entry as a `file:line` path.
26. For each term with no corresponding code, add a line stating where in the code the term
    SHOULD be used.
27. For each term whose code name differs from the domain term, or whose code usage
    contradicts the definition, add a `NOTE:` line stating the discrepancy. Do not change
    any code.
28. Commit.
29. Iterate on the file over the whole document.

## Phase 5 — Finish

30. Ask the user to approve the document.
31. Call `ExitWorktree({action: "keep"})`, then run
    `scripts/merge-worktree.sh --keep-merge-commit <branch-name>`.

## Success criteria

- `<NAME>_DOMAIN_MODEL.md` exists, and the user has approved it.
- Every boundary names its interface language.
- Every term has either a code reference or a statement of where it should be used.
- Discrepancies between the model and the code are recorded as `NOTE:` lines and left
  unaddressed.

## Out of scope

- Changing any code.
- Re-running against a `<NAME>_DOMAIN_MODEL.md` that already exists.
