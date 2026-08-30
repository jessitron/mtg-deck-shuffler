GOAL: Make a flow traceable end-to-end in Honeycomb, extending existing tracing incrementally, so its actual runtime behavior is visible for debugging.

1. Identify the trigger point of the flow — the first code that runs when it starts — and name a value that will uniquely identify one execution of it (an id already available at that point).

@AI: If there isn't a way to identify that entry point, add one? ... oh I see you put that in 3, weird

2. Query Honeycomb via the `honeycomb-modernity` MCP server for what tracing already exists at the trigger point: call `get_workspace_context`, then `list_spans` and `get_span_details` on the relevant dataset to find any existing span, attributes, and trace-context propagation already covering it.

@AI: you may need to run a manual test to generate a trace before you can find it.

3. If the trigger point's span is missing the identifying value as an attribute, add it there, following the codebase's existing pattern for adding span attributes — don't invent a new pattern if one already exists.

4. Trigger the flow once, in a way that produces one concrete execution.

@AI: this (step 4) should be first. Trigger it, then see if you can find it.

5. Find that execution in Honeycomb, filtered by the identifying attribute (or by trace id if one is available).

@AI: Sometimes the trick is to get the app to print out the trace ID, in debug mode. Doesn't that sound useful? This is an alternative to "identifying attribute" which sometimes is hard.

6. Confirm the attribute from step 3 appears as expected. If it doesn't, fix the instrumentation and repeat from step 4.
7. Identify the next downstream hop in the flow — the next service, process, or async boundary it crosses — and check in Honeycomb whether a span already exists there carrying the same identifying attribute or trace id.

@AI: it should be in the same trace.

8. If that hop has no span, or its span doesn't carry the identifying attribute or doesn't propagate trace context, add the minimum needed to fix that — an attribute, or trace-context propagation — following that codebase's existing pattern for spans, attributes, and trace propagation.

@AI: Gratuitously add relevant attributes.

9. Repeat steps 4–8 for each downstream hop, one hop at a time, until the flow is visible everywhere it needs to be.
10. Record the Honeycomb query or trace URL that shows the newly visible span, as evidence, at each point work is committed.

@AI: don't forget to give me the link to the trace. You can be proud of how informative it is now.
