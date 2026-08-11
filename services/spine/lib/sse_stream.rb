require "json"

require_relative "table_broadcaster"

module Spine
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
