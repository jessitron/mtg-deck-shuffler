class SeatsController < ApplicationController
  # Rails' ParamsWrapper otherwise nests the JSON body under params[:seat]
  # (the Seat model's name) whenever a top-level "seat" key is absent —
  # exactly the omit-to-auto-assign case this endpoint needs to support.
  wrap_parameters false

  # POST /tables/:table_id/seats  { "playerName": "...", "seat"?: 1..4 }
  # The Spine mints the seatId and, unless the caller names one, the seat
  # number too (the next open one) — then appends seat.taken.
  # Spectators never call this: spectating needs nothing.
  def create
    table = Table.find(params[:table_id])
    add_table_span_attributes(table)
    seat = table.take_seat!(
      number: params[:seat]&.to_i,
      player_name: params.require(:playerName),
      traceparent: current_traceparent
    )
    render json: seat.as_contract_json.merge("tableId" => table.id), status: :created
  end
end
