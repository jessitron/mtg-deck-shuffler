GOAL: Create and iteratively refine a workflow document in .meta/workflow/, so it becomes a numbered list of concrete steps Claude can execute without interpretation.

1. If no workflow document exists yet for this task, ask the user what the workflow should cover, one question at a time, until there is enough information to draft it.
2. Write the document to .meta/workflow/<name>.md in this format: a single sentence starting with `GOAL:`, followed by a numbered list of concrete steps. Do not include rationale, explanations, or historical examples.
3. Commit the document.
4. To iterate on the document, repeat the following each turn:
   a. Commit the user's edits exactly as they are, before making any changes.
   b. Read through all of the user's direct edits. Treat each as normative but not necessarily complete: apply it to every other step or situation in the document to which it logically applies.
   c. Commit that generalization.
   d. Find every `@AI: <command>` annotation in the document. Group commands that belong together into batches.
   e. For each batch: interpret and execute the commands, remove that batch's `@AI: <command>` annotations from the document, then commit the result.
5. Work directly on the current branch (no worktree) unless told otherwise.
