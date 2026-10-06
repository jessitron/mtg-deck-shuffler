require_relative "event_contract"

module Spine
  # The published language for POST /join: contracts/requests/join.v1.json and
  # contracts/responses/join.v1.json.
  module JoinContract
    VERSION = 1

    class Violation < StandardError; end

    class << self
      def validate_request!(body)
        validate!(EventContract.schema_at("requests", "join.v#{VERSION}.json"), body, "join request")
      end

      def validate_response!(body)
        validate!(EventContract.schema_at("responses", "join.v#{VERSION}.json"), body, "join response")
      end

      private

      def validate!(schema, body, what)
        errors = schema.validate(body).map { |e| e.fetch("error") }
        raise Violation, "#{what} does not match join.v#{VERSION}: #{errors.join("; ")}" unless errors.empty?

        body
      end
    end
  end
end
