# Builders for valid contract envelopes, for tests. Real schemas, real
# validation — no mocks anywhere (repo rule: fakes only, and here we don't
# even need a fake; the contracts/ files themselves are the collaborator).
module Envelopes
  def valid_traceparent
    "00-#{SecureRandom.hex(16)}-#{SecureRandom.hex(8)}-01"
  end

  def card_played_envelope(table, overrides = {})
    {
      "id" => SecureRandom.uuid,
      "tableId" => table.id,
      "name" => "card.played",
      "initiator" => "seat 2",
      "occurredIn" => "shuffler",
      "visibility" => "public",
      "traceparent" => valid_traceparent,
      "schemaVersion" => 1,
      "payload" => {
        "card" => {
          "scryfallId" => SecureRandom.uuid,
          "instanceId" => SecureRandom.uuid
        },
        "face" => "front",
        "seat" => 2,
        "zoneHint" => "stack",
        "owner" => SecureRandom.uuid,
        "isCommander" => false
      }
    }.merge(overrides)
  end

  def seat_joined_envelope(table, payload_overrides = {})
    {
      "id" => SecureRandom.uuid,
      "tableId" => table.id,
      "name" => "seat.joined",
      "initiator" => "Jess",
      "occurredIn" => "shuffler",
      "visibility" => "public",
      "traceparent" => valid_traceparent,
      "schemaVersion" => 1,
      "payload" => {
        "seatId" => SecureRandom.uuid,
        "playerName" => "Jess",
        "deckName" => "Blame Game",
        "playmatImageUrl" => "https://example.com/playmat.png",
        "cardBackImageUrl" => "https://example.com/card-back.jpg"
      }.merge(payload_overrides).compact
    }
  end

  def seat_taken_envelope(table, overrides = {})
    {
      "id" => SecureRandom.uuid,
      "tableId" => table.id,
      "name" => "seat.taken",
      "initiator" => "Jess",
      "occurredIn" => "shuffler",
      "visibility" => "public",
      "traceparent" => valid_traceparent,
      "schemaVersion" => 1,
      "payload" => {
        "seatId" => SecureRandom.uuid,
        "seat" => 1,
        "playerName" => "Jess"
      }
    }.merge(overrides)
  end
end
