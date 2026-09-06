import { getRoomRegistry } from "../../src/server/rooms";

/**
 * Every `seat.joined` opens a live Spine SSE subscription that never closes on its own
 * (`rooms.ts` — a room's subscription lives as long as the registry entry does, same as
 * production). In tests there's no real Spine listening, so `spineSubscriber.ts`'s
 * `connectLoop` fails to connect and retries forever with `setTimeout`, logging via
 * `console.warn` on every attempt. Left open past a test file's own teardown, one of
 * those retries can log *after* vitest starts tearing down the worker environment,
 * surfacing as "Closing rpc while onUserConsoleLog was pending" attributed to whichever
 * file happened to be mid-log — not necessarily the file that leaked the subscription.
 * Call this in `afterAll`, before closing the HTTP server, to stop every subscription
 * this file's tests opened.
 */
export function closeAllSpineSubscriptions(): void {
  for (const entry of getRoomRegistry().values()) {
    entry.spineSubscription?.close();
  }
}
