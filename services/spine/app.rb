require "roda"
require "json"

require_relative "config/telemetry"
require_relative "config/db"
require_relative "models/table"
require_relative "models/seat"
require_relative "models/event"

module Spine
  class App < Roda
    use(*OpenTelemetry::Instrumentation::Rack::Instrumentation.instance.middleware_args)

    route do |r|
      r.get "up" do
        response["Content-Type"] = "text/plain"
        "ok"
      end

      r.post "join" do
        response["Content-Type"] = "application/json"
        body = JSON.parse(r.body.read)
        raise KeyError, "body must be a JSON object" unless body.is_a?(Hash)

        name = required_string(body, "name")
        player_name = required_string(body, "playerName")
        current_span.add_attributes("table.name" => name, "player.name" => player_name)

        outcome = join_table(name: name, player_name: player_name)
        current_span.add_attributes(
          "join.result" => (outcome[:created] ? "created" : "joined"),
          "seat.number" => outcome[:seat_number]
        )
        JSON.generate(tableId: outcome[:table_id], seatNumber: outcome[:seat_number])
      rescue JSON::ParserError, KeyError => e
        mark_span_failed("invalid_input", e)
        response.status = 400
        JSON.generate(error: "name and playerName are required")
      rescue Table::SeatOccupied, Table::TableFull => e
        mark_span_failed(e.is_a?(Table::SeatOccupied) ? "seat_occupied" : "table_full", e)
        response.status = 409
        JSON.generate(error: e.message)
      end
    end

    # A second name-taken race means someone else's create won between our
    # lookup and our create attempt — the table now exists, so join it.
    def join_table(name:, player_name:)
      Table.join!(name: name, player_name: player_name)
    rescue Table::NameTaken
      Table.join!(name: name, player_name: player_name)
    end

    def current_span
      OpenTelemetry::Trace.current_span
    end

    def mark_span_failed(result, error)
      current_span.add_attributes("join.result" => result)
      current_span.status = OpenTelemetry::Trace::Status.error(error.message)
    end

    def required_string(hash, key)
      value = hash.fetch(key)
      raise KeyError, "#{key} must be a non-blank string" unless value.is_a?(String) && !value.empty?

      value
    end
  end
end
