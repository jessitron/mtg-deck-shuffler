# A Table: somewhere to play. The Spine mints its id (a GUID) at creation; the
# name is a lookup alias, unique only among active tables — the thing you say
# over Discord. Owns the append-only event log.
class Table < ApplicationRecord
  class NameTaken < StandardError; end
  class SeatOccupied < StandardError; end

  has_many :seats, dependent: false
  has_many :events, dependent: false

  before_create { self.id ||= SecureRandom.uuid }

  scope :active, -> { where(status: "active") }

  # Creating a table IS an event: mints the tableId, appends table.created.
  def self.create_with_event!(name:, creator:, traceparent:)
    transaction do
      raise NameTaken, "an active table is already named #{name.inspect}" if active.exists?(name: name)
      table = create!(name: name)
      table.append_event!({
        "id" => SecureRandom.uuid,
        "tableId" => table.id,
        "name" => "table.created",
        "initiator" => { "playerName" => creator },
        "occurredIn" => "spine",
        "visibility" => "public",
        "traceparent" => traceparent,
        "schemaVersion" => 1,
        "payload" => { "name" => name, "creator" => creator }
      })
      table
    end
  rescue ActiveRecord::RecordNotUnique
    raise NameTaken, "an active table is already named #{name.inspect}"
  end

  # Take a seat (1-4). The Spine mints the seatId; sitting down IS an event.
  # Spectators never call this — they need nothing.
  def take_seat!(number:, player_name:, traceparent:)
    seat_id = SecureRandom.uuid
    append_event!({
      "id" => SecureRandom.uuid,
      "tableId" => id,
      "name" => "seat.taken",
      "initiator" => { "playerName" => player_name },
      "occurredIn" => "spine",
      "visibility" => "public",
      "traceparent" => traceparent,
      "schemaVersion" => 1,
      "payload" => { "seatId" => seat_id, "seat" => number, "playerName" => player_name }
    })
    seats.find(seat_id)
  end

  # The only way into the log. Validates against contracts/ (fail loudly),
  # dedups on the sender's event id, assigns seq and acceptedAt, and projects
  # seat.taken into the seats table. Append-only: nothing here ever updates.
  def append_event!(envelope)
    EventContract.validate!(envelope)
    unless envelope["tableId"] == id
      raise EventContract::Violation,
        "envelope tableId #{envelope['tableId'].inspect} does not match this table (#{id})"
    end

    event = transaction do
      duplicate = events.find_by(event_id: envelope["id"])
      next duplicate if duplicate

      check_domain_invariants!(envelope)
      events.create!(
        event_id: envelope["id"],
        seq: (events.maximum(:seq) || 0) + 1,
        name: envelope["name"],
        accepted_at: Time.current,
        occurred_at: envelope["occurredAt"],
        initiator: envelope["initiator"]["playerName"],
        occurred_in: envelope["occurredIn"],
        visibility: envelope["visibility"],
        traceparent: envelope["traceparent"],
        schema_version: envelope["schemaVersion"],
        payload: envelope["payload"]
      ).tap { |e| project!(e) }
    end

    record_span_attributes(event)
    event
  end

  private

  def check_domain_invariants!(envelope)
    if envelope["name"] == "seat.taken"
      number = envelope.dig("payload", "seat")
      if seats.exists?(number: number)
        raise SeatOccupied, "seat #{number} at table #{name.inspect} is already taken"
      end
    end
  end

  # Materialized views of the log. seat.taken → a Seat row.
  def project!(event)
    case event.name
    when "seat.taken"
      seats.create!(
        id: event.payload.fetch("seatId"),
        number: event.payload.fetch("seat"),
        player_name: event.payload.fetch("playerName")
      )
    end
  end

  # All the interesting info goes on the current span (the request span, since
  # inbound trace context is extracted by the Rack instrumentation).
  def record_span_attributes(event)
    attributes = {
      "table.id" => id,
      "table.name" => name,
      "event.id" => event.event_id,
      "event.name" => event.name,
      "event.seq" => event.seq,
      "event.initiator" => event.initiator,
      "event.occurred_in" => event.occurred_in
    }
    if (instance_id = event.payload.dig("card", "instanceId"))
      attributes["card.instance_id"] = instance_id
      attributes["card.scryfall_id"] = event.payload.dig("card", "scryfallId")
    end
    OpenTelemetry::Trace.current_span.add_attributes(attributes)
  end
end
