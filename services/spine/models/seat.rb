module Spine
  # A seated player. Seat identity (id) is distinct from the player's display
  # name — player names are not unique.
  class Seat < Sequel::Model(:seats)
    unrestrict_primary_key

    many_to_one :table
  end
end
