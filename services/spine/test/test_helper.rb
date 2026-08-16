ENV["RACK_ENV"] ||= "test"
ENV["SPINE_DB_PATH"] ||= ":memory:"

require "minitest/autorun"
require "rack/test"

require_relative "../app"

module ClearsTablesBetweenTests
  def before_setup
    super
    DB[:events].delete
    DB[:seats].delete
    DB[:tables].delete
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

Minitest::Test.include(ClearsTablesBetweenTests)
Minitest::Test.include(ValidEnvelope)
