require_relative "../test_helper"

class TableTest < Minitest::Test
  def test_join_on_a_never_seen_name_creates_the_table_and_seats_the_player
    outcome = join_table(name: "kitchen table", player_name: "Jess")

    assert outcome[:table_id]
    assert_equal 1, outcome[:table_position]
    assert_equal true, outcome[:created]
  end

  def test_a_second_join_with_the_same_name_returns_the_same_table_and_next_seat
    first = join_table(name: "kitchen table", player_name: "Jess")
    second = join_table(name: "kitchen table", player_name: "Alex")

    assert_equal first[:table_id], second[:table_id]
    assert_equal 2, second[:table_position]
    assert_equal false, second[:created]
  end

  def test_create_with_event_rejects_a_name_already_active
    Spine::Table.create_with_event!(name: "kitchen table", creator: "Jess")

    assert_raises(Spine::Table::NameTaken) do
      Spine::Table.create_with_event!(name: "kitchen table", creator: "Alex")
    end
  end

  def test_create_with_event_mints_a_table_created_event
    table = Spine::Table.create_with_event!(name: "kitchen table", creator: "Jess")

    event = table.events_dataset.first
    assert_equal "table.created", event.name
    assert_equal "administrative", event.significance
    assert_equal({ "name" => "kitchen table", "creator" => "Jess" }, JSON.parse(event.payload))
  end

  def test_take_seat_assigns_the_next_open_table_position
    table = Spine::Table.create_with_event!(name: "kitchen table", creator: "Jess")
    take_seat(table, player_name: "Jess")

    seat = take_seat(table, player_name: "Alex")

    assert_equal 2, seat.number
  end

  def test_take_seat_mints_a_seat_taken_event
    table = Spine::Table.create_with_event!(name: "kitchen table", creator: "Jess")
    seat = take_seat(table, player_name: "Jess")

    event = table.events_dataset.where(name: "seat.taken").first
    payload = JSON.parse(event.payload)
    assert_equal seat.id, payload["seatId"]
    assert_equal 1, payload["tablePosition"]
    assert_equal "Jess", payload["playerName"]
  end

  def test_taking_an_already_occupied_seat_is_rejected
    table = Spine::Table.create_with_event!(name: "kitchen table", creator: "Jess")
    take_seat(table, player_name: "Jess", table_position: 2)

    assert_raises(Spine::Table::SeatOccupied) do
      take_seat(table, player_name: "Alex", table_position: 2)
    end
  end

  def test_joining_a_full_table_is_rejected
    table = Spine::Table.create_with_event!(name: "kitchen table", creator: "Jess")
    4.times { |n| take_seat(table, player_name: "Player #{n}") }

    assert_raises(Spine::Table::TableFull) do
      take_seat(table, player_name: "One too many")
    end
  end

  def envelope_for(table, overrides = {})
    valid_envelope({ "tableId" => table.id }.merge(overrides))
  end

  def test_append_event_assigns_seq_and_accepted_at
    table = Spine::Table.create_with_event!(name: "kitchen table", creator: "Jess")

    outcome = table.append_event!(envelope_for(table))

    assert_equal false, outcome[:duplicate]
    assert_equal 2, outcome[:event].seq # table.created is seq 1
    refute_nil outcome[:event].accepted_at
  end

  def test_append_event_dedups_on_sender_supplied_id
    table = Spine::Table.create_with_event!(name: "kitchen table", creator: "Jess")
    envelope = envelope_for(table)

    first = table.append_event!(envelope)
    second = table.append_event!(envelope)

    assert_equal false, first[:duplicate]
    assert_equal true, second[:duplicate]
    assert_equal first[:event].seq, second[:event].seq
    assert_equal 1, table.events_dataset.where(event_id: envelope["id"]).count
  end

  def test_append_event_preserves_an_initiator_seat_id
    table = Spine::Table.create_with_event!(name: "kitchen table", creator: "Jess")
    initiator = { "seatId" => SecureRandom.uuid, "playerName" => "Jess" }

    outcome = table.append_event!(envelope_for(table, "initiator" => initiator))

    assert_equal initiator, outcome[:event].as_envelope["initiator"]
  end

  def test_append_event_rejects_a_contract_violation
    table = Spine::Table.create_with_event!(name: "kitchen table", creator: "Jess")

    assert_raises(Spine::EventContract::UnknownEvent) do
      table.append_event!(envelope_for(table, "name" => "no.such.event"))
    end
  end

  def test_the_persisted_event_row_has_no_trace_context_column
    refute_includes Spine::Event.columns, :traceparent
  end

  def test_append_event_rejects_a_mismatched_table_id
    table = Spine::Table.create_with_event!(name: "kitchen table", creator: "Jess")

    assert_raises(Spine::EventContract::Violation) do
      table.append_event!(envelope_for(table, "tableId" => "some-other-table"))
    end
  end

  def test_a_rolled_back_append_never_reaches_a_subscriber
    table = Spine::Table.create_with_event!(name: "kitchen table", creator: "Jess")
    queue = Spine.broadcaster.subscribe(table.id)
    envelope = envelope_for(table)

    assert_raises(RuntimeError) do
      DB.transaction do
        table.append_event!(envelope)
        raise "force rollback of the outer, still-open transaction"
      end
    end

    assert queue.empty?
    assert_nil table.events_dataset.first(event_id: envelope["id"])
  end

  private

  def join_table(name:, player_name:)
    Spine::Table.join!(name: name, game_id: SecureRandom.uuid, player_name: player_name,
      decoration: { "deckName" => "Test Deck" })
  end

  def take_seat(table, player_name:, table_position: nil)
    table.take_seat!(game_id: SecureRandom.uuid, player_name: player_name,
      decoration: { "deckName" => "Test Deck" }, table_position: table_position)
  end
end
