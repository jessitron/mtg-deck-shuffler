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
require_relative "../../lib/telemetry_sampler"

OpenTelemetry::SDK.configure do |c|
  c.service_name = ENV.fetch("OTEL_SERVICE_NAME", "spine")
  c.use_all # rails, rack, active_record, etc.
end

# Head-sample health check chatter (GET /up) so BubbleUp and queries aren't dominated
# by k8s liveness/readiness probes; see lib/telemetry_sampler.rb. There's no in-block
# sampler= option on the Configurator for a custom Sampler object (confirmed by reading
# the installed opentelemetry-sdk gem: Configurator#configure has no sampler setter,
# but TracerProvider#sampler is a plain attr_accessor read fresh on every start_span),
# so the supported way to install a custom root sampler is to set it right after
# `configure` runs, once OpenTelemetry.tracer_provider exists.
OpenTelemetry.tracer_provider.sampler = OpenTelemetry::SDK::Trace::Samplers.parent_based(
  root: TelemetrySampler::BackgroundChatterSampler.new
)
