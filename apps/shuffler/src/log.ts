import { logs, SeverityNumber, LogAttributes } from "@opentelemetry/api-logs";

const LOGGER_NAME = "mtg-deck-shuffler";

function emit(severityNumber: SeverityNumber, severityText: string, message: string, attributes: LogAttributes, error?: unknown): void {
  const withException = error instanceof Error ? { ...attributes, ...exceptionAttributes(error) } : attributes;

  logs.getLogger(LOGGER_NAME).emit({
    severityNumber,
    severityText,
    body: message,
    attributes: withException,
  });

  writeToStdout(severityText, message, withException, error);
}

/** OTel's conventional shape for a recorded exception, matching span.recordException. */
function exceptionAttributes(error: Error): LogAttributes {
  return {
    "exception.type": error.name,
    "exception.message": error.message,
    "exception.stacktrace": error.stack ?? "",
  };
}

function writeToStdout(severityText: string, message: string, attributes: LogAttributes, error?: unknown): void {
  // Attributes are the point, so show them; the stack goes last because it's tall.
  const shown = Object.entries(attributes).filter(([key]) => !key.startsWith("exception."));
  const suffix = shown.length ? " " + shown.map(([key, value]) => `${key}=${String(value)}`).join(" ") : "";
  const line = `${severityText} ${message}${suffix}`;

  if (severityText === "ERROR") {
    console.error(line, error instanceof Error ? error : "");
  } else if (severityText === "WARN") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const log = {
  info(message: string, attributes: LogAttributes = {}): void {
    emit(SeverityNumber.INFO, "INFO", message, attributes);
  },

  warn(message: string, attributes: LogAttributes = {}, error?: unknown): void {
    emit(SeverityNumber.WARN, "WARN", message, attributes, error);
  },

  error(message: string, attributes: LogAttributes = {}, error?: unknown): void {
    emit(SeverityNumber.ERROR, "ERROR", message, attributes, error);
  },
};
