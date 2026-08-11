require "json"

require_relative "table_broadcaster"

module Spine
  # A Rack streaming body. Subscribes to a table's live event feed on
  # construction, formats each message as an SSE `data:` frame, and
  # unsubscribes on #close (called by the web server on client disconnect,
  # or by a test cleaning up). The wire format lives entirely here —
  # TableBroadcaster knows nothing about SSE.
  class SseStream
    CLOSE = Object.new.freeze

    def initialize(table_id)
      @table_id = table_id
      @queue = Spine.broadcaster.subscribe(table_id)
    end

    def each
      loop do
        message = @queue.pop
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
