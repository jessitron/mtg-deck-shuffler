require_relative "../test_helper"

class SseStreamTest < Minitest::Test
  def setup
    @table_id = "table-#{SecureRandom.uuid}"
    @table = Spine::Table.create(id: @table_id, name: @table_id, created_at: Time.now.utc)
  end

  def test_yields_a_heartbeat_immediately_before_any_event
    stream = Spine::SseStream.new(@table_id)
    frames = collect_frames(stream, count: 1)

    assert_equal [Spine::SseStream::HEARTBEAT_FRAME], frames
  ensure
    stream&.close
  end

  def test_yields_periodic_heartbeats_while_no_event_is_published
    stream = Spine::SseStream.new(@table_id, heartbeat_interval_seconds: 0.02)
    frames = collect_frames(stream, count: 3)

    assert_equal [Spine::SseStream::HEARTBEAT_FRAME] * 3, frames
  ensure
    stream&.close
  end

  def test_a_published_event_arrives_alongside_heartbeats_without_being_replaced_by_one
    stream = Spine::SseStream.new(@table_id, heartbeat_interval_seconds: 0.02)
    frames = Queue.new
    thread = Thread.new { stream.each { |frame| frames << frame } }

    frames.pop(timeout: 1) # the immediate heartbeat
    Spine.broadcaster.publish(@table_id, { "name" => "card.played" })

    data_frame = wait_for_data_frame(frames)
    assert_equal 'data: {"name":"card.played"}' + "\n\n", data_frame
  ensure
    stream&.close
    thread&.join(1)
  end

  def test_replays_events_published_before_the_stream_opens_in_order_given_a_last_seen_seq
    first = mint(name: "card.played")
    second = mint(name: "card.returned")

    stream = Spine::SseStream.new(@table_id, last_seen_seq: 0)
    frames = collect_frames(stream, count: 2)

    assert_equal [
      "data: #{JSON.generate(event: first.as_envelope)}\n\n",
      "data: #{JSON.generate(event: second.as_envelope)}\n\n"
    ], frames
  ensure
    stream&.close
  end

  def test_an_event_broadcast_between_subscribing_and_replaying_is_not_delivered_twice
    first = mint(name: "card.played")

    stream = Spine::SseStream.new(@table_id, last_seen_seq: 0, heartbeat_interval_seconds: 0.02)
    # Simulate the race the code review flagged: by the time `each` runs its replay
    # query, the broadcaster (subscribed in `initialize`, before this) has already
    # delivered `first` live onto the queue too.
    Spine.broadcaster.publish(@table_id, { event: first.as_envelope })

    frames = collect_frames(stream, count: 2)

    assert_equal [
      "data: #{JSON.generate(event: first.as_envelope)}\n\n",
      Spine::SseStream::HEARTBEAT_FRAME
    ], frames
  ensure
    stream&.close
  end

  def test_last_seen_seq_equal_to_latest_yields_no_replay_frames
    latest = mint(name: "card.played")

    stream = Spine::SseStream.new(@table_id, last_seen_seq: latest.seq, heartbeat_interval_seconds: 0.02)
    frames = collect_frames(stream, count: 1)

    assert_equal [Spine::SseStream::HEARTBEAT_FRAME], frames
  ensure
    stream&.close
  end

  def test_no_last_seen_seq_behaves_exactly_as_today
    mint(name: "card.played")

    stream = Spine::SseStream.new(@table_id)
    frames = collect_frames(stream, count: 1)

    assert_equal [Spine::SseStream::HEARTBEAT_FRAME], frames
  ensure
    stream&.close
  end

  def test_broadcaster_close_all_ends_the_stream
    stream = Spine::SseStream.new(@table_id, heartbeat_interval_seconds: 5)
    frames = Queue.new
    thread = Thread.new { stream.each { |frame| frames << frame } }
    frames.pop(timeout: 1) # the immediate heartbeat

    Spine.broadcaster.close_all(Spine::SseStream::CLOSE)

    thread.join(1)
    refute thread.alive?, "each should return once every stream is told to close"
  ensure
    stream&.close
    thread&.join(1)
  end

  private

  def mint(name:)
    @table.mint_event!(
      name: name, initiator: "Jess", origin: "test", significance: "physical", payload: {}
    )
  end

  def collect_frames(stream, count:)
    frames = Queue.new
    thread = Thread.new { stream.each { |frame| frames << frame } }
    Array.new(count) { frames.pop(timeout: 1) }
  ensure
    thread&.join(0.01)
  end

  def wait_for_data_frame(frames)
    loop do
      frame = frames.pop(timeout: 1)
      refute_nil frame, "no data frame arrived within the timeout"
      return frame if frame.start_with?("data: ")
    end
  end
end
