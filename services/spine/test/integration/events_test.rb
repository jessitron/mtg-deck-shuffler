require_relative "../test_helper"

class EventsTest < Minitest::Test
  include Rack::Test::Methods

  def app
    Spine::App
  end

  def join(name:, player_name:, game_id: SecureRandom.uuid, deck_name: "Test Deck")
    post_join("gameId" => game_id, "name" => name, "playerName" => player_name, "deckName" => deck_name)
    JSON.parse(last_response.body)
  end

  def envelope_for(table_id, overrides = {})
    valid_envelope({ "tableId" => table_id }.merge(overrides))
  end

  def post_event(table_id, envelope, headers = {})
    post "/tables/#{table_id}/events", JSON.generate(envelope), { "CONTENT_TYPE" => "application/json" }.merge(headers)
  end

  def test_a_valid_envelope_is_appended_and_returns_the_assigned_seq
    table_id = join(name: "kitchen table", player_name: "Jess")["tableId"]

    post_event(table_id, envelope_for(table_id))

    assert_equal 201, last_response.status
    body = JSON.parse(last_response.body)
    assert_equal 4, body["seq"] # table.created, seat.taken, seat.joined, then this event
    refute_nil body["acceptedAt"]
  end

  def test_the_same_event_id_sent_twice_is_recognized_as_a_duplicate
    table_id = join(name: "kitchen table", player_name: "Jess")["tableId"]
    envelope = envelope_for(table_id)

    post_event(table_id, envelope)
    first_seq = JSON.parse(last_response.body)["seq"]

    post_event(table_id, envelope)

    assert_equal 200, last_response.status
    assert_equal first_seq, JSON.parse(last_response.body)["seq"]
  end

  def test_an_unknown_event_name_is_rejected_loudly
    table_id = join(name: "kitchen table", player_name: "Jess")["tableId"]

    post_event(table_id, envelope_for(table_id, "name" => "no.such.event"))

    assert_equal 422, last_response.status
    assert JSON.parse(last_response.body)["error"]
  end

  def test_a_sender_supplied_seq_is_rejected
    table_id = join(name: "kitchen table", player_name: "Jess")["tableId"]

    post_event(table_id, envelope_for(table_id, "seq" => 5))

    assert_equal 422, last_response.status
  end

  def test_a_non_json_body_is_rejected
    post "/tables/#{join(name: "kitchen table", player_name: "Jess")["tableId"]}/events",
      "not json", "CONTENT_TYPE" => "application/json"

    assert_equal 400, last_response.status
  end

  def test_an_unknown_table_is_not_found
    post_event("no-such-table", envelope_for("no-such-table"))

    assert_equal 404, last_response.status
  end

  def test_traceparent_is_not_required_in_the_body
    table_id = join(name: "kitchen table", player_name: "Jess")["tableId"]

    post_event(table_id, envelope_for(table_id), "HTTP_TRACEPARENT" => "00-#{"a" * 32}-#{"b" * 16}-01")

    assert_equal 201, last_response.status
  end
end
