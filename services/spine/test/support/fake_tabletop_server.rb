require "socket"

class FakeTabletopServer
  attr_reader :port

  def initialize(status: 200, delay: 0)
    @status = status
    @delay = delay
    @requests = []
    @mutex = Mutex.new
    @request_arrived = ConditionVariable.new
    @server = TCPServer.new("127.0.0.1", 0)
    @port = @server.addr[1]
    @workers = []
    @thread = Thread.new { accept_requests }
  end

  def url
    "http://127.0.0.1:#{port}"
  end

  def requests
    @mutex.synchronize { @requests.dup }
  end

  def wait_for_requests(count, timeout: 2)
    deadline = Process.clock_gettime(Process::CLOCK_MONOTONIC) + timeout
    @mutex.synchronize do
      while @requests.length < count
        remaining = deadline - Process.clock_gettime(Process::CLOCK_MONOTONIC)
        break if remaining <= 0

        @request_arrived.wait(@mutex, remaining)
      end
      @requests.dup
    end
  end

  def stop
    @server.close unless @server.closed?
    @thread.join(1)
    @workers.each { |worker| worker.kill.join }
  end

  private

  def accept_requests
    loop do
      socket = @server.accept
      @workers << Thread.new(socket) { |client| handle(client) }
    end
  rescue IOError, Errno::EBADF
    nil
  end

  def handle(socket)
    request_line = socket.gets&.strip
    return if request_line.nil?

    method, path, = request_line.split(" ")
    headers = read_headers(socket)
    body = socket.read(headers.fetch("content-length", "0").to_i)
    @mutex.synchronize do
      @requests << { method: method, path: path, headers: headers, body: body }
      @request_arrived.broadcast
    end

    sleep @delay
    response_body = JSON.generate(ok: @status.between?(200, 299))
    socket.write("HTTP/1.1 #{@status} #{reason}\r\n")
    socket.write("Content-Type: application/json\r\n")
    socket.write("Content-Length: #{response_body.bytesize}\r\n")
    socket.write("Connection: close\r\n\r\n#{response_body}")
  rescue IOError, Errno::EPIPE, Errno::ECONNRESET
    nil
  ensure
    socket.close unless socket.closed?
  end

  def read_headers(socket)
    headers = {}
    while (line = socket.gets)
      break if line == "\r\n"

      key, value = line.split(":", 2)
      headers[key.downcase] = value.strip
    end
    headers
  end

  def reason
    @status.between?(200, 299) ? "OK" : "Error"
  end
end
