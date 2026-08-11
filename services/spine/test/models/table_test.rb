require_relative "../test_helper"

class TableTest < Minitest::Test
  def test_join_on_a_never_seen_name_creates_the_table_and_seats_the_player
    outcome = Spine::Table.join!(name: "kitchen table", player_name: "Jess")

    assert outcome[:table_id]
    assert_equal 1, outcome[:seat_number]
    assert_equal true, outcome[:created]
  end

  def test_a_second_join_with_the_same_name_returns_the_same_table_and_next_seat
    first = Spine::Table.join!(name: "kitchen table", player_name: "Jess")
    second = Spine::Table.join!(name: "kitchen table", player_name: "Alex")

    assert_equal first[:table_id], second[:table_id]
    assert_equal 2, second[:seat_number]
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

  def test_take_seat_assigns_the_next_open_seat_number
    table = Spine::Table.create_with_event!(name: "kitchen table", creator: "Jess")
    table.take_seat!(player_name: "Jess")

    seat = table.take_seat!(player_name: "Alex")

    assert_equal 2, seat.number
  end

  def test_take_seat_mints_a_seat_taken_event
    table = Spine::Table.create_with_event!(name: "kitchen table", creator: "Jess")
    seat = table.take_seat!(player_name: "Jess")

    event = table.events_dataset.where(name: "seat.taken").first
    payload = JSON.parse(event.payload)
    assert_equal seat.id, payload["seatId"]
    assert_equal 1, payload["seat"]
    assert_equal "Jess", payload["playerName"]
  end

  def test_taking_an_already_occupied_seat_is_rejected
    table = Spine::Table.create_with_event!(name: "kitchen table", creator: "Jess")
    table.take_seat!(player_name: "Jess", number: 2)

    assert_raises(Spine::Table::SeatOccupied) do
      table.take_seat!(player_name: "Alex", number: 2)
    end
  end

  def test_joining_a_full_table_is_rejected
    table = Spine::Table.create_with_event!(name: "kitchen table", creator: "Jess")
    4.times { |n| table.take_seat!(player_name: "Player #{n}") }

    assert_raises(Spine::Table::TableFull) do
      table.take_seat!(player_name: "One too many")
    end
  end
end
