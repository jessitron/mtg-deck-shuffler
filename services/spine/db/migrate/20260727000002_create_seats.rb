class CreateSeats < ActiveRecord::Migration[8.1]
  def change
    # A projection of seat.taken events: the current seating at each table.
    # The primary key IS the seatId (a short GUID; player names are not unique).
    create_table :seats, id: :string do |t|
      t.string :table_id, null: false
      t.integer :number, null: false
      t.string :player_name, null: false
      t.timestamps
    end
    add_index :seats, [ :table_id, :number ], unique: true
  end
end
