require_relative "../test_helper"
require "timeout"

class JoinDeliveryTest < Minitest::Test
  include Rack::Test::Methods

  def app
    Spine::App
  end

  def test_missing_tabletop_configuration_does_not_roll_back_the_join
    with_env("TABLETOP_URL" => nil, "TABLETOP_PUBLIC_URL" => "http://table.example") do
      post_join("gameId" => "missing-config", "name" => "offline table")
    end

    assert_committed_join
  end

  def test_a_down_tabletop_does_not_roll_back_the_join
    tabletop = FakeTabletopServer.new
    url = tabletop.url
    tabletop.stop

    with_env("TABLETOP_URL" => url, "TABLETOP_PUBLIC_URL" => "http://table.example") do
      post_join("gameId" => "connection-refused", "name" => "offline table")
    end

    assert_committed_join
  end

  def test_a_non_success_tabletop_response_does_not_roll_back_the_join
    tabletop = FakeTabletopServer.new(status: 503)

    with_tabletop(tabletop) { post_join("gameId" => "non-2xx", "name" => "offline table") }

    assert_committed_join
    assert_equal 1, tabletop.wait_for_requests(1).length
  ensure
    tabletop&.stop
  end

  def test_a_tabletop_timeout_does_not_roll_back_the_join
    tabletop = FakeTabletopServer.new(delay: 30)

    Timeout.timeout(3) do
      with_tabletop(tabletop) { post_join("gameId" => "timeout", "name" => "offline table") }
    end

    assert_committed_join
    assert_equal 1, tabletop.wait_for_requests(1).length
  ensure
    tabletop&.stop
  end

  private

  def with_tabletop(tabletop, &block)
    with_env("TABLETOP_URL" => tabletop.url, "TABLETOP_PUBLIC_URL" => "http://table.example", &block)
  end

  def assert_committed_join
    assert_equal 200, last_response.status
    response = JSON.parse(last_response.body)
    assert_equal "http://table.example/t/#{response["tableId"]}?seat=#{response["seatId"]}", response["tableUrl"]
    assert_equal 1, DB[:tables].count
    assert_equal 1, DB[:seats].count
    assert_equal %w[table.created seat.taken seat.joined], DB[:events].order(:seq).select_map(:name)
  end
end
