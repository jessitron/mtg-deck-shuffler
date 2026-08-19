require_relative "../test_helper"

class SseStreamTest < Minitest::Test
  def setup
    @table_id = "table-#{SecureRandom.uuid}"
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

  private

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
