GOAL: Establish, for the first time, a written domain model for one bounded context — a clear language and clear boundaries where that language applies — in a `<NAME>_DOMAIN_MODEL.md` file.

Work in a worktree on a branch. Commit at every step. Where a step says "iterate", run
`.meta/workflow/iterate-on-a-document.md` on the file, naming the section under review.

Conventions that apply to every step below:

- Ask the user one question at a time.
- After any free-form answer, look at what they said. If it seems cut off or incomplete,
  ask whether they would like to add anything else.
- "You figure it out" is always an acceptable answer. When the user gives it, spawn a
  subagent to research the question, then present the findings for confirmation.
- Every step that reads code, docs, or telemetry runs in a subagent.
- Every phase ends by printing ASCII art. The art shown below is a sketch of the shape;
  wherever it holds domain content, fill it in with this run's real content. They are only illustrations, not diagrams. Be cute, not complete.
- the Domain Rules section doesn't have an explicit step to fill it. Instead, populate it as you pick up information. The user can also add or correct it at any time.

## Phase 0 — Scope and file

1. Ask the user which bounded context we are establishing. Let them describe it as much as
   they like.
2. Unless the previous answer made it clear, ask what its purpose is.
3. Ask: does it have any more purposes or jobs? Repeat until they can't think of any.
4. Ask the user for the name of the bounded context. Set `<NAME>` to that name in
   SCREAMING_SNAKE_CASE.
5. If they haven't already told you, ask where the code for this bounded context lives. If
   they have, ask whether there's any code for it anywhere else.
6. Choose the file location: the module's root when the bounded context corresponds to one
   module; the nearest common ancestor directory when it spans several modules or when the
   boundary is not yet clear-cut. State your choice and why in one sentence.
7. Create `<NAME>_DOMAIN_MODEL.md` at that location containing the user's answers to these
   steps so far, verbatim, under a heading `# <NAME>`. Commit.
8. Now summarize what they said into a nice, concise purpose at the top of the file. Include auxiliary purposes,
   and anything they mentioned as excluded. Describe
   the scope of the bounded context as it corresponds to code.
9. At the bottom of the file, make sections (heading only) for what we will add:

```
## Concrete Examples

## Boundaries

## Domain Rules

## Terms
```

7. Iterate on the file until the user approves the summary.

8. Print ASCII art something like this:

   ```
           (         )
         (   domain    )
           (         )

                |
                v

      +----------------------+
      | FOO_DOMAIN_MODEL.md  |
      +----------------------+
   ```

## Phase 1 — Concrete example

9. Ask the user for a concrete example: one specific thing that happens in this context,
   start to finish.
10. Be curious. Ask follow-up questions until the example is specific rather than general.
11. When other examples come up here, follow those chains too, so you get an idea of the
    breadth of the domain.
12. Ask what is persisted, and what is visible to the user.
13. Ask whether another example is needed to cover the gist of the domain, including the
    major ins and outs. If so, repeat steps 9–12 for it. Repeat until they can't think of
    any more. Multiple examples are fine.
14. Write everything the user said into the file, verbatim, under `## Examples`. Commit.
15. Rewrite the examples in place as prose narratives, with the most important domain
    concepts CAPITALIZED.
16. If any examples are repetitive, cut down the number to the ones that are each
    expressing something new. Commit.
17. Add any Domain Rules you have picked up on so far to that section. Commit.
18. Add the purpose of the domain at the top, before Concrete Examples.
19. Iterate on the file, asking the user to check whether the examples are right and
    whether the correct words are capitalized.
20. Print this ASCII art:

```
                 .        .           -     _
             .       .  ~   . ~  -  ~  . = .  ~
         ~        ~  __.---~~_~~_~~_~~_~ ~ ~~_~~~
       .    .     .-'  ` . ~_ = ~ _ =  . ~ .    ~
                .'  `. ~  -   =      ~  -  _ ~ `
       ~    .  }` =  - _ ~  -  . ~  ` =  ~  _ . ~
             }`   . ~   =    ~  =  ~   -  ~    - _
   .        }   ~ .__,_O     ` ~ _   ~  ^  ~  -
          `}` - =    /#/`-'     -   ~   =   ~  _ ~
     ~ .   }   ~ -   |^\   _ ~ _  - ~ -_  =  _
          }`  _____ /_  /____ - ~ _   ~ _
  jgs   }`   `~~~~~~~~~~~~~~~`_ = _ ~ -
