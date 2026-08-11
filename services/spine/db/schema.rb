# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_08_10_000001) do
  create_table "events", force: :cascade do |t|
    t.datetime "accepted_at", null: false
    t.datetime "created_at", null: false
    t.string "event_id", null: false
    t.string "initiator", null: false
    t.string "name", null: false
    t.datetime "occurred_at"
    t.string "occurred_in", null: false
    t.string "origin", null: false
    t.json "payload", null: false
    t.integer "schema_version", null: false
    t.integer "seq", null: false
    t.string "significance", null: false
    t.string "table_id", null: false
    t.string "traceparent", null: false
    t.datetime "updated_at", null: false
    t.string "visibility", null: false
    t.index ["table_id", "event_id"], name: "index_events_on_table_id_and_event_id", unique: true
    t.index ["table_id", "seq"], name: "index_events_on_table_id_and_seq", unique: true
  end

  create_table "seats", id: :string, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "number", null: false
    t.string "player_name", null: false
    t.string "table_id", null: false
    t.datetime "updated_at", null: false
    t.index ["table_id", "number"], name: "index_seats_on_table_id_and_number", unique: true
  end

  create_table "tables", id: :string, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.string "status", default: "active", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_tables_on_name", unique: true, where: "status = 'active'"
  end
end
