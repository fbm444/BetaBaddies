// IMPORTANT: Make sure to import `instrument.js` at the top of your file.
import "./instrument.js";

import app from "./server.js";
import dotenv from "dotenv";
import database from "./services/database.js";
import {
  setupUploadDirectories,
  createGitkeepFiles,
} from "./utils/setupDirectories.js";
import scheduler from "./services/scheduler.js";
import logger from "./utils/logger.js";

// Set up global error handlers to catch unhandled errors (including startup errors)
// These will catch errors that occur before Sentry is fully initialized
process.on("uncaughtException", async (error) => {
  logger.error("Uncaught Exception", error);
  // Try to capture in Sentry if available
  try {
    const Sentry = await import("@sentry/node").catch(() => null);
    if (Sentry && Sentry.default && Sentry.default.captureException) {
      Sentry.default.captureException(error);
      // Give Sentry time to send the error before exiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } catch (sentryError) {
    // Sentry not available, continue with exit
  }
  process.exit(1);
});

process.on("unhandledRejection", async (reason, promise) => {
  logger.error("Unhandled Rejection", { reason, promise });
  // Try to capture in Sentry if available
  try {
    const Sentry = await import("@sentry/node").catch(() => null);
    if (Sentry && Sentry.default && Sentry.default.captureException) {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      Sentry.default.captureException(error);
    }
  } catch (sentryError) {
    // Sentry not available, continue
  }
});

async function main() {
  dotenv.config();
  const port = process.env.SERVER_PORT || process.env.PORT || 3001;
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${port}`;
  const nodeEnv = process.env.NODE_ENV || "development";

  try {
    // Setup upload directories
    await setupUploadDirectories();
    await createGitkeepFiles();

    // Test database connection
    await database.query("SELECT NOW()");
    logger.info("Connected to PostgreSQL database");

    // Start scheduler service for reminders
    try {
      scheduler.start();
      logger.info("Scheduler service started");
    } catch (error) {
      logger.warn("Failed to start scheduler", { error: error.message });
      logger.info("Reminder emails will not be sent automatically");
    }

    // Start server
    // Listen on 0.0.0.0 to accept connections from all network interfaces (required for Railway/cloud)
    app.listen(port, "0.0.0.0", () => {
      logger.info("Server started", {
        port,
        environment: nodeEnv,
        healthCheck: `${backendUrl}/health`,
        apiBase: `${backendUrl}/api/v1`,
      });
      if (nodeEnv === "development") {
        logger.debug("User endpoints available", {
          users: `${backendUrl}/api/v1/users`,
        });
      }
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      logger.info("Received SIGINT. Graceful shutdown...");
      scheduler.stop();
      await database.close();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("Received SIGTERM. Graceful shutdown...");
      scheduler.stop();
      await database.close();
      process.exit(0);
    });
  } catch (error) {
    logger.error("Could not connect to PostgreSQL database", error);
    // Try to capture in Sentry if available
    try {
      const Sentry = await import("@sentry/node").catch(() => null);
      if (Sentry && Sentry.default && Sentry.default.captureException) {
        Sentry.default.captureException(error);
        // Give Sentry time to send the error
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (sentryError) {
      // Sentry not available, continue with exit
    }
    process.exit(1);
  }
}

main().catch(async (error) => {
  logger.error("Fatal error in main", error);
  // Try to capture in Sentry if available
  try {
    const Sentry = await import("@sentry/node").catch(() => null);
    if (Sentry && Sentry.default && Sentry.default.captureException) {
      Sentry.default.captureException(error);
      // Give Sentry time to send the error
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } catch (sentryError) {
    // Sentry not available, continue with exit
  }
  process.exit(1);
});
