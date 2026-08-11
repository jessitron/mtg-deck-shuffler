
require "opentelemetry/sdk"
require "opentelemetry/exporter/otlp"
require "opentelemetry/instrumentation/rack"

OpenTelemetry::SDK.configure do |c|
  c.service_name = ENV.fetch("OTEL_SERVICE_NAME", "mtg-spine")
  c.use "OpenTelemetry::Instrumentation::Rack"
end
