/**
 * AppError - Custom operational error class.
 *
 * Operational errors (validation failures, not-found, auth errors) are
 * expected and should be communicated to the client with a clear message and
 * HTTP status code.  Programming errors (bugs) bubble up as unhandled and are
 * caught by the global error handler which returns a generic 500.
 *
 * Usage:
 *   throw new AppError('Task not found', 404)
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error description sent to client.
   * @param {number} statusCode - HTTP status code (4xx or 5xx).
   */
  constructor (message, statusCode) {
    super(message)
    this.statusCode = statusCode
    /** Flag that distinguishes known operational errors from programming bugs. */
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}

module.exports = AppError
