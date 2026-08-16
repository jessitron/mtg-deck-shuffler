require "json"
require "securerandom"
require "time"

require_relative "../lib/event_contract"
require_relative "../lib/table_broadcaster"

module Spine
  class Table < Sequel::Model(:tables)
    unrestrict_primary_key

    class NameTaken < StandardError; end
    class SeatOccupied < StandardError; end
    class TableFull < StandardError; end

    SEAT_NUMBERS = (1..4).freeze

    one_to_many :seats, key: :table_id
    one_to_many :events, key: :table_id

    def self.join!(name:, game_id:, player_name:, decoration:)
      DB.transaction do
        existing = Seat.first(game_id: game_id)
        next replay_outcome(existing) if existing

        table = first(name: name)
        created = table.nil?
        candidate = table || new(id: SecureRandom.uuid, name: name)
        preparation = candidate.send(:prepare_seat, game_id: game_id,
          player_name: player_name, decoration: decoration)
        table ||= create_with_event!(id: candidate.id, name: name, creator: player_name)
        seat = table.take_seat!(game_id: game_id, player_name: player_name,
          decoration: decoration, preparation: preparation)
        join_outcome(table, seat, created: created, replayed: false)
      end
    rescue Sequel::UniqueConstraintViolation
      existing = Seat.first(game_id: game_id)
      raise unless existing

      replay_outcome(existing)
    end

    def self.create_with_event!(name:, creator:, id: SecureRandom.uuid)
      DB.transaction do
        table = create(id: id, name: name)
        table.mint_event!(
          name: "table.created",
          initiator: creator,
          origin: "spine.tableLookupMiss",
          significance: "administrative",
          payload: { "name" => name, "creator" => creator }
        )
        table
      end
    rescue Sequel::UniqueConstraintViolation
      raise NameTaken, "an active table is already named #{name.inspect}"
    end

    def take_seat!(game_id:, player_name:, decoration:, number: nil, preparation: nil)
      preparation ||= prepare_seat(game_id: game_id, player_name: player_name,
        decoration: decoration, number: number)

      DB.transaction do
        if seats_dataset.where(number: preparation[:number]).any?
          raise SeatOccupied, "seat #{preparation[:number]} at table #{name.inspect} is already taken"
        end

        seat = Seat.create(
          id: preparation[:seat_id], table_id: id, number: preparation[:number],
          player_name: player_name, game_id: game_id
        )
        persist_envelope!(preparation[:taken])
        persist_envelope!(preparation[:joined])
        seat
      end
    end

    def append_event!(envelope)
      EventContract.validate!(envelope)
      if envelope["tableId"] != id
        raise EventContract::Violation,
          "envelope tableId #{envelope["tableId"].inspect} does not match this table (#{id})"
      end

      DB.transaction do
        duplicate = events_dataset.first(event_id: envelope["id"])
        next { event: duplicate, duplicate: true } if duplicate

        event = Event.create(
          event_id: envelope["id"],
          table_id: id,
          seq: next_seq,
          name: envelope["name"],
          initiator: envelope["initiator"]["playerName"],
          initiator_seat_id: envelope["initiator"]["seatId"],
          occurred_in: envelope["occurredIn"],
          origin: envelope["origin"],
          significance: envelope["significance"],
          schema_version: envelope["schemaVersion"],
          payload: JSON.generate(envelope["payload"]),
          occurred_at: envelope["occurredAt"] && Time.parse(envelope["occurredAt"]),
          accepted_at: Time.now.utc
        )
        broadcast(event)
        { event: event, duplicate: false }
      end
    rescue Sequel::UniqueConstraintViolation
      duplicate = events_dataset.first(event_id: envelope["id"])
      raise unless duplicate

      { event: duplicate, duplicate: true }
    end

    def mint_event!(name:, initiator:, origin:, significance:, payload:)
      player_name, seat_id = initiator_values(initiator)
      event = Event.create(
        event_id: SecureRandom.uuid,
        table_id: id,
        seq: next_seq,
        name: name,
        initiator: player_name,
        initiator_seat_id: seat_id,
        occurred_in: "spine",
        origin: origin,
        significance: significance,
        schema_version: 1,
        payload: JSON.generate(payload),
        accepted_at: Time.now.utc
      )
      broadcast(event)
      event
    end

    private

    def self.join_outcome(table, seat, created:, replayed:)
      joined_event = Event.where(table_id: table.id, name: "seat.joined",
        initiator_seat_id: seat.id).order(:seq).first
      {
        table_id: table.id,
        table_name: table.name,
        seat_number: seat.number,
        joined_event: joined_event,
        created: created,
        replayed: replayed
      }
    end

    def self.replay_outcome(seat)
      table = Table[seat.table_id]
      join_outcome(table, seat, created: false, replayed: true)
    end

    def prepare_seat(game_id:, player_name:, decoration:, number: nil)
      number ||= next_available_seat_number
      if seats_dataset.where(number: number).any?
        raise SeatOccupied, "seat #{number} at table #{name.inspect} is already taken"
      end

      seat_id = SecureRandom.uuid
      initiator = { "seatId" => seat_id, "playerName" => player_name }
      common = {
        "tableId" => id,
        "initiator" => initiator,
        "occurredIn" => "spine",
        "significance" => "administrative",
        "schemaVersion" => 1
      }
      taken = common.merge(
        "id" => SecureRandom.uuid,
        "name" => "seat.taken",
        "origin" => "spine.seatTaken",
        "payload" => { "seatId" => seat_id, "seat" => number, "playerName" => player_name }
      )
      joined = common.merge(
        "id" => SecureRandom.uuid,
        "name" => "seat.joined",
        "origin" => "spine.seatJoined",
        "payload" => decoration
      )
      EventContract.validate!(taken)
      EventContract.validate!(joined)
      { seat_id: seat_id, number: number, taken: taken, joined: joined }
    end

    def persist_envelope!(envelope)
      event = Event.create(
        event_id: envelope["id"],
        table_id: id,
        seq: next_seq,
        name: envelope["name"],
        initiator: envelope["initiator"]["playerName"],
        initiator_seat_id: envelope["initiator"]["seatId"],
        occurred_in: envelope["occurredIn"],
        origin: envelope["origin"],
        significance: envelope["significance"],
        schema_version: envelope["schemaVersion"],
        payload: JSON.generate(envelope["payload"]),
        occurred_at: envelope["occurredAt"] && Time.parse(envelope["occurredAt"]),
        accepted_at: Time.now.utc
      )
      broadcast(event)
      event
    end

    def initiator_values(initiator)
      return [initiator["playerName"], initiator["seatId"]] if initiator.is_a?(Hash)

      [initiator, nil]
    end

    def broadcast(event)
      carrier = {}
      OpenTelemetry.propagation.inject(carrier)
      envelope = event.as_envelope.merge("traceparent" => carrier["traceparent"]).compact
      message = { event: envelope }
      DB.after_commit { Spine.broadcaster.publish(id, message) }
    end

    def next_seq
      (events_dataset.max(:seq) || 0) + 1
    end

    def next_available_seat_number
      taken = seats_dataset.select_map(:number)
      available = SEAT_NUMBERS.find { |n| !taken.include?(n) }
      raise TableFull, "table #{name.inspect} already has 4 seats taken" if available.nil?

      available
    end
  end
end
