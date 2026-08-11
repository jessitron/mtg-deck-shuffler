require "json"
require "securerandom"

module Spine
  # A Table: somewhere to play. The Spine mints its id (a GUID) at creation;
  # the name is a lookup alias, unique among active tables — the thing you
  # say over Discord. Owns the append-only event log via table.created and
  # seat.taken (the only events this ticket mints).
  class Table < Sequel::Model(:tables)
    unrestrict_primary_key

    class NameTaken < StandardError; end
    class SeatOccupied < StandardError; end
    class TableFull < StandardError; end

    SEAT_NUMBERS = (1..4).freeze

    one_to_many :seats, key: :table_id
    one_to_many :events, key: :table_id

    # Join by name: find the active table or create it, then take a seat.
    # This is the one thing the Shuffler calls — it never orchestrates
    # create-then-join itself.
    def self.join!(name:, player_name:)
      table = first(name: name)
      created = table.nil?
      table ||= create_with_event!(name: name, creator: player_name)
      seat = table.take_seat!(player_name: player_name)
      { table_id: table.id, seat_number: seat.number, created: created }
    end

    def self.create_with_event!(name:, creator:)
      DB.transaction do
        table = create(id: SecureRandom.uuid, name: name)
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

    # Take a seat (1-4). The Spine mints the seatId and, when the caller
    # doesn't name one, the seat number itself.
    def take_seat!(player_name:, number: nil)
      DB.transaction do
        number ||= next_available_seat_number
        if seats_dataset.where(number: number).any?
          raise SeatOccupied, "seat #{number} at table #{name.inspect} is already taken"
        end

        seat_id = SecureRandom.uuid
        mint_event!(
          name: "seat.taken",
          initiator: player_name,
          origin: "spine.seatTaken",
          significance: "administrative",
          payload: { "seatId" => seat_id, "seat" => number, "playerName" => player_name }
        )
        Seat.create(id: seat_id, table_id: id, number: number, player_name: player_name)
      end
    end

    def mint_event!(name:, initiator:, origin:, significance:, payload:)
      Event.create(
        event_id: SecureRandom.uuid,
        table_id: id,
        seq: (events_dataset.max(:seq) || 0) + 1,
        name: name,
        initiator: initiator,
        occurred_in: "spine",
        origin: origin,
        significance: significance,
        visibility: "public",
        schema_version: 1,
        payload: JSON.generate(payload),
        accepted_at: Time.now.utc
      )
    end

    private

    def next_available_seat_number
      taken = seats_dataset.select_map(:number)
      available = SEAT_NUMBERS.find { |n| !taken.include?(n) }
      raise TableFull, "table #{name.inspect} already has 4 seats taken" if available.nil?

      available
    end
  end
end
