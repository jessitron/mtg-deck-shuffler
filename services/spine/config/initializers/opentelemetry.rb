# Observability is mandatory, from the first commit.
#
# Exports OTLP to Honeycomb. Configuration comes from the standard OTEL_* env
# vars (see .env — and .be must be sourced FIRST, or the API key interpolates
# empty and export silently 401s). Inbound W3C trace context is extracted by the
# Rack instrumentation, so a Shuffler-initiated trace continues through event
# ingestion here.
#
# In test, no endpoint/key is configured; the SDK exports nowhere and that's fine.

require "opentelemetry/sdk"
require "opentelemetry/exporter/otlp"
require "opentelemetry/instrumentation/rails"
require "opentelemetry/instrumentation/rack"

OpenTelemetry::SDK.configure do |c|
  c.service_name = ENV.fetch("OTEL_SERVICE_NAME", "spine")
  c.use_all # rails, rack, active_record, etc.
end
