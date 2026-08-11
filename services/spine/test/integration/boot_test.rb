require_relative "../test_helper"

class BootTest < Minitest::Test
  include Rack::Test::Methods

  def app
    Spine::App
  end

  def test_up_reports_healthy
    get "/up"

    assert_equal 200, last_response.status
    assert_equal "ok", last_response.body
  end
end
