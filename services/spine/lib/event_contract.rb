require "json_schemer"
require "pathname"

module Spine
  # Validates events against the fleet's published language: the JSON Schemas in
  # contracts/ at the repo root. Fail loudly — an unknown name, unknown version, or
  # invalid envelope/payload is a hard error, never a best-effort parse.
  # (contracts/README.md; notes/DESIGN-event-contract-v0.md)
  module EventContract
    ENVELOPE_VERSION = 3

    # Any way an event can violate the published language.
    class Violation < StandardError; end

    # A sender claimed a Spine-owned field (seq / acceptedAt).
    class SpineOwnedField < Violation; end

    # No schema exists for this name at this schemaVersion.
    class UnknownEvent < Violation; end

    class << self
      def contracts_dir
        Pathname.new(ENV.fetch("CONTRACTS_DIR", File.expand_path("../../../contracts", __dir__)))
      end

      # Validates a sender-submitted envelope (a Hash with string keys).
      # Raises a Violation subclass, or returns the envelope.
      def validate!(envelope)
        raise Violation, "event must be a JSON object" unless envelope.is_a?(Hash)

        if envelope.key?("seq") || envelope.key?("acceptedAt")
          raise SpineOwnedField,
            "seq and acceptedAt are Spine-assigned on append; senders must not send them"
        end

        envelope_errors = envelope_schema.validate(envelope).map { |e| e.fetch("error") }
        unless envelope_errors.empty?
          raise Violation, "envelope does not match envelope.v#{ENVELOPE_VERSION}: #{envelope_errors.join("; ")}"
        end

        schema = payload_schema(envelope["name"], envelope["schemaVersion"])
        payload_errors = schema.validate(envelope["payload"]).map { |e| e.fetch("error") }
        unless payload_errors.empty?
          raise Violation,
            "payload does not match #{envelope["name"]}.v#{envelope["schemaVersion"]}: #{payload_errors.join("; ")}"
        end

        envelope
      end

      def payload_schema(name, schema_version)
        file = contracts_dir.join("payloads", "#{name}.v#{schema_version}.json")
        unless name.is_a?(String) && schema_version.is_a?(Integer) && file.file?
          raise UnknownEvent,
            "no contract for event name=#{name.inspect} schemaVersion=#{schema_version.inspect} — " \
            "the published language fails loudly on unknown kinds"
        end
        schema_cache[file.to_s] ||= JSONSchemer.schema(file.read, format: true)
      end

      def envelope_schema
        file = contracts_dir.join("envelope.v#{ENVELOPE_VERSION}.json")
        schema_cache[file.to_s] ||= JSONSchemer.schema(file.read, format: true)
      end

      private

      def schema_cache
        @schema_cache ||= {}
      end
    end
  end
end
