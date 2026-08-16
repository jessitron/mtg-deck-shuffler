require_relative "../test_helper"

class SseStreamTest < Minitest::Test
  include Rack::Test::Methods

  def app
    Spine::App
  end

  def test_appending_an_event_delivers_it_on_an_open_stream_with_no_polling
    table_id = join_table
    body, chunks = open_stream(table_id)

    post_event(table_id, envelope_for(table_id))

    message = next_message(chunks)
    assert_equal "seat.joined", message["event"]["name"]
  ensure
    body&.close
  end

  def test_the_delivered_event_carries_a_live_traceparent
    table_id = join_table
    body, chunks = open_stream(table_id)

    post_event(table_id, envelope_for(table_id))

    message = next_message(chunks)
    assert_equal ["event"], message.keys
    assert_equal table_id, message["event"]["tableId"]
    assert_match(/\A00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}\z/, message["event"]["traceparent"])
  ensure
    body&.close
  end

  def test_multiple_subscribers_to_the_same_table_all_receive_the_event
    table_id = join_table
    first_body, first_chunks = open_stream(table_id)
    second_body, second_chunks = open_stream(table_id)

    post_event(table_id, envelope_for(table_id))

    assert_equal next_message(first_chunks)["event"]["id"], next_message(second_chunks)["event"]["id"]
  ensure
    first_body&.close
    second_body&.close
  end

  def test_a_dropped_connection_can_reconnect_and_resume_receiving_new_events
    table_id = join_table
    body, _chunks = open_stream(table_id)
    body.close # simulate a dropped connection

    reconnected_body, chunks = open_stream(table_id)
    post_event(table_id, envelope_for(table_id))

    refute_nil next_message(chunks)
  ensure
    reconnected_body&.close
  end

  def test_streaming_an_unknown_table_is_not_found
    status, _headers, _body = raw_get("/tables/no-such-table/events/stream")

    assert_equal 404, status
  end

  private

  def join_table
    post "/join", JSON.generate(name: "kitchen table #{SecureRandom.uuid}", playerName: "Jess"), "CONTENT_TYPE" => "application/json"
    JSON.parse(last_response.body)["tableId"]
  end

  def envelope_for(table_id, overrides = {})
    valid_envelope({ "tableId" => table_id }.merge(overrides))
  end

  def post_event(table_id, envelope)
    post "/tables/#{table_id}/events", JSON.generate(envelope), "CONTENT_TYPE" => "application/json"
  end

  def raw_get(path)
    env = Rack::MockRequest.env_for(path, method: "GET")
    app.call(env)
  end

  def open_stream(table_id)
    _status, _headers, body = raw_get("/tables/#{table_id}/events/stream")
    chunks = Queue.new
    Thread.new { body.each { |chunk| chunks << chunk } }
    [body, chunks]
  end

  def next_message(chunks)
    raw = chunks.pop(timeout: 2)
    refute_nil raw, "no message arrived on the stream within the timeout"
    JSON.parse(raw.delete_prefix("data: ").strip)
  end
end
