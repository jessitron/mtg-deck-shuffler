require_relative "../test_helper"
require "open3"
require "rbconfig"
require "tmpdir"

class SchemaMigrationTest < Minitest::Test
  CONFIG_PATH = File.expand_path("../../config/db.rb", __dir__)

  def test_an_old_database_gains_idempotent_join_columns_and_unique_game_ids
    with_database(seats_have_game_id: false) do |path|
      2.times { migrate(path) }

      db = Sequel.sqlite(path)
      assert_includes db.schema(:seats).map(&:first), :game_id
      assert db.indexes(:seats).values.any? { |index| index[:unique] && index[:columns] == [:game_id] }
      assert_includes db.schema(:events).map(&:first), :initiator_seat_id
      db.disconnect
    end
  end

  def test_a_partially_migrated_database_finishes_cleanly
    with_database(seats_have_game_id: true) do |path|
      migrate(path)

      db = Sequel.sqlite(path)
      assert_equal 1, db.schema(:seats).map(&:first).count(:game_id)
      assert_includes db.schema(:events).map(&:first), :initiator_seat_id
      db.disconnect
    end
  end

  private

  def migrate(path)
    _stdout, stderr, status = Open3.capture3(
      { "SPINE_DB_PATH" => path }, RbConfig.ruby, "-rbundler/setup", "-e",
      "require ARGV.fetch(0)", CONFIG_PATH
    )
    assert status.success?, stderr
  end

  def with_database(seats_have_game_id:)
    Dir.mktmpdir("spine-migration") do |dir|
      path = File.join(dir, "spine.db")
      db = Sequel.sqlite(path)
      create_old_schema(db, seats_have_game_id: seats_have_game_id)
      db.disconnect
      yield path
    end
  end

  def create_old_schema(db, seats_have_game_id:)
    db.create_table(:tables) do
      String :id, primary_key: true
      String :name, null: false, unique: true
    end
    db.create_table(:seats) do
      String :id, primary_key: true
      String :table_id, null: false
      Integer :number, null: false
      String :player_name, null: false
      String :game_id, unique: true if seats_have_game_id
      index %i[table_id number], unique: true
    end
    db.create_table(:events) do
      primary_key :id
      String :event_id, null: false
      String :table_id, null: false
      Integer :seq, null: false
      String :name, null: false
      String :initiator, null: false
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
  end
end
