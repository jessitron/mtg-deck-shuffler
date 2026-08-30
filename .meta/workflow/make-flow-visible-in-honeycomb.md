GOAL: Make a flow traceable end-to-end in Honeycomb, extending existing tracing incrementally, so its actual runtime behavior is visible for debugging.

1. Identify the trigger point of the flow — the first code that runs when it starts.
2. Trigger the flow once, in a way that produces one concrete execution.
3. Try to find that execution in Honeycomb: filter by an identifying attribute already on the trigger point's span if one exists, or by a trace id the app printed in debug mode at trigger time, or by browsing the most recent spans on the relevant dataset.
4. If you can't find it, or the span you found carries no way to identify this specific execution, add one at the trigger point — an attribute carrying an id already available there, or a debug-mode trace-id print — whichever fits the codebase's existing pattern; don't invent a new pattern if one already exists. Repeat steps 2–4 until the execution is reliably findable.
5. Identify the next downstream hop in the flow — the next service, process, or async boundary it crosses — and check whether a span for it already exists in the same trace as the trigger point's span.
6. If that hop has no span in the same trace, or its span doesn't carry the identifying attribute, add the minimum needed to fix that: an attribute, or trace-context propagation, following that codebase's existing pattern. While adding instrumentation at a hop, add attributes generously for anything else relevant there, not just the bare minimum needed to make the hop findable.
7. Repeat steps 2–6 for each downstream hop, one hop at a time, until the flow is visible everywhere it needs to be.
8. Report the Honeycomb trace URL for the fully visible flow.
