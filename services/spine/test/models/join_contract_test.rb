require_relative "../test_helper"

class JoinContractTest < Minitest::Test
  def test_a_valid_request_passes
    Spine::JoinContract.validate_request!(request)
  end

  def test_unrecognized_fields_pass_through
    Spine::JoinContract.validate_request!(request("sleeveColor" => "#a1b2c3", "someFutureField" => 1))
  end

  def test_the_pre_rename_game_id_field_does_not_stand_in_for_join_request_id
    body = request
    body["gameId"] = body.delete("joinRequestId")

    assert_raises(Spine::JoinContract::Violation) { Spine::JoinContract.validate_request!(body) }
  end

  def test_each_required_field_is_enforced
    %w[joinRequestId name playerName deckName].each do |field|
      body = request
      body.delete(field)
      assert_raises(Spine::JoinContract::Violation, field) { Spine::JoinContract.validate_request!(body) }
    end
  end

  def test_blank_strings_and_non_objects_are_rejected
    assert_raises(Spine::JoinContract::Violation) { Spine::JoinContract.validate_request!(request("name" => " \t ")) }
    assert_raises(Spine::JoinContract::Violation) { Spine::JoinContract.validate_request!(["kitchen table"]) }
  end

  def test_a_real_response_satisfies_the_response_schema
    Spine::JoinContract.validate_response!(
      "tableId" => "kitchen-table-1a2b3c4d", "seatId" => "jess-1234abcd", "seatNumber" => 1,
      "tableUrl" => "http://table.example/t/kitchen-table-1a2b3c4d?seat=jess-1234abcd"
    )
  end

  def test_a_response_missing_a_field_is_rejected
    assert_raises(Spine::JoinContract::Violation) do
      Spine::JoinContract.validate_response!("tableId" => "t", "seatId" => "s", "seatNumber" => 1)
    end
  end

  private

  def request(overrides = {})
    { "joinRequestId" => "attempt-1", "name" => "kitchen table", "playerName" => "Jess", "deckName" => "Test Deck" }
      .merge(overrides)
  end
end
