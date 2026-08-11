module Spine
  # One row in a table's append-only log. `event_id` is the sender-minted
  # GUID (the envelope's `id`); `seq` is the Spine-assigned, authoritative
  # order within the table's log.
  class Event < Sequel::Model(:events)
    many_to_one :table
  end
end
