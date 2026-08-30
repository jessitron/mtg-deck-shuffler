GOAL: Make a flow traceable end-to-end in Honeycomb, extending existing tracing incrementally, so its actual runtime behavior is visible for debugging.

1. Identify the trigger point of the flow — the first code that runs when it starts — and name a value that will uniquely identify one execution of it (an id already available at that point).
2. Query Honeycomb via the `honeycomb-modernity` MCP server for what tracing already exists at the trigger point: call `get_workspace_context`, then `list_spans` and `get_span_details` on the relevant dataset to find any existing span, attributes, and trace-context propagation already covering it.
3. If the trigger point's span is missing the identifying value as an attribute, add it there, following the codebase's existing pattern for adding span attributes — don't invent a new pattern if one already exists.
4. Trigger the flow once, in a way that produces one concrete execution.
5. Find that execution in Honeycomb, filtered by the identifying attribute (or by trace id if one is available).
6. Confirm the attribute from step 3 appears as expected. If it doesn't, fix the instrumentation and repeat from step 4.
7. Identify the next downstream hop in the flow — the next service, process, or async boundary it crosses — and check in Honeycomb whether a span already exists there carrying the same identifying attribute or trace id.
8. If that hop has no span, or its span doesn't carry the identifying attribute or doesn't propagate trace context, add the minimum needed to fix that — an attribute, or trace-context propagation — following that codebase's existing pattern for spans, attributes, and trace propagation.
9. Repeat steps 4–8 for each downstream hop, one hop at a time, until the flow is visible everywhere it needs to be.
10. Record the Honeycomb query or trace URL that shows the newly visible span, as evidence, at each point work is committed.
