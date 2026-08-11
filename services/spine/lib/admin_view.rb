require "erb"

module Spine
  class AdminView
    include ERB::Util

    def initialize(locals)
      locals.each { |key, value| instance_variable_set(:"@#{key}", value) }
    end

    def render(template)
      path = File.join(__dir__, "..", "views", "#{template}.html.erb")
      ERB.new(File.read(path), trim_mode: "-").result(binding)
    end
  end
end
