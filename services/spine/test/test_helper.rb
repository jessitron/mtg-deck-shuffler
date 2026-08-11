ENV["RACK_ENV"] ||= "test"
ENV["SPINE_DB_PATH"] ||= ":memory:"

require "minitest/autorun"
require "rack/test"

require_relative "../app"

module ClearsTablesBetweenTests
  def before_setup
    super
    DB[:events].delete
    DB[:seats].delete
    DB[:tables].delete
  end
end

Minitest::Test.include(ClearsTablesBetweenTests)
