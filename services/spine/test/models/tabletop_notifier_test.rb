require_relative "../test_helper"

class RecordingSpan
  attr_reader :attribute_calls

  def initialize
    @attribute_calls = []
  end

  def add_attributes(attributes)
    @attribute_calls << attributes
  end

  def set_status(*_args)
    raise "notification must not set the join span status"
  end

  def status=(_value)
    raise "notification must not set the join span status"
  end

  def add_event(*_args)
    raise "notification must not add span events"
  end

  def record_exception(*_args)
    raise "notification must not record an exception on the join span"
  end
end

class FakeJoinedEvent
  def as_envelope
    {
      "id" => "joined-event-id",
      "tableId" => "table-uuid",
      "name" => "seat.joined",
      "initiator" => { "seatId" => "seat-id", "playerName" => "Jess" },
      "occurredIn" => "spine",
      "origin" => "spine.seatJoined",
      "significance" => "administrative",
      "schemaVersion" => 1,
      "payload" => { "deckName" => "Test Deck" }
    }
  end
end

class TabletopNotifierTest < Minitest::Test
  def test_records_sent
    server = FakeTabletopServer.new

    assert_delivery({ "tabletop.send.result" => "sent" }, url: server.url)
    assert_equal 1, server.wait_for_requests(1).length
  ensure
    server&.stop
  end

  def test_records_sent_replay
    server = FakeTabletopServer.new

    assert_delivery({ "tabletop.send.result" => "sent_replay" },
      url: server.url, replayed: true)
  ensure
    server&.stop
  end

  def test_records_missing_config
    assert_delivery({ "tabletop.send.result" => "missing_config" }, url: nil)
  end

  def test_records_invalid_config
    assert_delivery({ "tabletop.send.result" => "invalid_config" }, url: "ftp://table.example")
  end

  def test_records_non_2xx_with_status
    server = FakeTabletopServer.new(status: 503)

    assert_delivery({ "tabletop.send.result" => "non_2xx",
      "tabletop.send.status_code" => 503 }, url: server.url)
  ensure
    server&.stop
  end

  def test_records_timeout
    server = FakeTabletopServer.new(delay: Spine::TabletopNotifier::TIMEOUT_SECONDS + 1)

    assert_delivery({ "tabletop.send.result" => "timeout" }, url: server.url)
  ensure
    server&.stop
  end

  def test_records_network_error_with_error_type
    server = FakeTabletopServer.new
    url = server.url
    server.stop

    assert_delivery({ "tabletop.send.result" => "network_error",
      "tabletop.send.error_type" => "Errno::ECONNREFUSED" }, url: url)
  end

  private

  def assert_delivery(expected_attributes, url:, replayed: false)
    span = RecordingSpan.new
    notifier = Spine::TabletopNotifier.new(span: span)

    with_env("TABLETOP_URL" => url) do
      notifier.send_joined(event: FakeJoinedEvent.new,
        table_id: "table-uuid", replayed: replayed)
    end

    assert_equal [expected_attributes], span.attribute_calls
  end
end
