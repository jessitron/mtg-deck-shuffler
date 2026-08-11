module Spine
  class Seat < Sequel::Model(:seats)
    unrestrict_primary_key

    many_to_one :table
  end
end
