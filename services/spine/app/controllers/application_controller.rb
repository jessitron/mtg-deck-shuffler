class ApplicationController < ActionController::Base
  # No sessions, no auth, no browser-origin state — API + admin screen only.
  skip_forgery_protection

  rescue_from EventContract::Violation do |error|
    render json: { error: error.message }, status: :unprocessable_content
  end

  rescue_from Table::NameTaken, Table::SeatOccupied do |error|
    render json: { error: error.message }, status: :conflict
  end

  rescue_from ActiveRecord::RecordNotFound do |error|
    render json: { error: error.message }, status: :not_found
  end

  private

  # The traceparent of the current request's span: what the Spine stamps on
  # events it initiates itself (table.created, seat.taken via the join endpoint).
  def current_traceparent
    span = OpenTelemetry::Trace.current_span.context
    if span.valid?
      format("00-%s-%s-%02x", span.hex_trace_id, span.hex_span_id, span.trace_flags.sampled? ? 1 : 0)
    else
      "00-#{SecureRandom.hex(16)}-#{SecureRandom.hex(8)}-01"
    end
  end

  def add_table_span_attributes(table)
    OpenTelemetry::Trace.current_span.add_attributes(
      "table.id" => table.id, "table.name" => table.name
    )
  end
end
