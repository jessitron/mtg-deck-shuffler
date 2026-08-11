require "erb"

module Spine
  # Renders the admin screen's ERB templates (views/admin/**). Locals become
  # instance variables, same convention Rails views use, but spelled out
  # here in plain Ruby rather than supplied by a framework.
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
