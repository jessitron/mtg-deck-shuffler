class CreateTables < ActiveRecord::Migration[8.1]
  def change
    # The primary key IS the tableId: a GUID the Spine mints at creation.
    create_table :tables, id: :string do |t|
      t.string :name, null: false
      t.string :status, null: false, default: "active"
      t.timestamps
    end
    # The name is a lookup alias, unique only among ACTIVE tables.
    add_index :tables, :name, unique: true, where: "status = 'active'"
  end
end
