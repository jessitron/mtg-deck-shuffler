export interface InstallShutdownHandlersOptions {
  /** How long to wait for `drain()` before exiting anyway. Default 5000ms. */
  timeoutMs?: number;
  /** Injectable so tests don't have to kill the test process. Default `process.exit`. */
  exit?: (code: number) => void;
  /** Injectable so tests don't have to send real signals. Default `process`. */
  signalSource?: NodeJS.EventEmitter;
  /** Default `["SIGTERM", "SIGINT"]`. */
  signals?: NodeJS.Signals[];
  onTimeout?: () => void;
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
