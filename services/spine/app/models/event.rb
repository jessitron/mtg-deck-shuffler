# One entry in a table's append-only log. Never updated, never deleted —
# supersession happens by appending, not rewriting. Enforced here: a persisted
# Event is read-only.
class Event < ApplicationRecord
  belongs_to :table

  def readonly?
    persisted? && !destroyed?
  end

  before_destroy { raise ActiveRecord::ReadOnlyRecord, "the event log is append-only" }

  # The event as the contract sees it: full envelope, Spine-assigned fields included.
  def as_envelope
    {
      "id" => event_id,
      "tableId" => table_id,
      "seq" => seq,
      "name" => name,
      "acceptedAt" => accepted_at.utc.iso8601(3),
      "occurredAt" => occurred_at&.utc&.iso8601(3),
      "initiator" => initiator,
      "occurredIn" => occurred_in,
      "visibility" => visibility,
      "traceparent" => traceparent,
      "schemaVersion" => schema_version,
      "payload" => payload
    }.compact
  end

  def trace_id
    traceparent.split("-")[1]
  end
end
