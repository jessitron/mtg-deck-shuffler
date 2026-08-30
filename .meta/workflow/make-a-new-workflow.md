GOAL: Create and iteratively refine a workflow document in .meta/workflow/, so it becomes a numbered list of concrete steps Claude can execute without interpretation.

When working through this process, you will work in a worktree on a branch. This explicitly overrides our default way of working. The steps below state exactly when to merge to main. DO NOT merge otherwise.

0. Ask the user to just word vomit, talking about anythign they want related to the intent, the success criteria, any ciritical steps, or anything else they want. Based on that, pick a name for the workflow. Create `.meta/workflow/<name>.md` containing exactly their words, just as they said them. Commit.
1. In place, clean up that text. Ask any clarifying questions to understand their intention with the text. Commit your cleaned text.
2. Ask additional questions, in the style of Tricia Broderick + Arlo Belshee, one question at a time, to gain enough information to make a strong initial draft of the workflow. Record all your answers into the file and commit.
3. Write the document in this format: a single sentence starting with `GOAL:`, followed by a numbered list of concrete steps. Do not include rationale, explanations, or historical examples. Remove all the text from the word vomit and interview; leave only the goal, steps, and success criteria (optional).
4. Tell me to take my turn. Give me a link to the file in the worktree so that I can edit. Instruct me to make any normative edits that I like, and to add `@AI: <command>`s if desired.
5. To iterate on the document, repeat the following each turn:
   a. Commit the user's edits exactly as they are, before making any changes.
   b. Read through all of the user's direct edits. Treat each as normative but not necessarily complete: apply it to every other step or situation in the document to which it logically applies.
   c. Commit that generalization.
   d. Find every `@AI: <command>` annotation in the document. Group commands that belong together into batches.
   e. For each batch: interpret and execute the commands, remove that batch's `@AI: <command>` annotations from the document, then commit the result.
   f. Summarize the actions that you took, BRIEFLY.
   g. Tell me to take my turn.
6. When I say it's good enough, call `ExitWorktree({action: "keep"})`, then run `scripts/merge-worktree.sh <branch-name>`. This requires explicit approval of the document.
