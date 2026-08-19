ENV["RACK_ENV"] ||= "test"
ENV["SPINE_DB_PATH"] ||= ":memory:"
ENV.delete("TABLETOP_URL")
ENV["TABLETOP_PUBLIC_URL"] = "http://table.example"

require "minitest/autorun"
require "rack/test"

require_relative "../app"
require_relative "support/fake_tabletop_server"

module ClearsTablesBetweenTests
  def before_setup
    super
    DB[:events].delete
    DB[:seats].delete
    DB[:tables].delete
  end
end

# Captures finished spans in-memory so tests can assert on span attributes
# (e.g. the game.id/seat.id correlation stamped on the /join span) without
# talking to a real OTLP collector. Added alongside whatever exporter
# config/telemetry.rb already configured; it only ever adds spans, never
# blocks the app's own export.
SPAN_EXPORTER = OpenTelemetry::SDK::Trace::Export::InMemorySpanExporter.new
OpenTelemetry.tracer_provider.add_span_processor(
  OpenTelemetry::SDK::Trace::Export::SimpleSpanProcessor.new(SPAN_EXPORTER)
)

module CapturesSpans
  def before_setup
    super
    SPAN_EXPORTER.reset
  end

  def finished_spans
    SPAN_EXPORTER.finished_spans
  end
end

module ValidEnvelope
  # "table.created" isn't used here on purpose: it's Spine-internal (minted by
  # `mint_event!`, never sent over the wire), so it has no contracts/payloads/ schema
  # for these externally-POSTed test envelopes to validate against. seat.joined is a
  # real wire event with a minimal required payload (`deckName`).
  def valid_envelope(overrides = {})
    {
      "id" => SecureRandom.uuid,
      "tableId" => "some-table-id",
      "name" => "seat.joined",
      "initiator" => { "playerName" => "Jess" },
      "occurredIn" => "shuffler",
      "origin" => "shuffler.test",
      "significance" => "administrative",
      "schemaVersion" => 1,
      "payload" => { "deckName" => "Test Deck" }
    }.merge(overrides)
  end
end

module JoinRequests
  def valid_join(overrides = {})
    {
      "gameId" => SecureRandom.uuid,
      "name" => "kitchen table #{SecureRandom.uuid}",
      "playerName" => "Jess",
      "deckName" => "Test Deck"
    }.merge(overrides)
  end

  def post_join(overrides = {}, path: "/join", **keyword_overrides)
    body = overrides.merge(keyword_overrides.transform_keys(&:to_s))
    post path, JSON.generate(valid_join(body)), "CONTENT_TYPE" => "application/json"
  end

  def with_env(values)
    previous = values.to_h { |key, _value| [key, ENV[key]] }
    values.each { |key, value| value.nil? ? ENV.delete(key) : ENV[key] = value }
    yield
  ensure
    previous.each { |key, value| value.nil? ? ENV.delete(key) : ENV[key] = value }
  end
end

Minitest::Test.include(ClearsTablesBetweenTests)
Minitest::Test.include(ValidEnvelope)
Minitest::Test.include(JoinRequests)
Minitest::Test.include(CapturesSpans)
