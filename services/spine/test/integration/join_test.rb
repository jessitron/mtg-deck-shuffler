require_relative "../test_helper"

class JoinTest < Minitest::Test
  include Rack::Test::Methods

  def app
    Spine::App
  end

  def join(name:, player_name:)
    post "/join", JSON.generate(name: name, playerName: player_name), "CONTENT_TYPE" => "application/json"
  end

  def test_joining_a_never_seen_name_creates_the_table_and_seats_the_player
    join(name: "kitchen table", player_name: "Jess")

    assert_equal 200, last_response.status
    body = JSON.parse(last_response.body)
    assert body["tableId"]
    assert_equal 1, body["seatNumber"]
  end

  def test_a_second_join_with_the_same_name_returns_the_same_table_and_next_seat
    join(name: "kitchen table", player_name: "Jess")
    first_body = JSON.parse(last_response.body)

    join(name: "kitchen table", player_name: "Alex")
    second_body = JSON.parse(last_response.body)

    assert_equal 200, last_response.status
    assert_equal first_body["tableId"], second_body["tableId"]
    assert_equal 2, second_body["seatNumber"]
  end

  def test_joining_a_full_table_is_rejected
    join(name: "kitchen table", player_name: "Jess")
    join(name: "kitchen table", player_name: "Alex")
    join(name: "kitchen table", player_name: "Sam")
    join(name: "kitchen table", player_name: "Robin")

    join(name: "kitchen table", player_name: "One too many")

    assert_equal 409, last_response.status
    assert JSON.parse(last_response.body)["error"]
  end

  def test_missing_fields_are_rejected
    post "/join", JSON.generate(name: "kitchen table"), "CONTENT_TYPE" => "application/json"

    assert_equal 400, last_response.status
  end

  def test_a_null_field_is_rejected
    post "/join", JSON.generate(name: "kitchen table", playerName: nil), "CONTENT_TYPE" => "application/json"

    assert_equal 400, last_response.status
  end

  def test_a_blank_field_is_rejected
    post "/join", JSON.generate(name: "", playerName: "Jess"), "CONTENT_TYPE" => "application/json"

    assert_equal 400, last_response.status
  end

  def test_a_non_object_body_is_rejected
    post "/join", JSON.generate(["kitchen table"]), "CONTENT_TYPE" => "application/json"

    assert_equal 400, last_response.status
  end
end
