require "test_helper"

class AdminScreenTest < ActionDispatch::IntegrationTest
  include Envelopes

  test "the index lists tables, linking to each log" do
    table = Table.create_with_event!(name: "kitchen-table", creator: "Jess", traceparent: valid_traceparent)
    get "/admin/tables"
    assert_response :success
    assert_includes response.body, "kitchen-table"
    assert_includes response.body, "/admin/tables/#{table.id}"
  end

  test "the root redirects to the admin screen" do
    get "/"
    assert_redirected_to "/admin/tables"
  end

  test "a table's log is shown human-readably, each event linking to its Honeycomb trace" do
    table = Table.create_with_event!(name: "kitchen-table", creator: "Jess", traceparent: valid_traceparent)
    table.take_seat!(number: 2, player_name: "Robin", traceparent: valid_traceparent)
    played = table.append_event!(card_played_envelope(table))

    get "/admin/tables/#{table.id}"
    assert_response :success

    # Events, in order, with their names and initiators
    assert_includes response.body, "table.created"
    assert_includes response.body, "seat.taken"
    assert_includes response.body, "card.played"
    assert_includes response.body, "Robin"

    # The trace link is built from the recorded traceparent (team modernity, env local in test)
    trace_id = played.traceparent.split("-")[1]
    assert_includes response.body,
      "https://ui.honeycomb.io/modernity/environments/local/trace?trace_id=#{trace_id}"
  end
end
