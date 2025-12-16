# Backend Architecture

## Overview

The BetaBaddies backend is a RESTful API built with Node.js and Express.js, following a layered architecture pattern with clear separation of concerns.

## Architecture Layers

### 1. Presentation Layer (Routes & Controllers)

**Location**: `routes/`, `controllers/`

- **Routes**: Define API endpoints and HTTP methods
- **Controllers**: Handle HTTP requests, validate input, call services, format responses
- **Middleware**: Authentication, authorization, validation, error handling

**Example Flow**:

```
HTTP Request → Route → Middleware → Controller → Service → Database
```

### 2. Business Logic Layer (Services)

**Location**: `services/`

Services contain the core business logic and orchestrate data operations:

- **Domain Services**: Business logic for specific domains (users, jobs, interviews, etc.)
- **External Services**: Integration with third-party APIs (Google, LinkedIn, OpenAI, etc.)
- **Utility Services**: Shared functionality (email, file upload, geocoding, etc.)

**Key Services**:

- `userService.js` - User management and authentication
- `jobOpportunityService.js` - Job tracking and management
- `interviewService.js` - Interview scheduling and tracking
- `resumeService.js` - Resume generation and management
- `analyticsService.js` - Analytics and reporting
- `emailService.js` - Email sending (SES/SMTP)
- `fileUploadService.js` - File handling (S3/local)

### 3. Data Access Layer

**Location**: `services/database.js`

- **Database Service**: PostgreSQL connection pooling and query execution
- **Connection Pooling**: Uses `pg.Pool` for efficient database connections
- **Transaction Support**: Built-in transaction handling

```javascript
// Example usage
import database from "./services/database.js";

// Simple query
const result = await database.query("SELECT * FROM users WHERE id = $1", [
  userId,
]);

// Transaction
await database.transaction(async (client) => {
  await client.query("INSERT INTO ...");
  await client.query("UPDATE ...");
});
```

### 4. Infrastructure Layer

**Location**: `utils/`, `config/`, `middleware/`

- **Configuration**: Database config, Passport strategies, environment variables
- **Utilities**: Logging, error handling, helpers
- **Middleware**: CORS, rate limiting, security headers, authentication

## Design Patterns

### 1. Service Pattern

Each domain has a dedicated service class that encapsulates business logic:

```javascript
class JobOpportunityService {
  async createJobOpportunity(userId, jobData) {
    // Validation
    // Business logic
    // Database operations
    // Return result
  }
}
```

### 2. Repository Pattern (Implicit)

Services act as repositories, abstracting database access:

```javascript
// Service handles all database queries
// Controllers never directly access database
```

### 3. Middleware Pattern

Express middleware for cross-cutting concerns:

- **Authentication**: `middleware/auth.js`
- **Authorization**: `middleware/admin.js`
- **Validation**: `middleware/validation.js`
- **Error Handling**: `middleware/errorHandler.js`

### 4. Dependency Injection

Services are imported and used in controllers:

```javascript
import jobOpportunityService from "../services/jobOpportunityService.js";

// Controller uses service
const job = await jobOpportunityService.createJobOpportunity(userId, data);
```

## Request Flow

```
1. HTTP Request arrives
   ↓
2. Express middleware stack
   - Helmet (security headers)
   - CORS (cross-origin)
   - Body parser
   - Session management
   - Rate limiting
   ↓
3. Route matching
   - Route defined in routes/*.js
   - Middleware applied (auth, validation)
   ↓
4. Controller
   - Extract request data
   - Validate input
   - Call service layer
   - Format response
   ↓
5. Service Layer
   - Business logic
   - Data validation
   - Database operations
   - External API calls
   ↓
6. Database
   - Connection from pool
   - Query execution
   - Result returned
   ↓
7. Response
   - JSON formatted
   - Status code set
   - Sent to client
```

## Security Architecture

### 1. Authentication

- **Passport.js**: OAuth strategies (Google, LinkedIn) and local authentication
- **Session Management**: Express-session with secure cookies
- **Password Hashing**: bcrypt with salt rounds

