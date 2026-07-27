class TablesController < ApplicationController
  # POST /tables  { "name": "...", "creator": "..." }
  # The Spine mints the tableId; creation appends table.created to the new log.
  def create
    table = Table.create_with_event!(
      name: params.require(:name),
      creator: params.require(:creator),
      traceparent: current_traceparent
    )
    add_table_span_attributes(table)
    render json: table_json(table), status: :created
  end

  # GET /tables/lookup?name=...  — join by name (the Discord trust model).
  def lookup
    table = Table.active.find_by(name: params.require(:name))
    if table.nil?
      render json: { error: "no active table named #{params[:name].inspect}" }, status: :not_found
      return
    end
    add_table_span_attributes(table)
    render json: table_json(table)
  end

  private

  def table_json(table)
    {
      "tableId" => table.id,
      "name" => table.name,
      "seats" => table.seats.order(:number).map(&:as_contract_json)
    }
  end
end
