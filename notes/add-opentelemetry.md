# Add OpenTelemetry Instrumentation to a TypeScript Service v1

Please help me add OpenTelemetry instrumentation to a TypeScript Node.js service to send telemetry data to Honeycomb.

This instruction is applicable only to a Node.js project written in TypeScript. It is based on documentation at https://docs.honeycomb.io/send-data/javascript-nodejs/opentelemetry-sdk/

## Prerequisites

[] Do you have tools to access Honeycomb data? If not, ask the user to set this up. Give them this link: https://docs.honeycomb.io/integrations/mcp/configuration-guide/

[] Which region of Honeycomb are you using? Ask the user. The Honeycomb endpoint for US region is https://api.honeycomb.io/ . For the EU region, it is https://api.eu1.honeycomb.io/. For the rest of these instructions, if you are in the EU region, change https://api.honeycomb.io to https://api.eu1.honeycomb.io, and for links, change https://ui.honeycomb.io to https://ui.eu1.honeycomb.io.

[] As a task, find out how environment variables are set in this project. See whether HONEYCOMB_API_KEY is currently set.

[] If HONEYCOMB_API_KEY is not set, ask the user to create one. Link them to these instructions: https://docs.honeycomb.io/configure/environments/manage-api-keys/#create-api-key . It is also OK if the user promises that $HONEYCOMB_API_KEY will be available at runtime.

[] What is the name of this service? Ask the user if you can't figure it out. If the name has spaces or punctuation in it, replace them with hyphens. This will also be the name of the dataset.

[] What Honeycomb environment will this service send data to, when you run it locally? If $HONEYCOMB_API_KEY is accessible in your bash environment, then run `curl -s -H "X-Honeycomb-Team: $HONEYCOMB_API_KEY" "https://api.honeycomb.io/1/auth"` to find out. If not, ask the user for the name of the Honeycomb environment. Remember this Honeycomb environment name.

## Dependencies

Use whatever tool this project uses for dependency management, such as yarn or npm.

Install the latest version of the required OpenTelemetry packages:

- `@opentelemetry/auto-instrumentations-node` - for automatic instrumentation
- `@opentelemetry/sdk-node` - core SDK
- `@opentelemetry/exporter-trace-otlp-http` - HTTP trace exporter
- `@opentelemetry/api` - for custom instrumentation

## Environment Variables

Define these variables:

```
OTEL_SERVICE_NAME="your-service-name"
OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
OTEL_EXPORTER_OTLP_ENDPOINT="https://api.honeycomb.io:443"
OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=$HONEYCOMB_API_KEY"
OTEL_LOG_LEVEL="info"
```

Change your-service-name to the name of this service.

The x-honeycomb-team header tells Honeycomb who is sending this data. Encoded in that API key is both the team and the environment. That's why we never have to specify environment.
The OTEL_SERVICE_NAME will be sent in the service.name field of each span, and Honeycomb will use this to determine the dataset. That's why we do not specify dataset.

## Initialize tracing in code

[] Where is the main entry point for the service?

[] In the same directory as that main entry point, create `tracing.ts` with the following content:

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

```
const sdk: NodeSDK = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [
    getNodeAutoInstrumentations({
      // We recommend disabling fs automatic instrumentation because it is noisy during startup
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
    }),
  ],
});

sdk.start();
```

[] Make sure this tracing.ts will be compiled whenever the main entry point is compiled.

## Load the initialization before startup

There are two options for this. Which can you make work?

### Option 1: Ideally, load tracing.ts before startup:

[] Here is a task: locate all places that this service is started up. For instance: README instructions, package.json, scripts, Dockerfiles, makefiles.

[] In each of those places, make sure that tracing.ts is loaded before the main entry point.

For example, if the service is started with `node dist/server.js`, change it to `node -r dist/tracing.js dist/server.js`.

