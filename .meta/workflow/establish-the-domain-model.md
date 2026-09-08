# establish-the-domain-model (cleaned notes, pre-draft)

## Goal

Establish the domain model of one bounded context, for the first time. The domain model may be documented, or
it may be implicit in the code — if there is code, there IS a domain model, it might just
be fuzzy. At the end of this process it is as consistent and sharp as we can get it at
the moment: a clear language, and clear boundaries where that language applies.

## The artifact

`DOMAIN_MODEL.md` in the root of the module. The workflow specifies its format. It answers:

- What is the name of this bounded context?
- What words are important in this bounded context?
- What are the entry and exit points — places where this context communicates with others?
- At each of those, what is the interface language: this context's language, the other
  context's, or a third (a publicly defined one)?
- A list of domain terms. Terms correspond to types in the code, so each either references
  the type that exists or references where the term SHOULD be used in the code.

The DDD context-mapping patterns to research and include as the menu of options for that
interface-language question: Partnership, Shared Kernel, Customer/Supplier, Conformist,
Anticorruption Layer, Separate Ways, Open Host Service, Published Language, Big Ball of Mud.

## How information is gathered

Not entirely different from the make-a-new-workflow process itself. Once a document is
produced, it uses the same document-iteration process (user's turn, commit their edits
verbatim, generalize, execute `@AI:` commands).

Open questions to the user first — they are allowed to answer "look at the existing
code/docs," which may be sufficient. Then look at the existing code, so we can suggest
things they missed.

Ask about:
- What domain are we working on, its boundaries, and its purpose.
- Any *additional* purposes it happens to have — clean boundaries are always temporary in
  real systems.

Boundaries aren't always between software components. Libraries and frameworks have their
own terms, which we may want to adopt or may want to insulate our code from. That is an
important question.

## Order of the work

Clearly ordered: **concrete example → boundaries → words → relationship to code.**

### Concrete example

If this is the first time we're establishing a domain model, ask for a concrete example.
Be curious about it so it becomes specific. Multiple examples are fine, so that together
they cover the gist of the domain including the major ins and outs. Find out which kind of
thing is persisted — that's what's hard to change later, in production.

Before writing `DOMAIN_MODEL.md` in the chosen format: ask the user stuff, write
everything they say into the file verbatim, commit. Then start modifying what they said.
Put the concrete example (or a few) at the top and CAPITALIZE the most important domain
concepts. Then give the user a turn to edit, to check whether the example is right and
whether the correct words are capitalized.

### Boundaries

Same shape as the example section, with the same review steps.

### Words

Ask for domain terms that didn't come up in the example. Dig around in the code, find
words that look important, and ask the user whether they are domain terms. Catalog all the
words in the document, without definitions. Give the user a turn to define any they choose
to define themselves. When they say they're done, add definitions for any left blank, and
ask questions about any that are populated but unclear. Then let the user review again.

### Relationship to code

After we think we know what the words mean, add references to where they're defined in
code, and where they could be clearer. (Or this is part of defining the words — unresolved;
we'll try it one way or the other.)

## Commits

Commit at each step.

## Out of scope

Once the domain model is established, the file probably has `NOTE:`s in it cataloging
discrepancies with the code. That is healthy. Addressing those is way out of scope for
this process.
