require "test_helper"

class IngestionTest < ActionDispatch::IntegrationTest
  include Envelopes

  def create_table!(name: "kitchen-table")
    post "/tables", params: { name: name, creator: "Jess" }, as: :json
    assert_response :created
    response.parsed_body
  end

  test "creating a table returns the Spine-minted tableId" do
    body = create_table!
    assert_match(/\A[0-9a-f-]{36}\z/, body["tableId"])
    assert_equal "kitchen-table", body["name"]
    assert_equal [], body["seats"]
  end

  test "creating a table with a name already active is a 409" do
    create_table!
    post "/tables", params: { name: "kitchen-table", creator: "Robin" }, as: :json
    assert_response :conflict
  end

  test "a table can be joined by name" do
    body = create_table!
    get "/tables/lookup", params: { name: "kitchen-table" }
    assert_response :success
    assert_equal body["tableId"], response.parsed_body["tableId"]
  end

  test "looking up a table that does not exist is a 404" do
    get "/tables/lookup", params: { name: "nowhere" }
    assert_response :not_found
  end

  test "taking a seat returns a Spine-minted seatId and shows in lookup" do
    table = create_table!
    post "/tables/#{table['tableId']}/seats", params: { seat: 2, playerName: "Robin" }, as: :json
    assert_response :created
    seat = response.parsed_body
    assert_match(/\A[0-9a-f-]{36}\z/, seat["seatId"])

    get "/tables/lookup", params: { name: "kitchen-table" }
    assert_equal [ seat.except("tableId") ], response.parsed_body["seats"]
  end

  test "taking an occupied seat is a 409" do
    table = create_table!
    post "/tables/#{table['tableId']}/seats", params: { seat: 1, playerName: "Jess" }, as: :json
    post "/tables/#{table['tableId']}/seats", params: { seat: 1, playerName: "Robin" }, as: :json
    assert_response :conflict
  end

  test "ingesting card.played assigns seq and acceptedAt" do
    table_id = create_table!["tableId"]
    table = Table.find(table_id)
    envelope = card_played_envelope(table)

    post "/tables/#{table_id}/events",
      params: envelope.to_json,
      headers: { "Content-Type" => "application/json", "traceparent" => envelope["traceparent"] }
    assert_response :created
    accepted = response.parsed_body
    assert_equal 2, accepted["seq"]
    assert_not_nil accepted["acceptedAt"]
    assert_equal envelope["id"], accepted["id"]
    assert_equal envelope["payload"], accepted["payload"]
  end

  test "a retried event is elided: same seq back, 200 not 201, one row" do
    table_id = create_table!["tableId"]
    envelope = card_played_envelope(Table.find(table_id))

    post "/tables/#{table_id}/events", params: envelope.to_json,
      headers: { "Content-Type" => "application/json" }
    first_seq = response.parsed_body["seq"]

    post "/tables/#{table_id}/events", params: envelope.to_json,
      headers: { "Content-Type" => "application/json" }
    assert_response :ok
    assert_equal first_seq, response.parsed_body["seq"]
    assert_equal 2, Table.find(table_id).events.count
  end

  test "an unknown event name is a loud 422" do
    table_id = create_table!["tableId"]
    envelope = card_played_envelope(Table.find(table_id), "name" => "card.yeeted")
    post "/tables/#{table_id}/events", params: envelope.to_json,
      headers: { "Content-Type" => "application/json" }
    assert_response :unprocessable_content
    assert_match(/no contract for event/, response.parsed_body["error"])
  end

  test "a sender claiming seq is a loud 422" do
    table_id = create_table!["tableId"]
    envelope = card_played_envelope(Table.find(table_id), "seq" => 1)
    post "/tables/#{table_id}/events", params: envelope.to_json,
      headers: { "Content-Type" => "application/json" }
    assert_response :unprocessable_content
    assert_match(/Spine-assigned/, response.parsed_body["error"])
  end

  test "ingesting to a table that does not exist is a 404" do
    post "/tables/#{SecureRandom.uuid}/events", params: "{}",
      headers: { "Content-Type" => "application/json" }
    assert_response :not_found
  end

  test "a non-JSON body is a 400" do
    # (With Content-Type application/json, Rails' params parser already 400s
    # malformed JSON in middleware; this exercises the controller's own guard.)
    table_id = create_table!["tableId"]
    post "/tables/#{table_id}/events", params: "this is not json",
      headers: { "Content-Type" => "text/plain" }
    assert_response :bad_request
    assert_match(/not JSON/, response.parsed_body["error"])
  end
end
