require "sequel"

Sequel.default_timezone = :utc

DB = Sequel.sqlite(ENV.fetch("SPINE_DB_PATH", "spine.db"))

DB.create_table? :tables do
  String :id, primary_key: true
  String :name, null: false, unique: true
end

DB.create_table? :seats do
  String :id, primary_key: true
  String :table_id, null: false
  Integer :number, null: false
  String :player_name, null: false
  String :game_id
  index %i[table_id number], unique: true
  index :game_id, unique: true, name: :seats_game_id_unique
end

DB.create_table? :events do
  primary_key :id
  String :event_id, null: false
  String :table_id, null: false
  Integer :seq, null: false
  String :name, null: false
  String :initiator, null: false
  String :initiator_seat_id
  String :occurred_in, null: false
  String :origin, null: false
  String :significance, null: false
  Integer :schema_version, null: false
  String :payload, null: false, text: true
  Time :accepted_at, null: false
  Time :occurred_at
  index %i[table_id event_id], unique: true
  index %i[table_id seq], unique: true
end

seat_columns = DB.schema(:seats).map(&:first)
unless seat_columns.include?(:game_id)
  DB.alter_table(:seats) { add_column :game_id, String }
end
DB.run("CREATE UNIQUE INDEX IF NOT EXISTS seats_game_id_unique ON seats(game_id)")

event_columns = DB.schema(:events).map(&:first)
unless event_columns.include?(:initiator_seat_id)
  DB.alter_table(:events) { add_column :initiator_seat_id, String }
end
