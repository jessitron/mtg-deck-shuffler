require "json"
require "time"

module Spine
  class Event < Sequel::Model(:events)
    many_to_one :table

    # The envelope this row represents, contract-shaped (envelope.v1.json).
    # No `traceparent`: it's observability-only and never persisted — `Table#broadcast`
    # attaches a live one when this envelope goes out over the SSE stream.
    def as_envelope
      canonical_initiator = { "playerName" => initiator }
      canonical_initiator["seatId"] = initiator_seat_id if initiator_seat_id

      {
        "id" => event_id,
        "tableId" => table_id,
        "seq" => seq,
        "name" => name,
        "acceptedAt" => accepted_at.utc.iso8601(3),
        "occurredAt" => occurred_at&.utc&.iso8601(3),
        "initiator" => canonical_initiator,
        "occurredIn" => occurred_in,
        "origin" => origin,
        "significance" => significance,
        "schemaVersion" => schema_version,
        "payload" => JSON.parse(payload)
      }.compact
    end
  end
end
