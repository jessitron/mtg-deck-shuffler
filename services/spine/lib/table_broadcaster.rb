module Spine
  class TableBroadcaster
    def initialize
      @subscribers = Hash.new { |h, k| h[k] = [] }
      @mutex = Mutex.new
    end

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

    # Pushes message to every open subscriber across every table, so a single
    # server-shutdown signal can unblock every held-open SSE stream at once.
    def close_all(message)
      listeners = @mutex.synchronize { @subscribers.values.flatten }
      listeners.each { |queue| queue << message }
    end

    def open_stream_count
      @mutex.synchronize { @subscribers.values.sum(&:size) }
    end
  end

  def self.broadcaster
    @broadcaster ||= TableBroadcaster.new
  end
end
