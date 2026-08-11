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
  def valid_envelope(overrides = {})
    {
      "id" => SecureRandom.uuid,
      "tableId" => "some-table-id",
      "name" => "table.created",
      "initiator" => { "playerName" => "Jess" },
      "occurredIn" => "shuffler",
      "origin" => "shuffler.test",
      "significance" => "administrative",
      "visibility" => "public",
      "schemaVersion" => 1,
      "payload" => { "name" => "kitchen table", "creator" => "Jess" }
    }.merge(overrides)
  end
end

Minitest::Test.include(ClearsTablesBetweenTests)
Minitest::Test.include(ValidEnvelope)
