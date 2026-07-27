module ApplicationHelper
  # Build the Honeycomb trace URL from an event's recorded traceparent.
  # Team/environment come from env vars: locally telemetry lands in `local`,
  # in prod it lands in `mtg-deck-shuffler` (see k8s/configmap.yaml).
  # Traces expire (~60d) — a dead link on an old event is expected, by design.
  def honeycomb_trace_url(event)
    team = ENV.fetch("HONEYCOMB_TEAM_SLUG", "modernity")
    environment = ENV.fetch("HONEYCOMB_ENV_SLUG", "local")
    "https://ui.honeycomb.io/#{team}/environments/#{environment}/trace?trace_id=#{event.trace_id}"
  end
end
