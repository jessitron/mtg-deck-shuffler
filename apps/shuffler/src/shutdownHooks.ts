/**
 * Flush-and-exit on SIGTERM/SIGINT.
 *
 * With no signal handler installed, Node terminates immediately on SIGTERM —
 * which is what `verify.sh`'s `cleanup()` sends, and what k8s sends on every
 * pod termination. That drops whatever OTel batch hasn't flushed yet (up to
 * `BatchSpanProcessor`'s `scheduledDelayMillis`, 5s by default), on every
 * verify run and every prod shutdown.
 *
 * Installing a handler changes that default: once one exists, Node no longer
 * exits on its own, so this must call `exit()` itself once the drain settles
 * — same bounded-wait shape as `test/harness-telemetry/harnessTracing.ts`'s
 * `bounded()` helper (a `Promise.race` against an `unref()`'d timer), so a
 * hung exporter can't outlast a k8s termination grace period. `shuttingDown`
 * guards against firing twice if both signals arrive.
 */
export interface InstallShutdownHandlersOptions {
  /** How long to wait for `drain()` before exiting anyway. Default 5000ms. */
  timeoutMs?: number;
  /** Injectable so tests don't have to kill the test process. Default `process.exit`. */
  exit?: (code: number) => void;
  /** Injectable so tests don't have to send real signals. Default `process`. */
  signalSource?: NodeJS.EventEmitter;
  /** Default `["SIGTERM", "SIGINT"]`. */
  signals?: NodeJS.Signals[];
  /**
   * Called if `timeoutMs` elapses before `drain()` settles, so the caller can
   * record it (there's no live span to hang it on by then — this file stays
   * log-agnostic on purpose, see tracing.ts for the actual `log.warn`).
   */
  onTimeout?: () => void;
  /**
   * Called with the rejection if `drain()` rejects, for the same reason as
   * `onTimeout` — the caller logs it, this file stays log-agnostic.
   */
  onDrainError?: (error: unknown) => void;
}

export function installShutdownHandlers(drain: () => Promise<void>, options: InstallShutdownHandlersOptions = {}): void {
  const timeoutMs = options.timeoutMs ?? 5000;
  const exit = options.exit ?? ((code: number) => process.exit(code));
  const signalSource = options.signalSource ?? process;
  const signals = options.signals ?? ["SIGTERM", "SIGINT"];
  const onTimeout = options.onTimeout ?? (() => {});
  const onDrainError = options.onDrainError ?? (() => {});

  let shuttingDown = false;

  function handleSignal(): void {
    if (shuttingDown) return;
    shuttingDown = true;

    const drained = drain()
      .catch((error: unknown) => {
        // A telemetry problem on the way out must not become an unhandled
        // rejection or block the exit that follows — but the caller still
        // gets to know about it.
        onDrainError(error);
      })
      .then(() => "drained" as const);
    const timedOut = new Promise<"timedOut">((resolve) => {
      setTimeout(() => resolve("timedOut"), timeoutMs).unref();
    });

    Promise.race([drained, timedOut]).then((which) => {
      if (which === "timedOut") onTimeout();
      exit(0);
    });
  }

  for (const signal of signals) {
    signalSource.on(signal, handleSignal);
  }
}
