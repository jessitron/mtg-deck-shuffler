# Notes for Jess

Here are some prompts that were useful

## triaging the whole inbox

▎ OK, let's do some triage on TODO.md
▎ Here's what I want. Go through each item.
▎ Short item: that's from me. You can tell when the agent wrote something vs me, by its style (mostly, I'm succinct). That means we want to do it.
▎ For items we want to do, pass it to a subagent. Give the subagent instructions to decide whether this is a quick task, in which case do it; or something that needs my input, in which case return GRILLING. Then you update the TODO.md. Delete done tasks and mark the GRILLING ones.
▎
▎ For items from agents, you'll have to ask me whether we want to do each one now (pass to subagent) or defer (mark it deferred) or forget it (delete)
▎
▎ Go through each task one at a time, please. You can let the subagents work in the background, up to 3 at once.