# Backend Documentation

Welcome to the BetaBaddies backend documentation. This directory contains comprehensive documentation for the backend system architecture, services, features, deployment, and monitoring.

## 📚 Documentation Index

- **[Architecture](./ARCHITECTURE.md)** - System architecture, design patterns, and technical overview
- **[Services](./SERVICES.md)** - Detailed documentation of all backend services
- **[Features](./FEATURES.md)** - Feature documentation and API capabilities
- **[Deployment](./DEPLOYMENT.md)** - Production deployment guide and configuration
- **[Monitoring](./MONITORING.md)** - Monitoring, logging, and observability setup

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL 14+ (or Supabase)
- npm or yarn

### Installation

```bash
cd backend
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption secret
- `FRONTEND_URL` - Frontend application URL
- `BACKEND_URL` - Backend API URL
- `NODE_ENV` - Environment (development/production)

### Running Locally

```bash
# Start development server
npm start

# Run tests
npm run test:all

# Run specific test suite
npm run test:user-api
```

### API Base URL

- **Development**: `http://localhost:3001/api/v1`
- **Production**: `https://betabaddies-production.up.railway.app/api/v1`

## 🏗️ System Overview

The backend is built with:

- **Framework**: Express.js 5.x
- **Database**: PostgreSQL (via Supabase in production)
- **Authentication**: Passport.js (Google OAuth, LinkedIn OAuth, Local)
- **Error Tracking**: Sentry
- **File Storage**: AWS S3 (production) / Local filesystem (development)
- **Email**: AWS SES / SMTP
- **Monitoring**: Sentry, Custom API monitoring

## 📁 Project Structure

```
backend/
├── config/          # Configuration files (database, passport, etc.)
├── controllers/     # Request handlers
├── middleware/      # Express middleware (auth, validation, error handling)
├── routes/          # API route definitions
├── services/        # Business logic and data access
├── utils/           # Utility functions
├── tests/           # Test suites
├── scripts/         # Utility scripts
├── migrations/      # Database migrations
├── docs/            # Documentation (this directory)
├── index.js         # Application entry point
├── server.js        # Express server configuration
└── instrument.js    # Sentry initialization
```

## 🔗 Related Documentation

- [Frontend Documentation](../frontend/README.md)
- [Database Schema](../db/sprint_4/database_schema_dump.sql)
- [Environment Variables Example](../../docs/env.example)
- [CI/CD Deployment](../../.github/workflows/deploy-production.yml)

## 📞 Support

For questions or issues:

1. Check the relevant documentation file
2. Review the [Architecture](./ARCHITECTURE.md) for system design
3. Check [Deployment](./DEPLOYMENT.md) for production issues
4. Review [Monitoring](./MONITORING.md) for observability

