module Admin
  # The developer's window into the log: a table's events, human-readably,
  # each linking to its trace in Honeycomb. Refreshes itself (v0: reload).
  class TablesController < ApplicationController
    def index
      @tables = Table.order(created_at: :desc)
    end

    def show
      @table = Table.find(params[:id])
      add_table_span_attributes(@table)
      @events = @table.events.order(:seq)
      @seats = @table.seats.order(:number)
    end
  end
end
