require "test_helper"

class TableTest < ActiveSupport::TestCase
  include Envelopes

  def create_table(name: "kitchen-table")
    Table.create_with_event!(name: name, creator: "Jess", traceparent: valid_traceparent)
  end

  test "creating a table mints a GUID tableId and appends table.created as seq 1" do
    table = create_table
    assert_match(/\A[0-9a-f-]{36}\z/, table.id)
    assert_equal 1, table.events.count
    event = table.events.first
    assert_equal "table.created", event.name
    assert_equal 1, event.seq
    assert_equal({ "name" => "kitchen-table", "creator" => "Jess" }, event.payload)
    assert_not_nil event.accepted_at
  end

  test "an active table's name cannot be reused" do
    create_table
    assert_raises(Table::NameTaken) { create_table }
  end

  test "a closed table's name can be reused (unique among ACTIVE tables only)" do
    create_table.update_column(:status, "closed")
    assert_nothing_raised { create_table }
  end

  test "taking a seat mints a seatId, appends seat.taken, and projects the seat" do
    table = create_table
    seat = table.take_seat!(number: 3, player_name: "Robin", traceparent: valid_traceparent)
    assert_match(/\A[0-9a-f-]{36}\z/, seat.id)
    assert_equal 3, seat.number
    assert_equal "Robin", seat.player_name
    event = table.events.find_by(name: "seat.taken")
    assert_equal seat.id, event.payload["seatId"]
    assert_equal 2, event.seq
  end

  test "an occupied seat cannot be taken again" do
    table = create_table
    table.take_seat!(number: 1, player_name: "Jess", traceparent: valid_traceparent)
    assert_raises(Table::SeatOccupied) do
      table.take_seat!(number: 1, player_name: "Robin", traceparent: valid_traceparent)
    end
  end

  test "seat numbers outside 1-4 violate the contract" do
    table = create_table
    assert_raises(EventContract::Violation) do
      table.take_seat!(number: 5, player_name: "Fifth Wheel", traceparent: valid_traceparent)
    end
  end

  test "no seat number given: the Spine assigns the lowest open one" do
    table = create_table
    first = table.take_seat!(player_name: "Jess", traceparent: valid_traceparent)
    second = table.take_seat!(player_name: "Robin", traceparent: valid_traceparent)
    assert_equal 1, first.number
    assert_equal 2, second.number
  end

  test "auto-assignment fills a gap left by an explicit number" do
    table = create_table
    table.take_seat!(number: 2, player_name: "Jess", traceparent: valid_traceparent)
    assigned = table.take_seat!(player_name: "Robin", traceparent: valid_traceparent)
    assert_equal 1, assigned.number
  end

  test "a fifth seat, with none given, is a TableFull conflict" do
    table = create_table
    4.times { |i| table.take_seat!(player_name: "Player #{i}", traceparent: valid_traceparent) }
    assert_raises(Table::TableFull) do
      table.take_seat!(player_name: "Fifth Wheel", traceparent: valid_traceparent)
    end
  end

  test "seq is monotonic per table, independently across tables" do
    table_a = create_table(name: "table-a")
    table_b = create_table(name: "table-b")
    3.times { table_a.append_event!(card_played_envelope(table_a)) }
    table_b.append_event!(card_played_envelope(table_b))
    assert_equal [ 1, 2, 3, 4 ], table_a.events.order(:seq).pluck(:seq)
    assert_equal [ 1, 2 ], table_b.events.order(:seq).pluck(:seq)
  end

  test "a retried duplicate event id is elided, not appended twice" do
    table = create_table
    envelope = card_played_envelope(table)
    first = table.append_event!(envelope)
    second = table.append_event!(envelope)
    assert_equal first.id, second.id
    assert_equal first.seq, second.seq
    assert_equal 2, table.events.count # table.created + one card.played
  end

  test "an unknown event name fails loudly" do
    table = create_table
    assert_raises(EventContract::UnknownEvent) do
      table.append_event!(card_played_envelope(table, "name" => "card.yeeted"))
    end
    assert_equal 1, table.events.count
  end

  test "an unknown schemaVersion fails loudly" do
    table = create_table
    assert_raises(EventContract::UnknownEvent) do
      table.append_event!(card_played_envelope(table, "schemaVersion" => 99))
    end
  end

  test "a sender claiming seq or acceptedAt is rejected" do
    table = create_table
    assert_raises(EventContract::SpineOwnedField) do
      table.append_event!(card_played_envelope(table, "seq" => 7))
    end
    assert_raises(EventContract::SpineOwnedField) do
      table.append_event!(card_played_envelope(table, "acceptedAt" => Time.current.iso8601))
    end
  end

  test "a payload that does not match its schema fails loudly" do
    table = create_table
    envelope = card_played_envelope(table)
    envelope["payload"].delete("face")
    assert_raises(EventContract::Violation) { table.append_event!(envelope) }
  end

  test "non-public visibility is rejected in v0" do
    table = create_table
    assert_raises(EventContract::Violation) do
      table.append_event!(card_played_envelope(table, "visibility" => "seat-private"))
    end
  end

  test "an envelope for a different table is rejected" do
    table = create_table
    other = create_table(name: "other-table")
    assert_raises(EventContract::Violation) do
      table.append_event!(card_played_envelope(other))
    end
  end

  test "the log is append-only: events cannot be updated or destroyed" do
    table = create_table
    event = table.events.first
    assert_raises(ActiveRecord::ReadOnlyRecord) { event.update!(name: "history.rewritten") }
    assert_raises(ActiveRecord::ReadOnlyRecord) { event.destroy! }
    assert_equal "table.created", event.reload.name
  end
end
