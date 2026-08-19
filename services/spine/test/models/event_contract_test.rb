require_relative "../test_helper"

class EventContractTest < Minitest::Test
  def test_a_valid_envelope_passes
    Spine::EventContract.validate!(valid_envelope)
  end

  def test_a_sender_claiming_seq_is_rejected
    assert_raises(Spine::EventContract::SpineOwnedField) do
      Spine::EventContract.validate!(valid_envelope("seq" => 1))
    end
  end

  def test_a_sender_claiming_accepted_at_is_rejected
    assert_raises(Spine::EventContract::SpineOwnedField) do
      Spine::EventContract.validate!(valid_envelope("acceptedAt" => "2026-01-01T00:00:00Z"))
    end
  end

  def test_an_envelope_missing_a_required_field_is_rejected
    envelope = valid_envelope
    envelope.delete("origin")

    assert_raises(Spine::EventContract::Violation) do
      Spine::EventContract.validate!(envelope)
    end
  end

  def test_an_unknown_event_name_is_rejected
    assert_raises(Spine::EventContract::UnknownEvent) do
      Spine::EventContract.validate!(valid_envelope("name" => "no.such.event"))
    end
  end

  def test_an_unknown_schema_version_is_rejected
    assert_raises(Spine::EventContract::UnknownEvent) do
      Spine::EventContract.validate!(valid_envelope("schemaVersion" => 99))
    end
  end

  def test_a_payload_that_does_not_match_its_schema_is_rejected
    assert_raises(Spine::EventContract::Violation) do
      Spine::EventContract.validate!(valid_envelope("payload" => { "name" => "kitchen table" }))
    end
  end

  def test_seat_joined_rejects_an_invalid_game_url
    envelope = valid_envelope("payload" => { "deckName" => "Test Deck", "gameUrl" => "not a URL" })

    assert_raises(Spine::EventContract::Violation) do
      Spine::EventContract.validate!(envelope)
    end
  end

  def test_a_non_object_envelope_is_rejected
    assert_raises(Spine::EventContract::Violation) do
      Spine::EventContract.validate!("not a hash")
    end
  end

  def test_an_initiator_with_session_id_is_accepted
    Spine::EventContract.validate!(valid_envelope("initiator" => { "playerName" => "Jess", "sessionId" => SecureRandom.uuid }))
  end

  def test_an_initiator_with_session_id_and_seat_id_is_accepted
    Spine::EventContract.validate!(
      valid_envelope("initiator" => { "playerName" => "Jess", "seatId" => "abc123", "sessionId" => SecureRandom.uuid })
    )
  end

  def test_an_initiator_missing_session_id_is_still_accepted
    # sessionId is optional (per CONTEXT-MAP.md's "Initiator" table): the Spine only
    # passes it through, it never requires it.
    Spine::EventContract.validate!(valid_envelope("initiator" => { "playerName" => "Jess" }))
  end

  def test_an_initiator_with_a_non_string_session_id_is_rejected
    assert_raises(Spine::EventContract::Violation) do
      Spine::EventContract.validate!(valid_envelope("initiator" => { "playerName" => "Jess", "sessionId" => 12345 }))
    end
  end
end
