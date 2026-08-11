require_relative "../test_helper"

class TableBroadcasterTest < Minitest::Test
  def setup
    @broadcaster = Spine::TableBroadcaster.new
  end

  def test_a_subscriber_receives_a_published_message
    queue = @broadcaster.subscribe("table-1")

    @broadcaster.publish("table-1", "hello")

    assert_equal "hello", queue.pop
  end

  def test_multiple_subscribers_to_the_same_table_all_receive_the_message
    first = @broadcaster.subscribe("table-1")
    second = @broadcaster.subscribe("table-1")

    @broadcaster.publish("table-1", "hello")

    assert_equal "hello", first.pop
    assert_equal "hello", second.pop
  end

  def test_a_subscriber_to_a_different_table_does_not_receive_the_message
    other_table = @broadcaster.subscribe("table-2")

    @broadcaster.publish("table-1", "hello")

    assert other_table.empty?
  end

  def test_an_unsubscribed_listener_no_longer_receives_messages
    queue = @broadcaster.subscribe("table-1")
    @broadcaster.unsubscribe("table-1", queue)

    @broadcaster.publish("table-1", "hello")

    assert queue.empty?
  end
end
