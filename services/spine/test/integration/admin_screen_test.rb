require_relative "../test_helper"
require "cgi"

class AdminScreenTest < Minitest::Test
  include Rack::Test::Methods

  def app
    Spine::App
  end

  def join(name:, player_name: "Jess", **decoration)
    post_join({ "name" => name, "playerName" => player_name }.merge(decoration.transform_keys(&:to_s)))
    JSON.parse(last_response.body)
  end

  def test_the_index_lists_every_table_that_currently_exists
    kitchen = join(name: "kitchen table #{SecureRandom.uuid}")
    garage = join(name: "garage table #{SecureRandom.uuid}")

    get "/admin/tables"

    assert_equal 200, last_response.status
    assert_includes last_response.body, "/admin/tables/#{kitchen["tableId"]}"
    assert_includes last_response.body, "/admin/tables/#{garage["tableId"]}"
  end

  def test_the_index_lists_tables_newest_first
    older = join(name: "older table #{SecureRandom.uuid}")
    newer = join(name: "newer table #{SecureRandom.uuid}")

    get "/admin/tables"

    body = last_response.body
    newer_index = body.index("/admin/tables/#{newer["tableId"]}")
    older_index = body.index("/admin/tables/#{older["tableId"]}")
    assert newer_index < older_index
  end

  def test_a_tables_show_page_lists_its_full_event_log_in_order
    table_id = join(name: "kitchen table #{SecureRandom.uuid}")["tableId"]
    envelope = valid_envelope("tableId" => table_id, "initiator" => { "playerName" => "Robin" })
    post "/tables/#{table_id}/events", JSON.generate(envelope), "CONTENT_TYPE" => "application/json"

    get "/admin/tables/#{table_id}"

    assert_equal 200, last_response.status
    body = last_response.body
    assert_includes body, 'data-seq="1"' # table.created, minted by join
    assert_includes body, 'data-seq="2"' # seat.taken, minted by join
    assert_includes body, 'data-seq="3"' # seat.joined, minted by join
    assert_includes body, 'data-seq="4"' # posted above
    seq1 = body.index('data-seq="1"')
    seq2 = body.index('data-seq="2"')
    seq3 = body.index('data-seq="3"')
    seq4 = body.index('data-seq="4"')
    assert seq1 < seq2
    assert seq2 < seq3
    assert seq3 < seq4
    assert_includes body, "Robin"
  end

  def test_the_show_page_contains_the_full_seat_joined_payload
    decoration = {
      "deckName" => "Admin Deck", "playmatImageUrl" => "https://images.example/playmat.jpg",
      "sleeveColor" => "#a1b2c3", "gameUrl" => "https://shuffler.example/game/admin",
      "commanders" => [{
        "card" => { "scryfallId" => "00000000-0000-4000-8000-000000000001",
          "instanceId" => "10000000-0000-4000-8000-000000000001" },
        "cardName" => "Commander", "frontImageUrl" => "https://images.example/front.jpg",
        "backImageUrl" => nil
      }]
    }
    table_id = join(name: "admin table", **decoration.transform_keys(&:to_sym))["tableId"]

    get "/admin/tables/#{table_id}"

    row = last_response.body[/<tr data-seq="3".*?<\/tr>/m]
    rendered_payload = JSON.parse(CGI.unescapeHTML(row[/<pre>(.*?)<\/pre>/m, 1]))
    assert_equal decoration, rendered_payload
  end

  def test_the_show_page_subscribes_to_the_tables_live_sse_stream
    table_id = join(name: "kitchen table #{SecureRandom.uuid}")["tableId"]

    get "/admin/tables/#{table_id}"

    assert_includes last_response.body, "EventSource"
    assert_includes last_response.body, "/tables/#{table_id}/events/stream"
  end

  def test_rows_present_before_the_page_was_opened_render_without_a_trace_link
    table_id = join(name: "kitchen table #{SecureRandom.uuid}")["tableId"]

    get "/admin/tables/#{table_id}"

    row = last_response.body[/<tr data-seq="1".*?<\/tr>/m]
    refute_nil row
    refute_includes row, "ui.honeycomb.io"
  end

  def test_an_unknown_table_is_not_found
    get "/admin/tables/no-such-table"

    assert_equal 404, last_response.status
  end

  def test_the_show_page_loads_the_browser_tracer_and_continues_the_trace_on_display
    table_id = join(name: "kitchen table #{SecureRandom.uuid}")["tableId"]

    get "/admin/tables/#{table_id}"

    body = last_response.body
    assert_includes body, '<script src="/hny.js"></script>'
    assert_includes body, "initHoneycombTracing("
    assert_includes body, "Hny.inChildSpan("
    assert_includes body, "table.event.displayed"
  end

  def test_hny_js_is_served_as_a_static_asset
    get "/hny.js"

    assert_equal 200, last_response.status
    assert_includes last_response.body, "initializeTracing"
  end
end