### 2. Authorization

- **Role-based**: Admin, candidate, team member roles
- **Resource-based**: Users can only access their own resources
- **Middleware**: `requireAuth`, `requireAdmin` middleware

### 3. Security Headers

- **Helmet.js**: Sets security headers (CSP, HSTS, X-Frame-Options, etc.)
- **CORS**: Configurable origin whitelist
- **Rate Limiting**: Prevents abuse and DDoS

### 4. Input Validation

- **Joi**: Schema validation for request bodies
- **Sanitization**: Input sanitization in middleware
- **SQL Injection Prevention**: Parameterized queries only

## Database Architecture

### Connection Management

- **Connection Pooling**: PostgreSQL connection pool via `pg.Pool`
- **Pool Configuration**: Managed in `config/db.config.js`
- **Error Handling**: Automatic reconnection and error recovery

### Transaction Support

```javascript
// Atomic operations
await database.transaction(async (client) => {
  await client.query("BEGIN");
  // Multiple operations
  await client.query("COMMIT");
});
```

### Query Logging

All queries are logged with:

- Query text (truncated)
- Execution duration
- Row count

## Error Handling

### Error Hierarchy

1. **Validation Errors**: 400 Bad Request
2. **Authentication Errors**: 401 Unauthorized
3. **Authorization Errors**: 403 Forbidden
4. **Not Found Errors**: 404 Not Found
5. **Server Errors**: 500 Internal Server Error

### Error Middleware

```javascript
// Global error handler
app.use(errorHandler);

// Structured error responses
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

## File Structure

```
backend/
├── config/              # Configuration
│   ├── db.config.js     # Database configuration
│   ├── passport.js      # Authentication strategies
│   └── interviewBenchmarks.js
├── controllers/         # Request handlers (40+ controllers)
├── middleware/          # Express middleware
│   ├── auth.js         # Authentication middleware
│   ├── admin.js        # Admin authorization
│   ├── validation.js   # Input validation
│   └── errorHandler.js # Error handling
├── routes/              # API routes (40+ route files)
├── services/            # Business logic (100+ services)
│   ├── cloud/          # Cloud provider abstraction
│   ├── collaboration/  # Collaboration features
│   ├── coverletters/   # Cover letter services
│   ├── externalApis/   # Third-party API integrations
│   ├── interviewPrep/ # Interview preparation
│   └── resumes/        # Resume services
├── utils/               # Utilities
│   ├── logger.js       # Structured logging
│   ├── ApiError.js     # Custom error class
│   └── helpers.js      # Helper functions
└── tests/              # Test suites
```

## Scalability Considerations

### 1. Stateless Design

- No server-side session storage (uses database-backed sessions)
- Horizontal scaling ready
- Load balancer compatible

### 2. Connection Pooling

- Database connection reuse
- Configurable pool size
- Automatic connection management

### 3. Caching Strategy

- Service-level caching where appropriate
- API response caching (future enhancement)
- Database query optimization

### 4. Async Operations

- All I/O operations are async/await
- Non-blocking request handling
- Background job support (scheduler service)

## Technology Stack

- **Runtime**: Node.js 20.x
- **Framework**: Express.js 5.x
- **Database**: PostgreSQL 14+ (Supabase in production)
- **Authentication**: Passport.js
- **File Storage**: AWS S3 (production) / Local (development)
- **Email**: AWS SES / SMTP
- **Error Tracking**: Sentry
- **Logging**: Custom logger with structured output
- **Testing**: Custom test framework with Supertest

## Environment Configuration

See [Deployment Documentation](./DEPLOYMENT.md) for detailed environment variable configuration.

## Next Steps

- Read [Services Documentation](./SERVICES.md) for detailed service documentation
- Review [Features Documentation](./FEATURES.md) for API capabilities
- Check [Deployment Documentation](./DEPLOYMENT.md) for production setup
- See [Monitoring Documentation](./MONITORING.md) for observability

