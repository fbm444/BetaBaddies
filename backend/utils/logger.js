/**
 * Structured Logging Utility
 * Provides environment-aware logging with levels and structured output
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

class Logger {
  constructor() {
    this.environment = this.getEnvironment();
    this.level = this.getLogLevel();
    this.isProduction = this.environment === "production";
    this.isStaging = this.environment === "staging";
    this.isDevelopment = this.environment === "development";
  }

  getEnvironment() {
    // Check NODE_ENV first, then ENVIRONMENT (for Railway/Vercel)
    const nodeEnv = process.env.NODE_ENV?.toLowerCase();
    const envVar = process.env.ENVIRONMENT?.toLowerCase();

    // Priority: ENVIRONMENT > NODE_ENV > default to development
    if (envVar && ["development", "staging", "production"].includes(envVar)) {
      return envVar;
    }
    if (nodeEnv && ["development", "staging", "production"].includes(nodeEnv)) {
      return nodeEnv;
    }
    return "development"; // Default fallback
  }

  getLogLevel() {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
      return LOG_LEVELS[envLevel];
    }

    // Default log levels by environment:
    // - Development: DEBUG (all logs)
    // - Staging: INFO (info, warn, error)
    // - Production: ERROR (only errors and warnings)
    switch (this.environment) {
      case "production":
        return LOG_LEVELS.WARN; // WARN and ERROR in production
      case "staging":
        return LOG_LEVELS.INFO; // INFO, WARN, ERROR in staging
      case "development":
      default:
        return LOG_LEVELS.DEBUG; // All logs in development
    }
  }

  shouldLog(level) {
    return level <= this.level;
  }

  formatMessage(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const levelName = Object.keys(LOG_LEVELS).find(
      (key) => LOG_LEVELS[key] === level
    );

    // Sanitize sensitive data in production/staging
    const sanitizedData = this.sanitizeData(data, level);

    if (this.isProduction || this.isStaging) {
      // Structured JSON logging for production/staging
      return JSON.stringify({
        timestamp,
        level: levelName,
        message,
        environment: this.environment,
        ...sanitizedData,
      });
    } else {
      // Human-readable logging for development
      const emoji =
        {
          ERROR: "❌",
          WARN: "⚠️",
          INFO: "ℹ️",
          DEBUG: "🔍",
        }[levelName] || "📝";

      let output = `${emoji} [${levelName}] ${message}`;
      if (Object.keys(sanitizedData).length > 0) {
        output += `\n   ${JSON.stringify(sanitizedData, null, 2)}`;
      }
      return output;
    }
  }

  /**
   * Sanitize sensitive data from logs in production/staging
   */
  sanitizeData(data, level) {
    if (this.isDevelopment) {
      return data; // Show all data in development
    }

    const sensitiveKeys = [
      "password",
      "token",
      "secret",
      "apiKey",
      "accessKey",
      "refreshToken",
      "authorization",
      "cookie",
      "session",
      "creditCard",
      "ssn",
      "email", // Optionally sanitize email in production
    ];

    const sanitized = { ...data };

    // Remove sensitive keys or mask them
    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
        if (level === LOG_LEVELS.ERROR && this.isProduction) {
          // Keep key name but mask value for errors
          sanitized[key] = "[REDACTED]";
        } else {
          // Remove entirely for non-error logs
          delete sanitized[key];
        }
      }
    }

    // Sanitize nested objects
    for (const key of Object.keys(sanitized)) {
      if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key], level);
      }
    }

    return sanitized;
  }

  error(message, error = null, data = {}) {
    if (!this.shouldLog(LOG_LEVELS.ERROR)) return;

    const logData = { ...data };
    if (error) {
      logData.error = {
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
        code: error.code,
        name: error.name,
        ...(error.response && {
          status: error.response.status,
          statusText: error.response.statusText,
        }),
      };
    }

    const formatted = this.formatMessage(LOG_LEVELS.ERROR, message, logData);
    console.error(formatted);

    // In production/staging, send to error tracking service (e.g., Sentry)
    if ((this.isProduction || this.isStaging) && error) {
      this.sendToErrorTracking(error, { message, ...logData });
    }
  }

  warn(message, data = {}) {
    if (!this.shouldLog(LOG_LEVELS.WARN)) return;
    const formatted = this.formatMessage(LOG_LEVELS.WARN, message, data);
    console.warn(formatted);
  }

  info(message, data = {}) {
    if (!this.shouldLog(LOG_LEVELS.INFO)) return;
    const formatted = this.formatMessage(LOG_LEVELS.INFO, message, data);
    console.log(formatted);
  }

  debug(message, data = {}) {
    if (!this.shouldLog(LOG_LEVELS.DEBUG)) return;
    const formatted = this.formatMessage(LOG_LEVELS.DEBUG, message, data);
    console.log(formatted);
  }

  sendToErrorTracking(error, context = {}) {
    // Integration point for error tracking services
    // Example: Sentry, Rollbar, etc.
    if (process.env.SENTRY_DSN) {
      // Sentry integration would go here
      // Sentry.captureException(error, { extra: context });
    }
  }

  // Convenience methods for common patterns
  logDatabaseQuery(query, duration, rowCount) {
    this.debug("Database query executed", {
      query: query.substring(0, 100) + "...",
      duration: `${duration}ms`,
      rows: rowCount,
    });
  }

  logApiRequest(method, path, statusCode, duration) {
    const level =
      statusCode >= 500
        ? LOG_LEVELS.ERROR
        : statusCode >= 400
        ? LOG_LEVELS.WARN
        : LOG_LEVELS.INFO;

    if (this.shouldLog(level)) {
      this.formatMessage(level, `${method} ${path}`, {
        statusCode,
        duration: `${duration}ms`,
      });
      console.log(
        this.formatMessage(level, `${method} ${path}`, {
          statusCode,
          duration: `${duration}ms`,
        })
      );
    }
  }

  logFileOperation(operation, filePath, success, error = null) {
    if (success) {
      this.debug(`File ${operation}`, { filePath });
    } else {
      this.error(`File ${operation} failed`, error, { filePath });
    }
  }
}

// Export singleton instance
export default new Logger();
