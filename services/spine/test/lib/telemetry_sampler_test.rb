require "test_helper"

class TelemetrySamplerTest < ActiveSupport::TestCase
  # -- background_chatter? -----------------------------------------------

  test "kube-probe user agent hitting /up" do
    assert TelemetrySampler.background_chatter?("http.user_agent" => "kube-probe/1.31", "http.target" => "/up")
  end

  test "elb-healthchecker user agent, mixed case" do
    # Regression guard: the Shuffler's sampler once lowercased the user agent and then
    # searched for "ELB-HealthChecker" (still mixed case) inside it, so it never matched.
    assert TelemetrySampler.background_chatter?("http.user_agent" => "ELB-HealthChecker/2.0", "http.target" => "/up")
  end

  test "the /up route, whatever is asking" do
    assert TelemetrySampler.background_chatter?("http.target" => "/up")
  end

  test "a probe user agent asking for anything at all" do
    assert TelemetrySampler.background_chatter?("http.user_agent" => "kube-probe/1.31", "http.target" => "/")
  end

  test "ordinary Spine traffic is not chatter" do
    ["/", "/admin/tables", "/tables/abc-123/events", "/tables/abc-123/seats"].each do |path|
      refute TelemetrySampler.background_chatter?("http.target" => path), "expected #{path} to not be chatter"
    end
  end

  test "a real browser hitting the admin screen" do
    refute TelemetrySampler.background_chatter?(
      "http.user_agent" => "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:153.0) Gecko/20100101 Firefox/153.0",
      "http.target" => "/admin/tables"
    )
  end

  test "a span with no HTTP attributes at all (an internal span)" do
    refute TelemetrySampler.background_chatter?({})
  end

  test "a cache-busting query string does not hide the path" do
    assert TelemetrySampler.background_chatter?("http.target" => "/up?check=1")
  end

  test "reads the stable url.path attribute too" do
    assert TelemetrySampler.background_chatter?("url.path" => "/up")
  end

  test "reads the stable user_agent.original attribute too" do
    assert TelemetrySampler.background_chatter?("user_agent.original" => "ELB-HealthChecker/2.0")
  end

  # -- BackgroundChatterSampler --------------------------------------------

  # A spread of trace ids across the low-64-bits id space that TraceIdRatioBased
  # actually compares against the ratio threshold (trace_id[8, 8] - the last 8 bytes).
  # A run of sequential/similar ids would all land on the same side and make the test
  # look like nothing (or everything) is kept, so scatter them: multiplying by Knuth's
  # constant twice pushes the product past 2**64 and lets the modulo wrap it around
  # several times, spreading values across the full range - deterministically, no
  # randomness, so the test isn't flaky.
  KNUTH = 2654435761
  TRACE_IDS = (1..2000).map do |i|
    ((i * KNUTH * KNUTH) % (2**64)).to_s(16).rjust(32, "0")
  end.freeze

  def sample_decision(sampler, attributes, trace_id)
    sampler.should_sample?(
      trace_id: [trace_id].pack("H*"),
      parent_context: OpenTelemetry::Context.empty,
      links: [],
      name: "GET",
      kind: :server,
      attributes: attributes
    )
  end

  def kept_count(attributes)
    sampler = TelemetrySampler::BackgroundChatterSampler.new
    TRACE_IDS.count { |id| sample_decision(sampler, attributes, id).sampled? }
  end

  test "records everything that is not chatter" do
    assert_equal TRACE_IDS.length, kept_count("http.target" => "/tables/abc-123/events")
  end

  test "drops the great majority of /up chatter" do
    assert_operator kept_count("http.target" => "/up"), :<, TRACE_IDS.length * 0.05
  end

  test "but keeps some chatter, so a failing probe is still visible" do
    assert_operator kept_count("http.target" => "/up"), :>, 0
  end
end
