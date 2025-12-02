// Async handler wrapper to catch errors in async route handlers
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Centralized error handler
export const errorHandler = (err, req, res, next) => {
  console.error("🚨 API Error:", err.message || err);

  // Only log detailed error information in development or for unexpected errors
  const knownErrorCodes = ["23505", "23503", "23514", "DUPLICATE_SKILL"];
  const isKnownError =
    knownErrorCodes.includes(err.code) ||
    err.message?.includes("already exists") ||
    [
      "UNAUTHORIZED",
      "FORBIDDEN",
      "INVALID_TOKEN",
      "TOKEN_EXPIRED",
      "VALIDATION_ERROR",
      "RATE_LIMIT_EXCEEDED",
    ].includes(err.message);

  if (!isKnownError) {
    console.error("🚨 Unexpected error details:", {
      message: err.message,
      code: err.code,
      constraint: err.constraint,
      detail: err.detail,
    });
  }

  // Database constraint errors - handle both direct and nested PostgreSQL errors
  const errorCode = err.code || (err.originalError && err.originalError.code);

  if (errorCode === "23505") {
    // Unique constraint violation
    const constraint =
      err.constraint ||
      (err.originalError && err.originalError.constraint) ||
      "";

    // Provide more specific error messages based on the constraint
    let fieldMessage = "already exists";
    if (constraint.includes("email")) {
      fieldMessage = "A user with this email address already exists";
    } else if (constraint.includes("skill")) {
      fieldMessage = "A skill with this name already exists";
    }

    return res.status(409).json({
      ok: false,
      error: {
        code: "CONFLICT",
        message: "A resource with this information already exists",
        detail: fieldMessage,
        constraint: constraint,
      },
    });
  }

  if (errorCode === "23503") {
    // Foreign key constraint violation
    return res.status(400).json({
      ok: false,
      error: {
        code: "INVALID_REFERENCE",
        message: "Referenced resource does not exist",
      },
    });
  }

  if (errorCode === "23514") {
    // Check constraint violation
    return res.status(422).json({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Data validation failed",
      },
    });
  }

  // Handle custom duplicate error codes
  if (errorCode === "DUPLICATE_SKILL" || err.message === "DUPLICATE_SKILL") {
    return res.status(409).json({
      ok: false,
      error: {
        code: "DUPLICATE_SKILL",
        message: "A skill with this name already exists",
      },
    });
  }

  // Handle "already exists" error messages
  if (err.message && err.message.includes("already exists")) {
    return res.status(409).json({
      ok: false,
      error: {
        code: "CONFLICT",
        message: err.message,
      },
    });
  }

  // Custom error handling based on error messages
  if (err.message === "UNAUTHORIZED") {
    return res.status(401).json({
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    });
  }

  if (err.message === "FORBIDDEN") {
    return res.status(403).json({
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: "Access denied",
      },
    });
  }

  if (err.message === "INVALID_TOKEN") {
    return res.status(401).json({
      ok: false,
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid authentication token",
      },
    });
  }

  if (err.message === "TOKEN_EXPIRED") {
    return res.status(401).json({
      ok: false,
      error: {
        code: "TOKEN_EXPIRED",
        message: "Authentication token has expired",
      },
    });
  }

  if (err.message === "VALIDATION_ERROR") {
    return res.status(422).json({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: err.message,
      },
    });
  }

  if (err.message === "RATE_LIMIT_EXCEEDED") {
    return res.status(429).json({
      ok: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
      },
    });
  }

  // Handle UUID validation errors
  if (errorCode === "22P02" || err.message?.includes("invalid input syntax for type uuid")) {
    return res.status(400).json({
      ok: false,
      error: {
        code: "INVALID_ID",
        message: err.message || "Invalid ID format. Expected UUID.",
      },
    });
  }

  // Handle "Invalid resume ID format" errors
  if (err.message?.includes("Invalid resume ID format") || err.message?.includes("Invalid ID format")) {
    return res.status(400).json({
      ok: false,
      error: {
        code: "INVALID_ID",
        message: err.message || "Invalid ID format. Expected UUID.",
      },
    });
  }

  // Handle "Cannot delete" errors (e.g., resume has children)
  if (err.message?.includes("Cannot delete") || err.message?.includes("cannot delete")) {
    return res.status(400).json({
      ok: false,
      error: {
        code: "DELETE_FAILED",
        message: err.message || "Cannot delete this resource.",
      },
    });
  }

  // Handle "Resume not found" errors
  if (err.message?.includes("Resume not found") || err.message?.includes("not found")) {
    return res.status(404).json({
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: err.message || "Resource not found.",
      },
    });
  }

  // Default to 500 Internal Server Error, but preserve the original error message if available
  // This helps with debugging and provides better user feedback
  const statusCode = err.statusCode || err.status || 500;
  const errorMessage = err.message || "An unexpected error occurred";
  
  // Log full error details for debugging
  if (errorMessage.includes("is_default") || errorMessage.includes("column") || errorMessage.includes("does not exist")) {
    console.error("🚨 Database column error detected:", {
      message: errorMessage,
      code: err.code,
      detail: err.detail,
      hint: err.hint,
      stack: err.stack,
      query: err.query,
      position: err.position,
    });
  }
  
  res.status(statusCode).json({
    ok: false,
    error: {
      code: err.code || "INTERNAL_SERVER_ERROR",
      message: errorMessage,
      detail: err.detail || undefined,
    },
  });
};

// 404 handler
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    ok: false,
    error: {
      code: "NOT_FOUND",
      message: "The requested resource was not found",
    },
  });
};
