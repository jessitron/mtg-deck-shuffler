# OTel wiring — mandatory from the first commit, 100% sampling.
#
# No BackgroundChatterSampler-style down-sampling: the old Rails Spine's health-check
# sampler is documented as broken and deliberately not ported. Revisit sampling once
# this app's start/stop behavior is confirmed clean.

require "opentelemetry/sdk"
require "opentelemetry/exporter/otlp"
require "opentelemetry/instrumentation/rack"

OpenTelemetry::SDK.configure do |c|
  c.service_name = ENV.fetch("OTEL_SERVICE_NAME", "mtg-spine")
  c.use "OpenTelemetry::Instrumentation::Rack"
end
