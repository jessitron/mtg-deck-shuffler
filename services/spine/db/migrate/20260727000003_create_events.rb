class CreateEvents < ActiveRecord::Migration[8.1]
  def change
    # One append-only log per table. Rows are never updated or deleted.
    create_table :events do |t|
      t.string :table_id, null: false
      t.string :event_id, null: false      # sender-minted GUID (envelope `id`)
      t.integer :seq, null: false          # Spine-assigned, monotonic per table
      t.string :name, null: false
      t.datetime :accepted_at, null: false # Spine's clock, on append
      t.datetime :occurred_at              # sender's clock, optional
      t.string :initiator, null: false
      t.string :occurred_in, null: false
      t.string :visibility, null: false
      t.string :traceparent, null: false
      t.integer :schema_version, null: false
      t.json :payload, null: false
      t.timestamps
    end
    add_index :events, [ :table_id, :event_id ], unique: true # dedup on sender id
    add_index :events, [ :table_id, :seq ], unique: true      # one seq per position
  end
end