_ _ _ }` `. ~ . - _ = ~. ~ = .   -   =
```

## Phase 2 — Boundaries

20. In a subagent, read the code. Look for boundaries to reconcile against the user's list, including
    boundaries that are not between separate processes: libraries and frameworks have their
    own terms, which we may adopt or may insulate our code from.
21. If you have access to tracing, then in a subagent, look at production tracing. If there
    is a service map, query it. If there are traces, see if you can query for "what services
    call into this one?" and "what services does this one call?" (this is possible in
    Honeycomb).
22. Meanwhile, Ask the user an open question about this context's boundaries: where it ends, and what
    it talks to. Repeat until they can't think of any more.
23. In a subagent, check documentation and any other sources you have access to.
24. Present the boundaries you found that the user did not mention, and ask which are real.
25. For each boundary, ask what language is used to communicate: ours, theirs, or a third.
26. Write everything the user said into the file, verbatim, along with your findings, under
    `## Boundaries`. Commit.
27. Rewrite the boundaries section in place as a list. Give each boundary: its name, the
    direction (entry, exit, or both), what is on the other side, and its interface language,
    chosen from the context-mapping patterns:
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

28. Iterate on the file, asking the user to check the boundaries and the interface language
    at each one.
29. Print ASCII art something like this:

    ```
             outside
                |
                v

        .-------------------.
       /                     \
      |      our context      | ---> other system
       \                     /
        '-------------------'
                ^
                |
             outside
    ```

## Phase 3 — Words

29. List every domain term already appearing capitalized in the examples and named in the
    boundaries.
30. Ask the user for domain terms that did not come up in the examples. Repeat until they
    can't think of any more.
31. In a subagent, read the code and the documentation. Find words that look important —
    type names, module names, recurring identifiers — and ask the user which of them are
    domain terms of this context.
32. Ask the user whether some of the terms are defined in other bounded contexts, such as
    published languages or other industry standards. Use your general knowledge to suggest
    likely ones. If so, note that in the file as an overlapping language; give it a name.
33. Write every term into the file under `## Terms`, one per line, with no definitions. If
    there is an overlapping language, and you think this bounded context uses a term in that
    way, note `(OVERLAPPING-LANGUAGE-NAME?)` after it. Commit.
34. Iterate on the file, asking the user to define any terms they choose to define
    themselves and to delete any that do not belong.
35. When the user is done, write definitions for every term still blank. Commit.
36. Ask the user about any definition they wrote that you do not understand, one question at
    a time. Record the answers. Commit.
37. Iterate on the file over the whole `## Terms` section.
38. Print ASCII art something like this, using this context's real terms:

    ```
          invoice
      account    plan
         customer
     payment   subscription
           \   |   /
            \  |  /
             \ | /
          +---------+
          |  TERMS  |
          +---------+
    ```

## Phase 4 — Relationship to code

39. In a subagent, for each term, find the type, function, or module in the code that
    carries it. Add that reference to the term's entry as a `file:line` path.
40. For each term with no corresponding code, add a line stating where in the code the term
    SHOULD be used.
41. For each term whose code name differs from the domain term, or whose code usage
    contradicts the definition, add a `NOTE:` line stating the discrepancy. Do not change
    any code.
42. Commit.
43. Iterate on the file over the whole document.
44. Print ASCII art something like this, using this context's real terms and paths:

    ```
       CUSTOMER  ---------> customer.rb:12 (aka Account)
       PLAN      ---------> billing/plan.ts:44
       PAYMENT   ---------> ???
       ...
    ```

## Phase 5 — Finish

45. Ask the user to approve the document.
46. Call `ExitWorktree({action: "keep"})`, then run
    `scripts/merge-worktree.sh --keep-merge-commit <branch-name>`.
47. Print ASCII art something like this:

    ```
       +----------------------+
       |   DOMAIN MODEL       |
       +----------------------+
       | ✅ examples          |
       | ✅ boundaries        |
       | ✅ terms             |
       | ✅ code links        |
       +----------------------+

          ✨ APPROVED ✨
    ```

## Success criteria

- `<NAME>_DOMAIN_MODEL.md` exists, and the user has approved it.
- Every boundary names its interface language.
- Every term has either a code reference or a statement of where it should be used.
- Discrepancies between the model and the code are recorded as `NOTE:` lines and left
  unaddressed.

## Out of scope

- Changing any code.
- Re-running against a `<NAME>_DOMAIN_MODEL.md` that already exists.
