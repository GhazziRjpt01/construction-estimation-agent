export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.name = "HttpError"
    this.status = status
  }
}

export function asEstimateError(err) {
  const message = err instanceof Error ? err.message : "Could not build the estimate"
  if (
    message.startsWith("Missing ") ||
    message.startsWith("No CSI") ||
    message.startsWith("No region") ||
    message.startsWith("No location") ||
    message.startsWith("Database ") ||
    message.startsWith("Foundation ") ||
    message.startsWith("Finish grade") ||
    message.startsWith("Roof pitch") ||
    message.includes("does not match")
  ) {
    const status = message.startsWith("No region") ? 404 : 422
    return new HttpError(status, message)
  }
  return err
}
