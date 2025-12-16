import express from "express";
import { asyncHandler } from "../middleware/errorHandler.js";

// Import Sentry - use dynamic import to handle potential import failures
let Sentry = null;
(async () => {
  try {
    const sentryModule = await import("@sentry/node");
    Sentry = sentryModule.default || sentryModule;
  } catch (error) {
    // Sentry not available, will use null checks
  }
})();

const router = express.Router();

/**
 * Test endpoint for Sentry error tracking
 * GET /api/v1/test/sentry-error
 * 
 * This endpoint intentionally throws a 500 error to test Sentry integration.
 * Use this to verify that errors are being captured and sent to Sentry.
 */
router.get("/sentry-error", asyncHandler(async (req, res) => {
  // Add some context for Sentry
  if (Sentry) {
    Sentry.setUser({
      id: req.session?.userId || "anonymous",
      email: req.session?.userEmail || "test@example.com",
    });
    Sentry.setTag("test_endpoint", "sentry-error");
    Sentry.setContext("test_info", {
      purpose: "Testing Sentry error capture",
      endpoint: "/api/v1/test/sentry-error",
      method: req.method,
      timestamp: new Date().toISOString(),
    });
  }

  // Intentionally throw an error to test Sentry
  throw new Error("Test 500 Error: This is a deliberate error for testing Sentry integration");
}));

/**
 * Test endpoint for Sentry with custom error message
 * GET /api/v1/test/sentry-error-custom?message=Custom error message
 */
router.get("/sentry-error-custom", asyncHandler(async (req, res) => {
  const customMessage = req.query.message || "Custom test error";
  
  if (Sentry) {
    Sentry.setTag("error_type", "custom_test");
    Sentry.setContext("custom_error", {
      message: customMessage,
      query: req.query,
    });
  }

  throw new Error(customMessage);
}));

/**
 * Test endpoint for Sentry with async error
 * GET /api/v1/test/sentry-async-error
 */
router.get("/sentry-async-error", asyncHandler(async (req, res) => {
  // Simulate an async operation that fails
  await new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error("Async test error: This simulates an async operation failure"));
    }, 100);
  });
}));

export default router;

