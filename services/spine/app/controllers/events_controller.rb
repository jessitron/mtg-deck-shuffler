class EventsController < ApplicationController
  # POST /tables/:table_id/events — the ingestion endpoint.
  #
  # Body: a contract envelope (contracts/envelope.v1.json). Validated on
  # receipt; unknown name/schemaVersion fails loudly (422). Dedup on the
  # sender-minted id: a retried duplicate gets the already-accepted event back.
  # The Spine assigns seq and acceptedAt; a sender claiming either is rejected.
  #
  # Inbound W3C trace context (the traceparent header) is picked up by the Rack
  # instrumentation, so this request joins the sender's trace.
  def create
    table = Table.find(params[:table_id])
    add_table_span_attributes(table)

    envelope = JSON.parse(request.body.read)
    already_there = table.events.exists?(event_id: envelope.is_a?(Hash) ? envelope["id"] : nil)
    event = table.append_event!(envelope)

    render json: event.as_envelope, status: already_there ? :ok : :created
  rescue JSON::ParserError => e
    render json: { error: "request body is not JSON: #{e.message}" }, status: :bad_request
  end
end
