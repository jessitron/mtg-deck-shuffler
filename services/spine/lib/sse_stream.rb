require "json"

require_relative "table_broadcaster"

module Spine
  class SseStream
    CLOSE = Object.new.freeze

    # An SSE comment line — legal per spec, ignored by EventSource and by the Tabletop's
    # hand-rolled parser (it only acts on lines starting with "data: ").
    HEARTBEAT_FRAME = ": heartbeat\n\n"

    # Puma (like most Rack servers) doesn't flush a streamed response's headers until the body's
    # `each` yields its first chunk — so a table with no event yet would otherwise never even
    # send headers, and the subscriber's client-side headers timeout would be the only thing
    # standing between "healthy, just quiet" and "actually hung". Yielding a heartbeat
    # immediately, then again every HEARTBEAT_INTERVAL_SECONDS while nothing is published, turns
    # that into a real liveness signal: the client can use a short headers timeout (since headers
    # now arrive right away) and a bounded body timeout (silence longer than a couple of
    # heartbeats means the connection is actually dead), instead of disabling detection outright.
    HEARTBEAT_INTERVAL_SECONDS = 15

    def initialize(table_id, heartbeat_interval_seconds: HEARTBEAT_INTERVAL_SECONDS)
      @table_id = table_id
      @queue = Spine.broadcaster.subscribe(table_id)
      @heartbeat_interval_seconds = heartbeat_interval_seconds
    end

    def each
      yield HEARTBEAT_FRAME
      loop do
        message = @queue.pop(timeout: @heartbeat_interval_seconds)
        if message.nil?
          yield HEARTBEAT_FRAME
          next
        end
        break if message.equal?(CLOSE)

        yield "data: #{JSON.generate(message)}\n\n"
      end
    end

    def close
      Spine.broadcaster.unsubscribe(@table_id, @queue)
      @queue << CLOSE
    end
  end
end
