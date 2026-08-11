require_relative "../test_helper"

# Production serves the Spine at mtg.jessitron.honeydemo.io/spine, behind the
# same ALB as the Shuffler (no path-stripping available on ALB ingress — see
# SEAMAP.md deploy notes). SPINE_BASE_PATH makes the app answer under that
# prefix everywhere: externally via the ALB, and internally, since the
# Shuffler's SPINE_URL in prod is also http://spine-service/spine. Local dev
# leaves SPINE_BASE_PATH unset, so behavior there is unchanged.
class BasePathTest < Minitest::Test
  include Rack::Test::Methods

  def app
    Spine::App
  end

  def with_base_path(value)
    previous = ENV["SPINE_BASE_PATH"]
    ENV["SPINE_BASE_PATH"] = value
    yield
  ensure
    previous.nil? ? ENV.delete("SPINE_BASE_PATH") : (ENV["SPINE_BASE_PATH"] = previous)
  end

  def test_default_base_path_is_empty_so_existing_behavior_is_unchanged
    get "/up"

    assert_equal 200, last_response.status
  end

  def test_up_answers_under_a_configured_base_path
    with_base_path("/spine") do
      get "/spine/up"

      assert_equal 200, last_response.status
      assert_equal "ok", last_response.body
    end
  end

  def test_the_bare_path_no_longer_answers_once_a_base_path_is_set
    with_base_path("/spine") do
      get "/up"

      assert_equal 404, last_response.status
    end
  end

  def test_admin_links_stream_url_and_static_assets_all_carry_the_base_path
    with_base_path("/spine") do
      post "/spine/join", JSON.generate(name: "kitchen table #{SecureRandom.uuid}", playerName: "Jess"),
        "CONTENT_TYPE" => "application/json"
      table_id = JSON.parse(last_response.body).fetch("tableId")

      get "/spine/admin/tables"
      assert_includes last_response.body, "/spine/admin/tables/#{table_id}"

      get "/spine/admin/tables/#{table_id}"
      assert_includes last_response.body, "/spine/tables/#{table_id}/events/stream"
      assert_includes last_response.body, '<script src="/spine/hny.js"></script>'

      get "/spine/hny.js"
      assert_equal 200, last_response.status
    end
  end
end
