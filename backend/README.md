# ATS Backend API

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
cd backend
npm install

# Start the server
npm start
```

Server will run on `http://localhost:3001`

### Environment Variables

Create a `.env` file in the backend directory. Copy from `.env.example`:

```bash
cp .env.example .env
```

See `backend/.env.example` for all available environment variables.

**Key Environment Variables:**

```env
# Environment Configuration
NODE_ENV=development          # development, staging, or production
ENVIRONMENT=development       # Overrides NODE_ENV if set
LOG_LEVEL=DEBUG              # DEBUG, INFO, WARN, ERROR (defaults by env)

# Server Configuration
SERVER_PORT=3001
BACKEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# Database (use DATABASE_URL for cloud, or individual params for local)
DATABASE_URL=postgresql://user:pass@host:6543/db?pgbouncer=true

# Email (choose AWS SES or SMTP)
USE_AWS_SES=false
AWS_SES_FROM_EMAIL=ats.tracker12@gmail.com
# OR
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# OpenAI API
OPENAI_API_KEY=your_openai_api_key_here
```

**Logging Levels by Environment:**
- **Development**: DEBUG (all logs with emojis, human-readable)
- **Staging**: INFO (info, warn, error - structured JSON)
- **Production**: WARN (warn, error only - structured JSON, sensitive data sanitized)

**Getting an OpenAI API Key:**
1. Go to [https://platform.openai.com/](https://platform.openai.com/)
2. Sign in or create an account
3. Navigate to **API Keys** section
4. Click **Create new secret key**
5. Copy the key (starts with `sk-`) and add it to your `.env` file

## 📡 API Endpoints

### Base URL

```
http://localhost:3001/api/v1
```

### Available Routes

#### User Management (`/api/v1/users`)

- `POST /register` - Register new user
- `POST /login` - Authenticate user
- `POST /logout` - End session
- `GET /csrf-token` - Get CSRF token
- `GET /profile` - Get user profile
- `PUT /change-password` - Change password
- `DELETE /account` - Delete account

#### Jobs Management (`/api/v1/jobs`)

- `POST /` - Create new job
- `GET /` - Get all jobs
- `GET /current` - Get current job
- `GET /history` - Get job history
- `GET /statistics` - Get job statistics
- `GET /:id` - Get job by ID
- `PUT /:id` - Update job
- `DELETE /:id` - Delete job

#### Education Management (`/api/v1/education`)

- `GET /` - Get all education entries
- `POST /` - Create education entry
- `GET /:id` - Get education by ID
- `PUT /:id` - Update education
- `DELETE /:id` - Delete education

#### Skills Management (`/api/v1/skills`)

- `GET /` - Get all skills
- `GET /categories` - Get skills by category
- `POST /` - Create skill
- `GET /:id` - Get skill by ID
- `PUT /:id` - Update skill
- `DELETE /:id` - Delete skill

#### Certifications Management (`/api/v1/certifications`)

- `GET /` - Get all certifications
- `GET /current` - Get current certifications
- `GET /history` - Get certification history
- `GET /statistics` - Get certification statistics
- `GET /expiring` - Get expiring certifications
- `GET /search` - Search certifications
- `GET /organization` - Get by organization
- `POST /` - Create certification
- `GET /:id` - Get certification by ID
- `PUT /:id` - Update certification
- `DELETE /:id` - Delete certification

#### Profile Management (`/api/v1/profile`)

- `GET /` - Get current user's profile
- `GET /picture` - Get profile picture path
- `GET /statistics` - Get profile completeness statistics
- `POST /` - Create or update profile
- `PUT /` - Update profile
- `PUT /picture` - Update profile picture (internal)

## 🧪 Testing

### Run All Tests

```bash
npm run test:all
```

### Run Individual Test Suites

```bash
npm run test                    # Login functionality tests
npm run test:user-api           # User API tests
npm run test:jobs-service       # Jobs service tests
npm run test:jobs-api           # Jobs API tests
npm run test:certifications     # Certifications service tests
npm run test:certifications-api # Certifications API tests
npm run test:profile-api        # Profile API tests
```

## 📁 Project Structure

```
backend/
├── config/              # Configuration files
│   └── db.config.js    # Database configuration
├── controllers/        # Request handlers
│   ├── userController.js
│   ├── jobController.js
│   ├── educationController.js
│   ├── skillController.js
│   ├── certificationController.js
│   └── profileController.js
├── middleware/          # Cross-cutting concerns
│   ├── auth.js         # Authentication & CSRF
│   ├── errorHandler.js # Error handling
│   └── validation.js   # Input validation
├── routes/              # API routes
│   ├── userRoutes.js
│   ├── jobRoutes.js
│   ├── educationRoutes.js
│   ├── skillRoutes.js
│   ├── certificationRoutes.js
│   └── profileRoutes.js
├── services/            # Business logic
│   ├── database.js      # Database service
│   ├── userService.js
│   ├── jobService.js
│   ├── educationService.js
│   ├── skillService.js
│   ├── certificationService.js
│   └── profileService.js
├── tests/               # Test files
│   ├── login-functionality.test.js
│   ├── user-api.test.js
│   ├── jobs-service.test.js
│   ├── jobs-api.test.js
│   ├── certifications-functionality.test.js
│   ├── certifications-api.test.js
│   └── profile-api.test.js
├── utils/               # Utility functions
├── docs/                # Documentation
├── server.js            # Express app configuration
└── index.js             # Application entry point
```

## 🔐 Authentication

- **Session-based** authentication using HTTP-only cookies
- **Rate limiting** on authentication endpoints
- **No CSRF protection** - removed for simplified API access

### Getting Started with Authentication

```javascript
// 1. Login to get session cookie
const response = await fetch("http://localhost:3001/api/v1/users/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({ email, password }),
});

// 2. Use session cookie for authenticated requests
await fetch("http://localhost:3001/api/v1/users/profile", {
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
});
```

## 📊 Response Format

### Success Response

```json
{
  "ok": true,
  "data": {
    // Response data
  }
}
```

### Error Response

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "fields": {
      // Field-specific errors
    }
  }
}
```

## 📖 Documentation

- [API Routes Documentation](./docs/API_ROUTES_DOCUMENTATION.md)
- [API Design Documentation](./docs/API_DESIGN_DOCUMENTATION.md)
- [Status Codes Reference](./docs/STATUS_CODES_REFERENCE.md)

## 🛠️ Tech Stack

- **Node.js** - Runtime
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **Joi** - Validation
- **bcrypt** - Password hashing
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Supertest** - API testing
- **Morgan** - HTTP request logging

## 🔒 Security Features

- ✅ Password hashing with bcrypt (12 rounds)
- ✅ Session-based authentication
- ✅ CSRF protection
- ✅ Rate limiting on auth endpoints
- ✅ Security headers (Helmet)
- ✅ Input validation and sanitization
- ✅ SQL injection prevention
- ✅ CORS configuration

## 📝 License

ISC
