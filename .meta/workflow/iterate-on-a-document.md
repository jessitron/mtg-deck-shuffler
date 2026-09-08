GOAL: Hand a document back and forth with the user until they say it is good enough, applying their edits as normative and executing their inline commands.

1. Tell the user to take their turn. Give them the full path to the file.
   Instruct them to make any normative edits
   they like, and to add `@AI: <command>` annotations anywhere in the document.
2. Wait. The user's turn ends when they respond.
3. If the user says "good enough", "move on", or equivalent, stop; the subprocess is done.
4. Commit the user's edits exactly as they are, before making any changes.
5. Read through all of the user's direct edits. Treat each as normative but not necessarily
   complete: apply it to every other step or situation in the document to which it
   logically applies.
6. Commit that generalization.
7. Find every `@AI: <command>` annotation in the document. Group commands that belong
   together into batches.
8. For each batch: interpret and execute the commands, remove that batch's
   `@AI: <command>` annotations from the document, then commit the result.
9. Summarize the actions you took, BRIEFLY.
10. Go to step 1.
