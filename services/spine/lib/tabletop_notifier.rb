require "json"
require "net/http"
require "uri"
require "cgi"

module Spine
  class TabletopNotifier
    TIMEOUT_SECONDS = 1

    def initialize(span: OpenTelemetry::Trace.current_span)
      @span = span
    end

    def send_joined(event:, table_name:, replayed:)
      base_url = ENV["TABLETOP_URL"]
      return record("missing_config") if base_url.nil? || base_url.strip.empty?

      uri = event_uri(base_url, table_name)
      envelope = event.as_envelope.merge("tableId" => table_name)
      carrier = {}
      OpenTelemetry.propagation.inject(carrier)
      envelope["traceparent"] = carrier["traceparent"] if carrier["traceparent"]
      body = JSON.generate(envelope)

      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = uri.scheme == "https"
      http.open_timeout = TIMEOUT_SECONDS
      http.read_timeout = TIMEOUT_SECONDS
      http.write_timeout = TIMEOUT_SECONDS
      request = Net::HTTP::Post.new(uri.request_uri, "Content-Type" => "application/json")
      request.body = body
      response = http.request(request)

      if response.is_a?(Net::HTTPSuccess)
        record(replayed ? "sent_replay" : "sent")
      else
        record("non_2xx", "tabletop.send.status_code" => response.code.to_i)
      end
    rescue URI::InvalidURIError, ArgumentError
      record("invalid_config")
    rescue Timeout::Error
      record("timeout")
    rescue StandardError => error
      record("network_error", "tabletop.send.error_type" => error.class.name)
    end

    private

    def event_uri(base_url, table_name)
      uri = URI.parse(base_url)
      unless uri.is_a?(URI::HTTP) && uri.host && uri.query.nil? && uri.fragment.nil?
        raise URI::InvalidURIError, "TABLETOP_URL must be an HTTP(S) base URL"
      end

      prefix = uri.path.to_s.sub(%r{/+\z}, "")
      uri.path = "#{prefix}/api/tables/#{escape_path_component(table_name)}/events"
      uri
    end

    def escape_path_component(value)
      CGI.escapeURIComponent(value)
    end

    def record(result, attributes = {})
      @span.add_attributes({ "tabletop.send.result" => result }.merge(attributes))
      nil
    end
  end
end