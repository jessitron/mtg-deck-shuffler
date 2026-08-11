# Notes for Jess

Here are some prompts that were useful

## triaging the whole inbox

OK, let's do some triage on TODO.md
Here's what I want. Go through each item.
Short item: that's from me. You can tell when the agent wrote something vs me, by its style (mostly, I'm succinct). That means we want to do it.
For items we want to do, pass it to a subagent. Give the subagent instructions to decide whether this is a quick task, in which case do it; or something that needs my input, in which case return GRILLING. Tell the agent not to update TODO.md; that's your territory. Delete done tasks and mark the GRILLING ones. You can merge the agent' branch.
For TODO items written by agents, you'll have to ask me whether we want to do each one now (pass to subagent) or defer (mark it deferred) or forget it (delete)
Go through each task one at a time, please. You can let the subagents work in the background, up to 3 at once.

## clean up a map

Our goal is to delete the .scratch/<map> directory and everything under it. It remains in git history for posterity.
You might be freaked out that something references these tickets. OK, let's fix that.
Look for references to the map or its tickets.

- if it's in a code comment, delete it!! Win! (it's still in git history for research)
- if it's in a doc, make sure the doc contains the information; usually the reference is a citation only. If the real info is in the ticket, move that info inline. Delete the citation.