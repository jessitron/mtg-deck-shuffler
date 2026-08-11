# Envelope v2 (contracts/envelope.v2.json): every event now carries `origin`
# (which mechanism minted it) and `significance` (physical/domain/administrative).
# No existing rows to backfill — this fleet has no real producers/consumers yet
# (same "free right now" window map 5 ticket 01 already used for this same bump).
class AddOriginAndSignificanceToEvents < ActiveRecord::Migration[8.1]
  def change
    add_column :events, :origin, :string, null: false
    add_column :events, :significance, :string, null: false
  end
end
