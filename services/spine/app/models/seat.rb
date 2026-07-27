# A seat at a table, 1-4. A projection of seat.taken events — the log is the
# truth; this is the current seating. The primary key is the seatId (a short
# GUID): seat identity is its own thing, because player names are not unique.
class Seat < ApplicationRecord
  belongs_to :table

  validates :number, inclusion: { in: 1..4 }
  validates :player_name, presence: true

  def as_contract_json
    { "seatId" => id, "seat" => number, "playerName" => player_name }
  end
end
