# Logging Configuration Guide

## Overview

The application uses environment-aware logging with different levels and formats for development, staging, and production environments.

## Log Levels

The logger supports four log levels (in order of severity):

1. **ERROR** (0) - Critical errors that need immediate attention
2. **WARN** (1) - Warnings about potential issues
3. **INFO** (2) - Informational messages about application flow
4. **DEBUG** (3) - Detailed debugging information

## Default Log Levels by Environment

| Environment | Default Level | What Gets Logged |
|------------|---------------|------------------|
| **Development** | DEBUG | All logs (ERROR, WARN, INFO, DEBUG) |
| **Staging** | INFO | INFO, WARN, ERROR only |
| **Production** | WARN | WARN, ERROR only |

## Environment Detection

The logger detects the environment using the following priority:

1. `ENVIRONMENT` environment variable (if set)
2. `NODE_ENV` environment variable (if set)
3. Defaults to `development`

**Example:**
```bash
# Using NODE_ENV
NODE_ENV=production

# Using ENVIRONMENT (takes precedence)
ENVIRONMENT=staging
NODE_ENV=production  # Ignored if ENVIRONMENT is set
```

## Overriding Log Level

You can override the default log level using the `LOG_LEVEL` environment variable:

```bash
# Force DEBUG logging even in production (for debugging)
LOG_LEVEL=DEBUG
NODE_ENV=production

# Force ERROR-only logging in development
LOG_LEVEL=ERROR
NODE_ENV=development
```

## Log Format

### Development Mode
- **Format**: Human-readable with emojis
- **Example**:
  ```
  🔍 [DEBUG] Database query executed
     {
       "query": "SELECT * FROM users...",
       "duration": "45ms",
       "rows": 1
     }
  ```

### Staging/Production Mode
- **Format**: Structured JSON (one log per line)
- **Example**:
  ```json
  {"timestamp":"2025-12-08T22:00:00.000Z","level":"ERROR","message":"Database query error","environment":"production","query":"SELECT * FROM users...","error":{"message":"Connection timeout"}}
  ```

## Data Sanitization

In staging and production, sensitive data is automatically sanitized:

- **Passwords** - Removed or masked
- **Tokens** - Removed or masked
- **API Keys** - Removed or masked
- **Email addresses** - Optionally sanitized
- **Session data** - Removed
- **Credit card numbers** - Removed
- **SSN** - Removed

**Development**: All data is shown (no sanitization)

## Usage Examples

### Basic Logging

```javascript
import logger from '../utils/logger.js';

// Error logging
logger.error('Failed to send email', error, { userId: 123 });

// Warning logging
logger.warn('Rate limit approaching', { requests: 950, limit: 1000 });

// Info logging
logger.info('User logged in', { userId: 123, email: 'user@example.com' });

// Debug logging (only in development)
logger.debug('Database query executed', { query: 'SELECT...', duration: '45ms' });
```

### Convenience Methods

```javascript
// Database query logging
logger.logDatabaseQuery(query, duration, rowCount);

// API request logging
logger.logApiRequest('POST', '/api/v1/users', 200, 150);

// File operation logging
logger.logFileOperation('upload', '/path/to/file.pdf', true);
```

## Environment Variables

### Required
- `NODE_ENV` or `ENVIRONMENT` - Set to `development`, `staging`, or `production`

### Optional
- `LOG_LEVEL` - Override default log level (`DEBUG`, `INFO`, `WARN`, `ERROR`)
- `SENTRY_DSN` - Sentry DSN for error tracking in production/staging

## Error Tracking Integration

The logger automatically sends errors to error tracking services (like Sentry) in production/staging when `SENTRY_DSN` is configured.

## Best Practices

1. **Use appropriate log levels**:
   - `error()` - For errors that need attention
   - `warn()` - For warnings about potential issues
   - `info()` - For important application events
   - `debug()` - For detailed debugging information

2. **Include context**:
   ```javascript
   // Good
   logger.error('Failed to send email', error, { userId, email: email.substring(0, 5) + '***' });
   
   // Bad
   logger.error('Failed to send email', error);
   ```

3. **Sanitize sensitive data**:
   - Don't log passwords, tokens, or API keys
   - Mask email addresses in production: `email.substring(0, 5) + '***'`
   - The logger automatically sanitizes common sensitive fields

4. **Use structured data**:
   ```javascript
   // Good - structured data
   logger.info('User created', { userId: 123, email: 'user@example.com' });
   
   // Bad - string concatenation
   logger.info(`User created: ${userId} - ${email}`);
   ```

## Migration from console.log

Replace console statements with logger:

```javascript
// Before
console.log('User logged in:', userId);
console.error('Error:', error);

// After
logger.info('User logged in', { userId });
logger.error('Error occurred', error);
```

## Configuration Examples

### Development
```bash
NODE_ENV=development
LOG_LEVEL=DEBUG  # Optional, DEBUG is default
```

### Staging
```bash
ENVIRONMENT=staging
LOG_LEVEL=INFO  # Optional, INFO is default
```

### Production
```bash
NODE_ENV=production
LOG_LEVEL=WARN  # Optional, WARN is default
SENTRY_DSN=https://your-sentry-dsn  # Optional, for error tracking
```

## Services Updated

The following services have been updated to use the logger:

- ✅ `backend/services/emailService.js`
- ✅ `backend/services/database.js`
- ✅ `backend/middleware/errorHandler.js`
- ✅ `backend/server.js`
- ✅ `backend/index.js`

## Testing Log Levels

To test different log levels:

```bash
# Development - see all logs
NODE_ENV=development npm start

# Staging - see info, warn, error
ENVIRONMENT=staging npm start

# Production - see warn, error only
NODE_ENV=production npm start

# Override to see debug logs in production
NODE_ENV=production LOG_LEVEL=DEBUG npm start
```

