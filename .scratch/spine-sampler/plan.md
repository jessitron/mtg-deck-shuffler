# Plan: head-sample /up health checks in the Spine

Mountain: overhead (telemetry hygiene, not a Mountain feature)

## Problem
`services/spine/config/initializers/opentelemetry.rb` sets no sampler, so it gets the
SDK's default (`ParentBased(root: ALWAYS_ON)`). k8s hits `GET /up` (liveness every 60s,
readiness every 30s — `services/spine/k8s/deployment.yaml`) which is a sizeable fraction
of all spine spans, skewing queries/BubbleUp toward probe noise instead of real
table/seat activity.

## Approach — port the Shuffler's BackgroundChatterSampler to Ruby

New file `services/spine/lib/telemetry_sampler.rb` (autoloaded via Zeitwerk —
`config.autoload_lib` is already on in `config/application.rb`, so no explicit
`require` needed):

```ruby
module TelemetrySampler
  CHATTER_SAMPLE_RATIO = 0.01
  PROBE_USER_AGENTS = ["kube-probe", "elb-healthchecker"].freeze
  PROBE_PATHS = ["/up", "/rails/health"].freeze

  def self.attribute_text(attributes, *keys) ... end   # reads http.user_agent OR
                                                          # user_agent.original, and
                                                          # http.target OR url.path
  def self.background_chatter?(attributes) ... end

  class BackgroundChatterSampler
    # duck-types OTel Ruby's Sampler interface: description, should_sample?(...)
    # delegates to TraceIdRatioBased(1.0) or TraceIdRatioBased(0.01)
  end
end
```

Wiring in `opentelemetry.rb`, added *after* `OpenTelemetry::SDK.configure do |c| ... end`
(confirmed by reading the installed opentelemetry-sdk 1.13.0 gem source — the
Configurator has no `sampler=`/`trace_config=` setter; `TracerProvider#sampler` is a
plain `attr_accessor` read fresh on every `start_span`, so setting it right after
`OpenTelemetry.tracer_provider = tracer_provider` runs inside `configure` is the
correct, supported way to override it):

```ruby
OpenTelemetry.tracer_provider.sampler = OpenTelemetry::SDK::Trace::Samplers.parent_based(
  root: TelemetrySampler::BackgroundChatterSampler.new
)
```

`ParentBased` still honors an incoming sampled W3C parent (e.g. a Shuffler-initiated
trace) — this only governs *root* sampling decisions, matching the Shuffler's own
`ParentBasedSampler({root: BackgroundChatterSampler})` wiring.

## What counts as "probe" traffic here
Checked `services/spine/k8s/deployment.yaml`: liveness + readiness both hit `GET /up`
only (no separate ALB health check — Spine is ClusterIP, ingress is elsewhere). Rails'
`rails/health#show` controller serves `/up` (`config/routes.rb`). k8s's default probe
sends `User-Agent: kube-probe/<version>`. Keeping `elb-healthchecker` in the list too,
mirroring the Shuffler, in case a load balancer probe is ever added in front of Spine.

Confirmed the attribute names by reading the installed `opentelemetry-instrumentation-
rack` 0.31.1 gem source directly (`middlewares/old/event_handler.rb#request_span_attributes`):
it sets `http.method`, `http.host`, `http.scheme`, `http.target` (path+query), and
`http.user_agent` (if present) as span-start attributes — the same old-style semconv
names the Shuffler's sampler already reads, plus the `url.path`/`user_agent.original`
stable fallback for the same "dependency bump can't silently break this" reason.

## Test
`services/spine/test/lib/telemetry_sampler_test.rb`, Minitest (matches
`test/models/table_test.rb` style — `require "test_helper"`, `class ...Test <
ActiveSupport::TestCase`). Mirrors the Shuffler's `test/telemetry-sampler.test.ts`
spirit:
- `background_chatter?` matches on kube-probe UA, elb-healthchecker UA (mixed case),
  the `/up` path regardless of UA, and does NOT match ordinary paths.
- Reads both semconv spellings (`http.target`/`url.path`, `http.user_agent`/
  `user_agent.original`).
- `BackgroundChatterSampler#should_sample?` across a spread of trace ids: keeps 100%
  of non-chatter, drops the great majority of `/up` chatter, but keeps > 0 (same
  spread-trace-id technique as the Shuffler test, ported to Ruby's 128-bit hex trace
  id strings).

Will confirm the test fails first (by asserting against a plain samplerless run is
awkward in Ruby SDK terms, so "fails first" here means: write the sampler test against
the not-yet-created class, watch it error with NameError, then implement).

## Owner concerns already incorporated (fleet-is-observable-context)
- Own module + own test file (not inlined into opentelemetry.rb). Done above.
- Read both semconv attribute spellings. Done.
- Keep a trickle (0.01), never zero. Done.
- 100% of everything else, unconditionally — no other throttling. Done.
- ParentBased-wrapped root sampler. Done.
- Will run fleet-is-observable-update afterward to add the Ruby row to the wiring
  table and record the Rack instrumentation's actual attribute names.
