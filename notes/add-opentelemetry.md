# Add OpenTelemetry Instrumentation to TypeScript Project

Please help me add OpenTelemetry instrumentation to my TypeScript Node.js project to send telemetry data to Honeycomb. Follow these specific requirements:

## Installation Requirements

1. Install the required OpenTelemetry packages:
   - `@opentelemetry/auto-instrumentations-node` - for automatic instrumentation
   - `@opentelemetry/sdk-node` - core SDK
   - `@opentelemetry/exporter-trace-otlp-http` - HTTP trace exporter
   - `@opentelemetry/api` - for custom instrumentation
   - Install `ts-node` as a dev dependency if not already present

## Setup Tasks

1. **Create tracing initialization file** (`tracing.ts`):

   - Import NodeSDK, OTLPTraceExporter, and getNodeAutoInstrumentations
   - Configure NodeSDK with:
     - OTLPTraceExporter as the trace exporter
     - Auto-instrumentations with fs instrumentation disabled (it's noisy during startup)
   - Call `sdk.start()` to initialize

2. **Environment configuration**:

   - Create or update `.env` file with these variables:
     ```
     OTEL_SERVICE_NAME="your-service-name"
     OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
     OTEL_EXPORTER_OTLP_ENDPOINT="https://api.honeycomb.io:443"
     OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=$HONEYCOMB_API_KEY"
     ```
   - Add `.env` to `.gitignore` if not already there
   - Replace placeholder value with appropriate service name

3. **Package.json updates**:
   - Add/update start scripts to include the tracing file:
     - eg, for development: `ts-node -r ./tracing.ts src/index.ts`
     - Adjust the main file path as needed for my project structure

## Additional Considerations

- ask the user to set $HONEYCOMB_API_KEY in their environment
- Show how to run the application with tracing enabled

Please analyze my current project structure and adapt these instructions accordingly. If you need to see specific files or the current package.json, let me know what information would be helpful.
