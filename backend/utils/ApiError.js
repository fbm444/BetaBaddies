/**
 * Custom API Error class for consistent error handling
 */
export class ApiError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.status = statusCode; // For compatibility with error handler
    this.code = code || "API_ERROR";

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}
