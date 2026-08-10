# Background chatter: requests that happen constantly and tell us nothing new when
# they succeed - health checks. k8s hits GET /up on a 30-60s cycle for liveness and
# readiness (see k8s/deployment.yaml), and it was roughly half of all Spine spans,
# skewing queries/BubbleUp toward probe noise instead of real table/seat activity.
# We head sample it hard rather than dropping it entirely - not zero, because we
# still want to see in Honeycomb that the health check is passing, and a FAILING
# probe stays visible either way.
#
# Ported from the Shuffler's apps/shuffler/src/telemetry-sampler.ts
# (BackgroundChatterSampler) - same ratio, same "trickle, not zero" reasoning.
module TelemetrySampler
  # How much background chatter we keep. Not zero: a failing probe should still show
  # up in Honeycomb rather than the health check just going silent.
  CHATTER_SAMPLE_RATIO = 0.01

  PROBE_USER_AGENTS = ["kube-probe", "elb-healthchecker"].freeze
  PROBE_PATHS = ["/up", "/rails/health"].freeze

  # Reads an attribute under both the old and stable OTel HTTP semantic conventions.
  # opentelemetry-instrumentation-rack 0.31.1 emits the http.* names today (confirmed
  # by reading request_span_attributes in the installed gem); reading url.path and
  # user_agent.original too means a dependency bump can't quietly stop this matching.
  def self.attribute_text(attributes, *keys)
    keys.each do |key|
      value = attributes[key]
      return value.to_s unless value.nil?
    end
    ""
  end

  def self.background_chatter?(attributes)
    user_agent = attribute_text(attributes, "http.user_agent", "user_agent.original").downcase
    return true if PROBE_USER_AGENTS.any? { |probe| user_agent.include?(probe) }

    # http.target carries the query string; the path alone decides.
    path = attribute_text(attributes, "http.target", "url.path").split("?").first.to_s.downcase
    return false if path.empty?

    PROBE_PATHS.include?(path)
  end

  # Samples background chatter down to CHATTER_SAMPLE_RATIO; keeps everything else.
  # Duck-types OpenTelemetry::SDK::Trace::Samplers' interface (description,
  # should_sample?). Wrap in OpenTelemetry::SDK::Trace::Samplers.parent_based(root:
  # ...) so a request that already carries a sampled parent isn't re-sampled down -
  # this only governs root sampling decisions.
  class BackgroundChatterSampler
    def initialize
      @everything = OpenTelemetry::SDK::Trace::Samplers.trace_id_ratio_based(1.0)
      @chatter = OpenTelemetry::SDK::Trace::Samplers.trace_id_ratio_based(CHATTER_SAMPLE_RATIO)
    end

    def description
      "TelemetrySampler::BackgroundChatterSampler"
    end

    def should_sample?(trace_id:, parent_context:, links:, name:, kind:, attributes:)
      sampler = TelemetrySampler.background_chatter?(attributes || {}) ? @chatter : @everything
      sampler.should_sample?(trace_id: trace_id, parent_context: parent_context, links: links, name: name, kind: kind, attributes: attributes)
    end
  end
end
