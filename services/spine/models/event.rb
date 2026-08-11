require "json"
require "time"

module Spine
  class Event < Sequel::Model(:events)
    many_to_one :table

    # The envelope this row represents, contract-shaped (envelope.v3.json).
    def as_envelope
      {
        "id" => event_id,
        "tableId" => table_id,
        "seq" => seq,
        "name" => name,
        "acceptedAt" => accepted_at.utc.iso8601(3),
        "occurredAt" => occurred_at&.utc&.iso8601(3),
        "initiator" => { "playerName" => initiator },
        "occurredIn" => occurred_in,
        "origin" => origin,
        "significance" => significance,
        "visibility" => visibility,
        "schemaVersion" => schema_version,
        "payload" => JSON.parse(payload)
      }.compact
    end
  end
end
