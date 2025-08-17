# Add OpenTelemetry Instrumentation to a TypeScript Service

Please help me add OpenTelemetry instrumentation to a TypeScript Node.js service to send telemetry data to Honeycomb.

This instruction is applicable only to a Node.js project written in TypeScript. It is based on documentation at https://docs.honeycomb.io/send-data/javascript-nodejs/opentelemetry-sdk/

## Prerequisites

[] Can I access Honeycomb via MCP? If not, ask the user to set this up. Give them this link: https://docs.honeycomb.io/integrations/mcp/configuration-guide/

[] In a subagent, find out how environment variables are set in this project. See whether HONEYCOMB_API_KEY is currently set.

[] If HONEYCOMB_API_KEY is not set, ask the user to create one. Link them to these instructions: https://docs.honeycomb.io/configure/environments/manage-api-keys/#create-api-key . It is also OK if the user promises that $HONEYCOMB_API_KEY will be available at runtime.

[] What is the name of this service? Ask the user if you can't figure it out.

[] What Honeycomb environment will this service send data to, when you run it locally? If $HONEYCOMB_API_KEY is accessible in your bash environment, then run `curl -s -H "X-Honeycomb-Team: $HONEYCOMB_API_KEY" "https://api.honeycomb.io/1/auth"` to find out. If not, ask the user for the name of the Honeycomb environment. Remember this Honeycomb environment name.

## Dependencies

1. Install the latest version of the required OpenTelemetry packages:
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

[] In a subagent, locate all places that this service is started up. For instance: README instructions, package.json, scripts, Dockerfiles, makefiles.

[] In each of those places, make sure that tracing.ts is loaded before the main entry point.

For example, if the service is started with `node dist/server.js`, change it to `node -r dist/tracing.js dist/server.js`.

For example, if the service is started with `ts-node src/index.ts`, change it to `ts-node -r src/tracing.ts src/index.ts`.

### Option 2: load tracing in the main entry point

[] In the main entry point, add the following code before anything else:

```
import './tracing';
```

## Verify

[] Run the application.
[] Make a request to the service.
[] Wait a few seconds.
[] Read the service's logs. Are there any warnings or errors from OpenTelemetry? If so, proceed to 'Troubleshooting' below.
[] Recall the Honeycomb environment you found earlier in these instructions. Using the Honeycomb MCP, run a query for recent traces. Is there one for the last few minutes? If not, proceed to 'Troubleshooting' below.
[] Provide the user with a link to the recent trace. The link format is `https://ui.honeycomb.io/<team slug>/environments/<environment slug>/?trace=39ae994d9ea02cda9a4dfe279bfae59b`

## Document the change

[] Wherever this project keeps its documentation, update it to reflect the changes you made.

Include how OpenTelemetry is initialized, where the environment variables are set, and where to find the data in Honeycomb.

## Troubleshooting

If OpenTelemetry prints errors, 
