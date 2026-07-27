class SeatsController < ApplicationController
  # POST /tables/:table_id/seats  { "seat": 1..4, "playerName": "..." }
  # The Spine mints the seatId and appends seat.taken.
  # Spectators never call this: spectating needs nothing.
  def create
    table = Table.find(params[:table_id])
    add_table_span_attributes(table)
    seat = table.take_seat!(
      number: params.require(:seat).to_i,
      player_name: params.require(:playerName),
      traceparent: current_traceparent
    )
    render json: seat.as_contract_json.merge("tableId" => table.id), status: :created
  end
end
