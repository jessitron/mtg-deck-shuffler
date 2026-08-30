GOAL: Make a flow traceable end-to-end in Honeycomb, extending existing tracing incrementally, so its actual runtime behavior is visible for debugging.

1. Identify the trigger point of the flow — the first code that runs when it starts.
2. Trigger the flow once, in a way that produces one concrete execution.
3. Try to find that execution in Honeycomb: filter by an identifying attribute already on the trigger point's span if one exists, or by a trace id the app printed in debug mode at trigger time, or by browsing the most recent spans on the relevant dataset.
4. If you can't find it, or the span you found carries no way to identify this specific execution, add one at the trigger point — an attribute carrying an id already available there, or a debug-mode trace-id print. Then check whether that span, or a child span in the same service, tells you what the flow is trying to do, not just that it happened; if not, add the attributes that would. Repeat steps 2–4 until the execution is reliably findable and self-explanatory.
5. Identify the next downstream hop in the flow — the next service, process, or async boundary it crosses — and check whether a span for it already exists in the same trace as the trigger point's span.
6. If that hop has no span in the same trace, or its span doesn't carry the identifying attribute, add as needed to fix that: attributes, or trace-context propagation, following that codebase's existing pattern. Check whether that hop's span, or a child span in the same service, tells you what it's doing at this hop, not just that it happened; add attributes generously until it does.
7. Repeat steps 2–6 for each downstream hop, one hop at a time, until the flow is visible through all services involved and everything the user can see is documented in the trace.
8. Report the Honeycomb trace URL for the fully visible flow.
