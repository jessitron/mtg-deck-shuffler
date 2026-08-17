require_relative "../test_helper"

class JoinTest < Minitest::Test
  include Rack::Test::Methods

  def app
    Spine::App
  end

  def test_first_rich_join_commits_the_full_seat_and_sends_only_an_adapted_copy
    tabletop = FakeTabletopServer.new
    submission = rich_join

    with_tabletop(tabletop) { post_join(submission) }

    assert_equal 200, last_response.status
    response = JSON.parse(last_response.body)
    assert_equal({ "tableId" => response["tableId"], "seatNumber" => 1,
      "tableUrl" => "http://table.example/t/rich%20table" }, response)

    seat = DB[:seats].first
    assert_equal 1, DB[:tables].count
    assert_equal 1, DB[:seats].count
    assert_equal response["tableId"], seat[:table_id]
    assert_equal submission["gameId"], seat[:game_id]
    events = DB[:events].order(:seq).all
    assert_equal %w[table.created seat.taken seat.joined], events.map { |event| event[:name] }
    assert_equal [1, 2, 3], events.map { |event| event[:seq] }

    joined = Spine::Event[events.last[:id]].as_envelope
    decoration = submission.reject { |key, _| %w[gameId name playerName].include?(key) }
    assert_equal decoration, JSON.parse(events.last[:payload])
    assert_equal decoration, joined["payload"]
    assert_equal({ "seatId" => seat[:id], "playerName" => submission["playerName"] }, joined["initiator"])
    assert_equal 1, joined["schemaVersion"]
    refute joined.key?("traceparent")

    request = tabletop.wait_for_requests(1).fetch(0)
    assert_equal "POST", request[:method]
    assert_equal "/api/tables/rich%20table/events", request[:path]
    outbound = JSON.parse(request[:body])
    expected = joined.merge("tableId" => submission["name"])
    expected["traceparent"] = outbound["traceparent"] if outbound.key?("traceparent")
    assert_equal expected, outbound
    assert_trace_context(request[:headers]["traceparent"], outbound["traceparent"])
  ensure
    tabletop&.stop
  end

  def test_replay_with_conflicting_valid_data_returns_and_resends_the_original_join
    tabletop = FakeTabletopServer.new
    original = rich_join
    with_tabletop(tabletop) { post_join(original) }
    original_response = JSON.parse(last_response.body)
    original_events = DB[:events].order(:seq).all.map(&:dup)
    original_seat = DB[:seats].first.dup
    tabletop.wait_for_requests(1)

    conflicting = rich_join.merge(
      "gameId" => original["gameId"], "name" => "other table", "playerName" => "Alex",
      "deckName" => "Conflicting Deck", "commanders" => [], "gameUrl" => "https://game.example/other"
    )
    with_tabletop(tabletop) { post_join(conflicting) }

    assert_equal 200, last_response.status
    assert_equal original_response, JSON.parse(last_response.body)
    assert_equal original_seat, DB[:seats].first
    assert_equal original_events, DB[:events].order(:seq).all
    sent = tabletop.wait_for_requests(2)
    first = JSON.parse(sent[0][:body])
    replay = JSON.parse(sent[1][:body])
    assert_equal first.reject { |key, _| key == "traceparent" }, replay.reject { |key, _| key == "traceparent" }
    assert_equal original["name"], replay["tableId"]
    assert_equal original["deckName"], replay.dig("payload", "deckName")
  ensure
    tabletop&.stop
  end

  def test_different_games_at_the_same_table_get_distinct_seats
    tabletop = FakeTabletopServer.new
    with_tabletop(tabletop) do
      post_join("gameId" => "game-one", "name" => "shared table")
      first = JSON.parse(last_response.body)
      post_join("gameId" => "game-two", "name" => "shared table", "playerName" => "Alex")
      second = JSON.parse(last_response.body)

      assert_equal first["tableId"], second["tableId"]
      assert_equal [1, 2], [first["seatNumber"], second["seatNumber"]]
      assert_equal %w[game-one game-two], DB[:seats].order(:number).select_map(:game_id)
    end
  ensure
    tabletop&.stop
  end

  def test_omitted_commanders_and_an_explicit_empty_list_remain_distinct
    tabletop = FakeTabletopServer.new
    with_tabletop(tabletop) do
      post_join("gameId" => "omitted-commanders", "name" => "shared table")
      post_join("gameId" => "empty-commanders", "name" => "shared table", "commanders" => [])
    end

    payloads = DB[:events].where(name: "seat.joined").order(:seq).select_map(:payload).map { |json| JSON.parse(json) }
    refute payloads[0].key?("commanders")
    assert_equal [], payloads[1]["commanders"]
    outbound = tabletop.wait_for_requests(2).map { |request| JSON.parse(request[:body]).fetch("payload") }
    refute outbound[0].key?("commanders")
    assert_equal [], outbound[1]["commanders"]
  ensure
    tabletop&.stop
  end

  def test_joining_a_full_table_is_rejected
    tabletop = FakeTabletopServer.new
    with_tabletop(tabletop) do
      %w[Jess Alex Sam Robin].each_with_index do |player, index|
        post_join("gameId" => "game-#{index}", "name" => "kitchen table", "playerName" => player)
      end
      post_join("gameId" => "game-5", "name" => "kitchen table", "playerName" => "One too many")
    end

    assert_equal 409, last_response.status
    assert JSON.parse(last_response.body)["error"]
  ensure
    tabletop&.stop
  end

  def test_missing_fields_are_rejected
    body = valid_join
    body.delete("deckName")
    post "/join", JSON.generate(body), "CONTENT_TYPE" => "application/json"

    assert_equal 400, last_response.status
  end

  def test_required_strings_reject_whitespace_without_side_effects
    tabletop = FakeTabletopServer.new
    %w[gameId name playerName deckName].each do |field|
      with_tabletop(tabletop) { post_join(field => " \t ") }
      assert_equal 400, last_response.status, field
    end
    assert_no_side_effects(tabletop)
  ensure
    tabletop&.stop
  end

  def test_a_non_object_body_is_rejected
    post "/join", JSON.generate(["kitchen table"]), "CONTENT_TYPE" => "application/json"

    assert_equal 400, last_response.status
  end

  def test_a_commander_missing_back_image_url_is_422_before_any_side_effect
    tabletop = FakeTabletopServer.new
    commander = rich_join.fetch("commanders").first.reject { |key, _| key == "backImageUrl" }

    with_tabletop(tabletop) { post_join(rich_join.merge("commanders" => [commander])) }

    assert_equal 422, last_response.status
    assert_no_side_effects(tabletop)
  ensure
    tabletop&.stop
  end

  def test_an_invalid_game_url_is_422_before_any_side_effect
    tabletop = FakeTabletopServer.new

    with_tabletop(tabletop) { post_join(rich_join.merge("gameUrl" => "not a URL")) }

    assert_equal 422, last_response.status
    assert_no_side_effects(tabletop)
  ensure
    tabletop&.stop
  end

  private

  def rich_join
    valid_join(
      "gameId" => "rich-game", "name" => "rich table", "playerName" => "Jess",
      "deckName" => "Two commanders", "playmatImageUrl" => "https://images.example/playmat.jpg",
      "cardBackImageUrl" => "https://images.example/card-back.jpg", "sleeveColor" => "#12Ab34",
      "primaryColor" => "#112233", "secondaryColor" => "#ddeeff",
      "gameUrl" => "https://shuffler.example/game/rich-game",
      "layoutExtension" => { "label" => "gold", "enabled" => true },
      "commanders" => [commander("First", "https://images.example/first-back.jpg", 1),
        commander("Second", nil, 2)]
    )
  end

  def commander(name, back_image_url, index)
    {
      "card" => { "scryfallId" => "00000000-0000-4000-8000-00000000000#{index}",
        "instanceId" => "10000000-0000-4000-8000-00000000000#{index}", "printingExtension" => index },
      "cardName" => name, "frontImageUrl" => "https://images.example/#{index}-front.jpg",
      "backImageUrl" => back_image_url, "commanderExtension" => { "position" => index }
    }
  end

  def with_tabletop(tabletop, &block)
    with_env("TABLETOP_URL" => tabletop.url, "TABLETOP_PUBLIC_URL" => "http://table.example", &block)
  end

  def assert_no_side_effects(tabletop)
    assert_equal 0, DB[:tables].count
    assert_equal 0, DB[:seats].count
    assert_equal 0, DB[:events].count
    assert_empty tabletop.requests
  end

  def assert_trace_context(header, body)
    pattern = /\A00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}\z/
    assert_match pattern, header
    return if body.nil?

    assert_match pattern, body
    assert_equal header.split("-")[1], body.split("-")[1]
  end
end
