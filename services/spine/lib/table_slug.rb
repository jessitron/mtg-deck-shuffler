require "securerandom"

module Spine
  module TableSlug
    def self.name_slug(table_name)
      table_name.to_s.strip.downcase.gsub(/[^a-z0-9]+/, "-").gsub(/\A-+|-+\z/, "")
    end

    # The table's real primary key, minted once at table creation: friendly-but-unique-
    # enough that the table's own id can double as its URL — human-identifiable from the
    # name, not guessable from it alone. `name` already carries a unique DB constraint,
    # so the (vanishingly unlikely) case of two different names colliding on both slug
    # and random suffix needs no extra handling beyond the NameTaken retry callers
    # already do for the name collision itself.
    def self.mint(table_name)
      "#{name_slug(table_name)}-#{SecureRandom.hex(4)}"
    end
  end
end
