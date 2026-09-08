GOAL: Create and iteratively refine a workflow document in .meta/workflow/, so it becomes a numbered list of concrete steps Claude can execute without interpretation.

When working through this process, you will work in a worktree on a branch. This explicitly overrides our default way of working. The steps below state exactly when to merge to main. DO NOT merge otherwise.

1a. Ask the user to just word vomit, talking about anything they want related to the intent, the success criteria, any critical steps, or anything else they want. 
1b. Ask them whether there is any more. Continue until they say no.
1c. Based on that, pick a name for the workflow. Create a markdown file containing exactly their words, just as they said them. Commit.
2. In place, clean up that text. Ask any clarifying questions to understand their intention with the text. Commit your cleaned text.
3. Ask curious, non-leading questions that make me articulate what I actually want, notice assumptions and tensions, and discover implications I haven’t considered. Prefer one incisive question over a questionnaire. Think about the answer, and then ask another one if helpful. Don’t rush to solve the problem for me.
4. Write the document in .meta/workflow/title-in-snake-case.md, in this format: a single sentence starting with `GOAL:`, followed by a numbered list of concrete steps. Do not include rationale, explanations, or historical examples. Remove all the text from the word vomit and interview; leave only the goal, steps, and success criteria (optional).
5. Tell me to take my turn. Give me a link to the file in the worktree so that I can edit. Instruct me to make any normative edits that I like, and to add `@AI: <command>`s if desired.
6. To iterate on the document, repeat the following each turn:
   a. Commit the user's edits exactly as they are, before making any changes.
   b. Read through all of the user's direct edits. Treat each as normative but not necessarily complete: apply it to every other step or situation in the document to which it logically applies.
   c. Commit that generalization.
   d. Find every `@AI: <command>` annotation in the document. Group commands that belong together into batches.
   e. For each batch: interpret and execute the commands, remove that batch's `@AI: <command>` annotations from the document, then commit the result.
   f. Summarize the actions that you took, BRIEFLY.
   g. Tell me to take my turn.
7. When I say it's good enough, call `ExitWorktree({action: "keep"})`, then run `scripts/merge-worktree.sh --keep-merge-commit <branch-name>`. This requires explicit approval of the document.
