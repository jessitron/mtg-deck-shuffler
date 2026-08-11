require "roda"
require "json"

require_relative "config/telemetry"
require_relative "config/db"
require_relative "models/table"
require_relative "models/seat"
require_relative "models/event"
require_relative "lib/sse_stream"
require_relative "lib/admin_view"

module Spine
  class App < Roda
    use(*OpenTelemetry::Instrumentation::Rack::Instrumentation.instance.middleware_args)

    route do |r|
      r.get "up" do
        response["Content-Type"] = "text/plain"
        "ok"
      end

      r.post "tables", String, "events" do |table_id|
        response["Content-Type"] = "application/json"
        table = Table[table_id]
        next not_found("no table #{table_id.inspect}") if table.nil?

        envelope = JSON.parse(r.body.read)
        outcome = table.append_event!(envelope)
        current_span.add_attributes(
          "table.id" => table.id,
          "event.id" => outcome[:event].event_id,
          "event.name" => outcome[:event].name,
          "event.result" => (outcome[:duplicate] ? "duplicate" : "accepted")
        )
        response.status = outcome[:duplicate] ? 200 : 201
        JSON.generate(outcome[:event].as_envelope)
      rescue JSON::ParserError => e
        mark_span_failed("event.result", "invalid_input", e)
        response.status = 400
        JSON.generate(error: "request body is not JSON: #{e.message}")
      rescue EventContract::Violation => e
        mark_span_failed("event.result", "contract_violation", e)
        response.status = 422
        JSON.generate(error: e.message)
      end

      r.get "tables", String, "events", "stream" do |table_id|
        table = Table[table_id]
        if table.nil?
          response["Content-Type"] = "application/json"
          next not_found("no table #{table_id.inspect}")
        end

        current_span.add_attributes("table.id" => table.id)
        request.halt [
          200,
          { "Content-Type" => "text/event-stream", "Cache-Control" => "no-cache" },
          SseStream.new(table_id)
        ]
      end

      r.get "admin", "tables" do
        response["Content-Type"] = "text/html"
        render_admin("admin/tables/index", tables: Table.order(:name).all)
      end

      r.get "admin", "tables", String do |table_id|
        response["Content-Type"] = "text/html"
        table = Table[table_id]
        next not_found_html("no table #{table_id.inspect}") if table.nil?

        render_admin("admin/tables/show",
          table: table,
          events: table.events_dataset.order(:seq).all,
          team_slug: ENV.fetch("HONEYCOMB_TEAM_SLUG", "modernity"),
          env_slug: ENV.fetch("HONEYCOMB_ENV_SLUG", "local"))
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
        mark_span_failed("join.result", "invalid_input", e)
        response.status = 400
        JSON.generate(error: "name and playerName are required")
      rescue Table::SeatOccupied, Table::TableFull => e
        mark_span_failed("join.result", e.is_a?(Table::SeatOccupied) ? "seat_occupied" : "table_full", e)
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

    def mark_span_failed(attribute, result, error)
      current_span.add_attributes(attribute => result)
      current_span.status = OpenTelemetry::Trace::Status.error(error.message)
    end

    def not_found(message)
      response.status = 404
      JSON.generate(error: message)
    end

    def not_found_html(message)
      response.status = 404
      message
    end

    def render_admin(template, locals)
      AdminView.new(locals).render(template)
    end

    def required_string(hash, key)
      value = hash.fetch(key)
      raise KeyError, "#{key} must be a non-blank string" unless value.is_a?(String) && !value.empty?

      value
    end
  end
end
