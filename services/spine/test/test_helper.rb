ENV["RACK_ENV"] ||= "test"
ENV["SPINE_DB_PATH"] ||= ":memory:"

require "minitest/autorun"
require "rack/test"

require_relative "../app"
