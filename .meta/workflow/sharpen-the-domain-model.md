# sharpen-the-domain-model (raw word vomit, verbatim)

okok. Our goal is to sharpen the domain model in one bounded context in the project. The domain model may be documented, or it may be implicit in the code. At the end of this process, it will be as consistent and sharp as we can get it at the moment.
Let's start with a process for establishing a domain model where it is not currently documented. If there is code, then there IS a domain model, but it might be fuzzy. What we want is a clear language and clear boundaries where that language applies. We will put them in a DOMAIN_MODEL.md file in the root of the module. It should answer questions like: What is the name of this bounded context? We should specify in the workflow the format of the file. What words are important in this bounded context? What are the entry and exit points, like place where this context communicates with others? What is the interface language there, is it in this bounded context's language, or the other, or a third (like a publicly defined one... what are those called in the DDD book, there's a list of options there that we should research and include in this workflow)
And then of course it will have a list of domain terms. These terms should correspond to types in the code, so either reference those types or reference where they SHOULD be used in the code.
So, in our workflow, we need to get information from the user. It's not entirely different from this process, in fact! After a document is produced, it should include the same document-iteration process used here.
So, ask the user what domain we're working on, and its boundaries, and what its purpose is. Ask also about any additional purposes it happens to have, since clean boundaries are always temproraary in real systems.
Note that boundaries aren't always between software components. Libraries and frameworks, too, have their own terms that we may want to adopt or may want to insulate our code from. That's an important question.
For these things, first ask the user an open question. (They are allowed to say 'look at the existing code/docs', they might find them sufficient). Then look at the existing code, so that you can suggest boundaries that might have been missed.
If this is the first time we're establishing a domain model, ask the user to give a concrete example. Be curious about the example, so that it is specific. It's OK to use multiple examples, so that they cover the gist of the domain including the major ins and outs. Find out which kind of thing is persisted, since that's stuff that's hard to change later (in production).
Be curious about the examples, and use them to get an understanding of the domain.

Now, before you write the DOMAIN_MODEL.md in the format that we choose to specify, it's first gonna be: ask the user stuff; write everything they say into the file, commit it. Then, start modifying what they said.
Put the concrete example (or a few) at the top, and CAPITALIZE the most important domain concepts. Then ask the user to edit the document (in the document iteration style) to see whether you got the example right, and whether the correct words are capitalized.
Commit at each step.
Then ask them for other domain terms that didn't come up in that example.
Catalog all

Dig around in the code and find words that look important and ask the user whether they are domain terms.
catalog all the words in the document, without definitions.
Give the user a turn to define any of them that they choose to define themselves.
When they say they're done, add your own definitions for any that are blank; and ask questions for any that are populated but unclear to you.
Then let the user review the file again.

Oh, and we need to do the same process with boundaries, with the review steps. That should be before words but after the concrete example.
Yeah, let's make this clearly ordered: concrete example; boundaries; words; relationship to code.
That last step is, after we think we know what the words mean, then go add references to where they're defined in code, and where they could be clearer... hmm, or maybe that's part of defining the words. I don't know. We'll have to try it one way or the other.

Once the domain model is established, the file probably has some NOTE:s in it that catalog discrepancies with the code. That is healthy, and addressing those is way out of scope for this process.
