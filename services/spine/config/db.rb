require "sequel"

Sequel.default_timezone = :utc

DB = Sequel.sqlite(ENV.fetch("SPINE_DB_PATH", "spine.db"))
