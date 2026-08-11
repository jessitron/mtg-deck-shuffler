require "roda"

require_relative "config/telemetry"
require_relative "config/db"

module Spine
  class App < Roda
    use(*OpenTelemetry::Instrumentation::Rack::Instrumentation.instance.middleware_args)

    route do |r|
      r.get "up" do
        response["Content-Type"] = "text/plain"
        "ok"
      end
    end
  end
end
