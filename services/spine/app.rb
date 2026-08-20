require "roda"
require "json"
require "cgi"

require_relative "config/telemetry"
require_relative "config/db"
require_relative "models/table"
require_relative "models/seat"
require_relative "models/event"
require_relative "lib/sse_stream"
require_relative "lib/admin_view"
require_relative "lib/tabletop_notifier"

module Spine
  class App < Roda
    plugin :public, root: File.join(__dir__, "public")

    use(*OpenTelemetry::Instrumentation::Rack::Instrumentation.instance.middleware_args)

    def self.base_path
      ENV.fetch("SPINE_BASE_PATH", "")
    end

    route do |r|
      prefix = self.class.base_path.delete_prefix("/")

      if prefix.empty?
        r.public
        dispatch(r)
      else
        r.on prefix do
          r.public
          dispatch(r)
        end
      end
    end

    def dispatch(r)
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
        tables = Table.order(:name).all
        current_span.add_attributes("admin.table_count" => tables.size)
        render_admin("admin/tables/index", tables: tables, base_path: self.class.base_path)
      end

      r.get "admin", "tables", String do |table_id|
        response["Content-Type"] = "text/html"
        table = Table[table_id]
        if table.nil?
          mark_span_failed("admin.result", "not_found", StandardError.new("no table #{table_id.inspect}"))
          next not_found_html("no table #{table_id.inspect}")
        end

        current_span.add_attributes("table.id" => table.id, "admin.result" => "found")
        render_admin("admin/tables/show",
          table: table,
          base_path: self.class.base_path,
          events: table.events_dataset.order(:seq).all,
          team_slug: ENV.fetch("HONEYCOMB_TEAM_SLUG", "modernity"),
          env_slug: ENV.fetch("HONEYCOMB_ENV_SLUG", "local"),
          honeycomb_api_key: ENV["HONEYCOMB_API_KEY"])
      end

      r.post "join" do
        response["Content-Type"] = "application/json"
        body = JSON.parse(r.body.read)
        raise KeyError, "body must be a JSON object" unless body.is_a?(Hash)

        game_id = required_string(body, "gameId")
        name = required_string(body, "name")
        player_name = required_string(body, "playerName")
        required_string(body, "deckName")
        decoration = body.reject { |key, _value| %w[gameId name playerName].include?(key) }
        current_span.add_attributes("table.name" => name, "player.name" => player_name, "game.id" => game_id)

        outcome = join_table(name: name, game_id: game_id,
          player_name: player_name, decoration: decoration)
        TabletopNotifier.new(span: current_span).send_joined(
          event: outcome[:joined_event],
          table_id: outcome[:table_id],
          replayed: outcome[:replayed]
        )
        current_span.add_attributes(
          "join.result" => join_result(outcome),
          "seat.id" => outcome[:seat_id],
          "table.position" => outcome[:table_position]
        )
        JSON.generate(
          tableId: outcome[:table_id],
          seatId: outcome[:seat_id],
          seatNumber: outcome[:table_position],
          tableUrl: table_url(outcome[:table_id], outcome[:seat_id])
        )
      rescue JSON::ParserError, KeyError => e
        mark_span_failed("join.result", "invalid_input", e)
        response.status = 400
        JSON.generate(error: "gameId, name, playerName, and deckName are required")
      rescue EventContract::Violation => e
        mark_span_failed("join.result", "contract_violation", e)
        response.status = 422
        JSON.generate(error: e.message)
      rescue Table::SeatOccupied, Table::TableFull => e
        mark_span_failed("join.result", e.is_a?(Table::SeatOccupied) ? "seat_occupied" : "table_full", e)
        response.status = 409
        JSON.generate(error: e.message)
      end
    end

    def join_table(name:, game_id:, player_name:, decoration:)
      Table.join!(name: name, game_id: game_id,
        player_name: player_name, decoration: decoration)
    rescue Table::NameTaken
      Table.join!(name: name, game_id: game_id,
        player_name: player_name, decoration: decoration)
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
      response["Content-Type"] = "text/html"
      response.status = 404
      message
    end

    def render_admin(template, locals)
      AdminView.new(locals).render(template)
    end

    def required_string(hash, key)
      value = hash.fetch(key)
      unless value.is_a?(String) && !value.strip.empty?
        raise KeyError, "#{key} must be a non-blank string"
      end

      value
    end

    def join_result(outcome)
      return "replayed" if outcome[:replayed]

      outcome[:created] ? "created" : "joined"
    end

    def table_url(table_id, seat_id)
      base = ENV.fetch("TABLETOP_PUBLIC_URL", "http://localhost:5180").sub(%r{/+\z}, "")
      "#{base}/t/#{CGI.escapeURIComponent(table_id)}?seat=#{CGI.escapeURIComponent(seat_id)}"
    end
  end
end
