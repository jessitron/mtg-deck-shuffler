
require "opentelemetry/sdk"
require "opentelemetry/exporter/otlp"
require "opentelemetry/instrumentation/rack"

OpenTelemetry::SDK.configure do |c|
  c.service_name = ENV.fetch("OTEL_SERVICE_NAME", "mtg-spine")
  c.use "OpenTelemetry::Instrumentation::Rack"
end

class KeepItDownSampler
  def should_sample?(trace_id:, parent_context:, links:, name:, kind:, attributes:)
    if attributes && attributes["url.path"] == "/spine/up"
      sample_rate = 0.01;
      
    else
      sample_rate = 1.0;
    end
    attributes["sample_rate"] = sample_rate
    return  OpenTelemetry::SDK::Trace::Samplers.trace_id_ratio_based(sample_rate).should_sample?(trace_id: trace_id, parent_context: parent_context, links: links, name: name, kind: kind, attributes: attributes)
  end

  def description
    "KeepItDownSampler (1% of /spine/up, 100% of everything else)"
  end
end

OpenTelemetry.tracer_provider.sampler = KeepItDownSampler.new()
