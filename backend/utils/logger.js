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
    this.level = this.getLogLevel();
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  getLogLevel() {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
      return LOG_LEVELS[envLevel];
    }
    // Default: ERROR in production, DEBUG in development
    return process.env.NODE_ENV === 'production' 
      ? LOG_LEVELS.ERROR 
      : LOG_LEVELS.DEBUG;
  }

  shouldLog(level) {
    return level <= this.level;
  }

  formatMessage(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const levelName = Object.keys(LOG_LEVELS).find(
      key => LOG_LEVELS[key] === level
    );

    if (this.isProduction) {
      // Structured JSON logging for production
      return JSON.stringify({
        timestamp,
        level: levelName,
        message,
        ...data,
        environment: process.env.NODE_ENV,
      });
    } else {
      // Human-readable logging for development
      const emoji = {
        ERROR: '❌',
        WARN: '⚠️',
        INFO: 'ℹ️',
        DEBUG: '🔍',
      }[levelName] || '📝';

      let output = `${emoji} [${levelName}] ${message}`;
      if (Object.keys(data).length > 0) {
        output += `\n   ${JSON.stringify(data, null, 2)}`;
      }
      return output;
    }
  }

  error(message, error = null, data = {}) {
    if (!this.shouldLog(LOG_LEVELS.ERROR)) return;

    const logData = { ...data };
    if (error) {
      logData.error = {
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
        code: error.code,
        ...(error.response && { status: error.response.status }),
      };
    }

    const formatted = this.formatMessage(LOG_LEVELS.ERROR, message, logData);
    console.error(formatted);

    // In production, send to error tracking service (e.g., Sentry)
    if (this.isProduction && error) {
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
    this.debug('Database query executed', {
      query: query.substring(0, 100) + '...',
      duration: `${duration}ms`,
      rows: rowCount,
    });
  }

  logApiRequest(method, path, statusCode, duration) {
    const level = statusCode >= 500 ? LOG_LEVELS.ERROR : 
                  statusCode >= 400 ? LOG_LEVELS.WARN : 
                  LOG_LEVELS.INFO;
    
    if (this.shouldLog(level)) {
      this.formatMessage(level, `${method} ${path}`, {
        statusCode,
        duration: `${duration}ms`,
      });
      console.log(this.formatMessage(level, `${method} ${path}`, {
        statusCode,
        duration: `${duration}ms`,
      }));
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