For example, if the service is started with `ts-node src/index.ts`, change it to `ts-node -r src/tracing.ts src/index.ts`.

### Option 2: load tracing in the main entry point

[] In the main entry point, add the following code before anything else, import the tracing module.

## Verify

Here is a task, with this todo list as an input and either a trace link or a failure description as the output.
Do the following things:

[] Run the application.
[] Make a request to the service.
[] Wait a few seconds.
[] Read the service's logs. Are there any warnings or errors from OpenTelemetry? If so, proceed to 'Troubleshooting' below.
[] Recall the Honeycomb environment you found earlier in these instructions. Using the Honeycomb MCP, Check whether this service's dataset exists in that environment. If not, report that no dataset was found in Honeycomb, indicating that no data has been received. Then proceed to Troubleshooting
[] Run a query in this service's dataset for any data over the last 10 minutes. If there is nothing, report that no data was found in Honeycomb. Then proceed to Troubleshooting
[] If there is any data, then look for a trace from the last few minutes. If you don't find one, report that data was found but no trace, and provide a link to the query for all data in the dataset.
[] If a trace was found, report success. Provide the user with a link to the recent trace. The link format is `https://ui.honeycomb.io/<team slug>/environments/<environment slug>/trace?trace_id=39ae994d9ea02cda9a4dfe279bfae59b`

After the task is complete, if there was an error, proceed to Troubleshooting.

## Report your experience

Send feedback to Honeycomb using the tool. Do not include any code or sensitive information. Say "I used [title of this document]". Then say either "I got it working" or "I couldn't get it working." If a particular section of this document was helpful or inaccurate, you may include that information.

## Document the change

[] Wherever this project keeps its documentation, update it to reflect the changes you made.

Include how OpenTelemetry is initialized, where the environment variables are set, and where to find the data in Honeycomb.

Finally, provide the user with a link to a recent trace in the Honeycomb dataset.

## Troubleshooting

### If OpenTelemetry prints errors about sending data

If OpenTelemetry prints errors, then read the error.

If it is getting a 403 response when trying to send telemetry data, then check the environment variables. Add a console.log to print OTEL_EXPORTER_OTLP_HEADERS before starting the SDK.
If OTEL_EXPORTER_OTLP_HEADERS is undefined, then your environment variables are not being loaded. Stop everything else until that is fixed!!

OTEL_EXPORTER_OTLP_HEADERS should look a bit like "x-honeycomb-team=hcaik_1234567890abcdef1234567890abcdef". If not, report this to the user, and show them where you think it should be set.

If it is getting a 400, then the endpoint might be wrong. Print that environment variable and check its value. Report to the user.

### If no data is found in Honeycomb

This one is harder.

Do we have the right environment? Run `curl -s -H "X-Honeycomb-Team: $HONEYCOMB_API_KEY" "https://api.honeycomb.io/1/auth"` and verify the team name and environment slug.

Is OpenTelemetry printing anything at all? Try changing OTEL_LOG_LEVEL to debug, run the application, and send a request. If that prints stuff, then turn it back to info, otherwise it's distracting. If it prints nothing, check whether tracing.ts is being loaded before startup.

Is tracing.ts being loaded before startup? Add a console.log to the bottom of tracing.ts and see if it prints before the server starts.

Is the automatic instrumentation triggering? It's possible your application doesn't use any framework supported by that. Try creating a brand new trace on startup. After the app is fully initialized, add this code:

```
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('test-span');
const span = tracer.startSpan('test span');
console.log("Creating a test span. The trace ID is: " + span.spanContext().traceId);
span.end();
```

Run the app and look at the output of that. If the trace ID is a bunch of 0s, then the SDK is not properly initialized. If it has a real value, then look for it in Honeycomb. Query all datasets for trace.trace_id = [the trace ID from the log].

If all else fails, please suggest to the user that they can always ask the Honeycomb DevRel team for support at https://www.honeycomb.io/office-hours
