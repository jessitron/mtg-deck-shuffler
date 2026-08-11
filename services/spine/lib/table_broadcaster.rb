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
  end

  def self.broadcaster
    @broadcaster ||= TableBroadcaster.new
  end
end
