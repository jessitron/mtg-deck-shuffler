# Every open SSE stream (`GET /tables/:table_id/events/stream`) pins one Puma
# thread for its whole life — `SseStream#each` blocks on `Queue#pop`, a real
# thread wait, not an event loop. Puma's undeclared default (`max_threads: 5`)
# meant a single 4-player table (4 Shuffler subscriptions + 1 Tabletop
# subscription = 5 streams) could fill every thread, leaving none for the
# readiness probe — which is what produced a past `ECONNREFUSED` storm;
# the shutdown hang below was an amplifier, not the trigger.
# A parked thread costs ~72 KB RSS and no measurable CPU.
threads 8, 64

# Despite its name, Puma fires `after_stopped` right when it starts graceful
# shutdown (before it blocks waiting for in-flight requests to finish) — see
# Puma::Launcher#do_graceful_stop, which calls `@events.fire_after_stopped!`
# before `@runner.stop_blocked`. That makes it the right hook to close every
# open SSE stream: without this, a held-open stream never finishes on its
# own, Puma waits forever, and Kubernetes SIGKILLs the pod once
# terminationGracePeriodSeconds expires.
#
# The hook body runs inside Puma's SIGTERM signal trap itself
# (Launcher#setup_signals traps SIGTERM directly to do_graceful_stop), where
# Ruby forbids Mutex#synchronize ("can't be called from trap context") —
# and TableBroadcaster#close_all needs one to read @subscribers safely. Hand
# the work to a plain Thread so it runs outside the trap.
after_stopped do
  Thread.new do
    require_relative "../lib/sse_stream"
    Spine.broadcaster.close_all(Spine::SseStream::CLOSE)
  end
end
