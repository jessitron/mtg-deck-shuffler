module Spine
  # A plain-Ruby pub/sub object: appending an event notifies whoever is
  # subscribed to that table. Knows nothing about the wire format that
  # eventually carries a message to a browser (that's lib/sse_stream.rb) —
  # this is testable by pushing a message in and asserting every
  # subscribed listener receives it.
  class TableBroadcaster
    def initialize
      @subscribers = Hash.new { |h, k| h[k] = [] }
      @mutex = Mutex.new
    end

    # A Queue the caller can #pop from to receive future messages for this
    # table. Never replays messages published before this call.
    def subscribe(table_id)
      queue = Queue.new
      @mutex.synchronize { @subscribers[table_id] << queue }
      queue
    end

    def unsubscribe(table_id, queue)
      @mutex.synchronize { @subscribers[table_id].delete(queue) }
    end

    def publish(table_id, message)
      listeners = @mutex.synchronize { @subscribers[table_id].dup }
      listeners.each { |queue| queue << message }
    end
  end

  def self.broadcaster
    @broadcaster ||= TableBroadcaster.new
  end
end
