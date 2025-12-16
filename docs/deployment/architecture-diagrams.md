# Architecture Diagrams

System architecture documentation for the BetaBaddies application.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  React Frontend (Vercel)                                  │  │
│  │  - TypeScript + Vite                                      │  │
│  │  - Tailwind CSS                                           │  │
│  │  - React Router                                           │  │
│  │  - Axios for API calls                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY / LOAD BALANCER                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Railway (Backend Hosting)                               │  │
│  │  - Auto-scaling                                           │  │
│  │  - Health checks                                          │  │
│  │  - SSL termination                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Express.js Backend (Node.js 20)                         │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Middleware Stack                                   │  │  │
│  │  │  - Helmet (Security)                                │  │  │
│  │  │  - CORS                                             │  │  │
│  │  │  - Rate Limiting                                    │  │  │
│  │  │  - Body Parser                                      │  │  │
│  │  │  - Session Management                               │  │  │
│  │  │  - Passport.js (Auth)                               │  │  │
│  │  │  - Error Handler                                    │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Route Handlers                                     │  │  │
│  │  │  - /api/v1/users                                    │  │  │
│  │  │  - /api/v1/jobs                                     │  │  │
│  │  │  - /api/v1/resumes                                  │  │  │
│  │  │  - /api/v1/interviews                               │  │  │
│  │  │  - ... (40+ route modules)                          │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Controllers                                        │  │  │
│  │  │  - Request validation                               │  │  │
│  │  │  - Response formatting                              │  │  │
│  │  │  - Service orchestration                            │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Services Layer                                    │  │  │
│  │  │  - Business logic                                  │  │  │
│  │  │  - External API integration                         │  │  │
│  │  │  - Data transformation                             │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database (Supabase)                         │  │
│  │  - Connection pooling (port 6543)                        │  │
│  │  - SSL connections                                       │  │
│  │  - Automated backups                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Pages      │  │  Components  │  │   Services   │     │
│  │              │  │              │  │              │     │
│  │ - Dashboard  │  │ - UI Library  │  │ - API Client │     │
│  │ - Jobs       │  │ - Forms       │  │ - State Mgmt │     │
│  │ - Resumes    │  │ - Modals      │  │ - Utils      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ API Calls (HTTPS)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Railway)                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Routes     │  │ Controllers  │  │   Services   │     │
│  │              │  │              │  │              │     │
│  │ - REST API   │  │ - Validation │  │ - Business   │     │
│  │ - Auth       │  │ - Formatting │  │   Logic      │     │
│  │ - Health     │  │ - Error      │  │ - External   │     │
│  │              │  │   Handling   │  │   APIs       │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Middleware  │  │   Database   │  │   External   │     │
│  │              │  │   Service    │  │   Services   │     │
│  │ - Auth       │  │              │  │              │     │
│  │ - Rate Limit │  │ - Pooling    │  │ - OpenAI     │     │
│  │ - CORS       │  │ - Queries    │  │ - Google     │     │
│  │ - Security   │  │ - Transactions│  │ - AWS       │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  PostgreSQL  │    │   AWS S3     │    │   Sentry     │
│  (Supabase)  │    │  (Storage)   │    │  (Monitoring)│
└──────────────┘    └──────────────┘    └──────────────┘
```

## Data Flow Architecture

```
User Request Flow:
┌─────────┐
│  User   │
└────┬────┘
     │
     │ 1. HTTP Request
     ▼
┌─────────────────┐
│  Vercel (CDN)   │ ──► Serves static assets
└────┬────────────┘
     │
     │ 2. API Request
     ▼
┌─────────────────┐
│  Railway        │ ──► Load balancer / reverse proxy
└────┬────────────┘
     │
     │ 3. Express Middleware
     ▼
┌─────────────────┐
│  Auth Check     │ ──► Session validation
└────┬────────────┘
     │
     │ 4. Route Handler
     ▼
┌─────────────────┐
│  Controller     │ ──► Input validation
└────┬────────────┘
     │
     │ 5. Service Layer
     ▼
┌─────────────────┐
│  Business Logic │ ──► Data processing
└────┬────────────┘
     │
     │ 6. Database Query
     ▼
┌─────────────────┐
│  PostgreSQL     │ ──► Data retrieval/storage
└────┬────────────┘
     │
     │ 7. Response
     ▼
┌─────────────────┐
│  JSON Response  │ ──► Formatted data
└─────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GITHUB REPOSITORY                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   main       │  │   staging    │  │  development │     │
│  │   branch     │  │   branch     │  │   branch     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │              │
│         │                 │                 │              │
└─────────┼─────────────────┼─────────────────┼──────────────┘
          │                 │                 │
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ GitHub Actions  │  │ GitHub Actions  │  │  Local Dev      │
│                 │  │                 │  │                 │
│ - Run Tests     │  │ - Run Tests     │  │ - npm start     │
│ - Deploy        │  │ - Deploy        │  │                 │
└────────┬────────┘  └────────┬────────┘  └─────────────────┘
         │                    │
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌─────────────────┐
│   PRODUCTION    │  │    STAGING      │
│                 │  │                 │
│ ┌─────────────┐ │  │ ┌─────────────┐ │
│ │  Railway    │ │  │ │  Railway    │ │
│ │  (Backend)  │ │  │ │  (Backend)  │ │
│ └─────────────┘ │  │ └─────────────┘ │
│                 │  │                 │
│ ┌─────────────┐ │  │ ┌─────────────┐ │
│ │  Vercel     │ │  │ │  Vercel     │ │
│ │  (Frontend) │ │  │ │  (Frontend) │ │
│ └─────────────┘ │  │ └─────────────┘ │
└─────────────────┘  └─────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                          │
│                                                              │
│  Layer 1: Network Security                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ - HTTPS/TLS (SSL certificates)                       │  │
│  │ - DDoS protection (Railway/Vercel)                   │  │
│  │ - Firewall rules                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Layer 2: Application Security                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ - Helmet.js (Security headers)                        │  │
│  │ - CORS (Cross-origin protection)                      │  │
│  │ - Rate limiting                                       │  │
│  │ - Input validation (Joi)                             │  │
│  │ - SQL injection prevention (parameterized queries)   │  │
│  │ - XSS protection                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Layer 3: Authentication & Authorization                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ - Session-based auth (HTTP-only cookies)              │  │
│  │ - Passport.js (OAuth strategies)                     │  │
│  │ - Password hashing (bcrypt)                           │  │
│  │ - CSRF protection                                     │  │
│  │ - Role-based access control                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Layer 4: Data Security                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ - Database encryption (SSL connections)               │  │
│  │ - Environment variable protection                     │  │
│  │ - Secrets management                                  │  │
│  │ - File upload validation                              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## External Service Integration

```
┌─────────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICE INTEGRATIONS                  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   OpenAI     │  │   Google     │  │     AWS      │     │
│  │              │  │              │  │              │     │
│  │ - GPT-4      │  │ - OAuth      │  │ - S3         │     │
│  │ - Embeddings │  │ - Calendar   │  │ - SES        │     │
│  │              │  │ - Gmail      │  │ - SNS        │     │
│  │              │  │ - Contacts   │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  LinkedIn     │  │   GitHub     │  │   Sentry     │     │
│  │              │  │              │  │              │     │
│  │ - OAuth      │  │ - OAuth      │  │ - Error      │     │
│  │ - Profile    │  │ - Repos      │  │   Tracking   │     │
│  │              │  │              │  │ - Performance│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  Supabase    │  │  Adzuna      │                        │
│  │              │  │              │                        │
│  │ - Database   │  │ - Job Market │                        │
│  │ - Auth       │  │   Data       │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE SCHEMA                          │
│                                                              │
│  Core Tables:                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │    users     │  │   profiles   │  │   sessions   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  Job Tracking:                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ job_opps     │  │  interviews  │  │  job_offers  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  User Data:                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  educations  │  │    skills    │  │ certifications│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  Documents:                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   resumes    │  │ coverletters │  │    files     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  Analytics:                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ api_usage   │  │ api_errors   │  │ api_quotas   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Monitoring & Observability

```
┌─────────────────────────────────────────────────────────────┐
│              MONITORING & OBSERVABILITY                      │
│                                                              │
│  Error Tracking:                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Sentry                                               │  │
│  │  - Error capture                                      │  │
│  │  - Performance monitoring                            │  │
│  │  - Release tracking                                  │  │
│  │  - User context                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Application Logging:                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Custom Logger                                        │  │
│  │  - Structured JSON (production)                       │  │
│  │  - Human-readable (development)                       │  │
│  │  - Log levels (DEBUG, INFO, WARN, ERROR)             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  API Monitoring:                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Custom API Monitoring                                │  │
│  │  - Usage tracking                                     │  │
│  │  - Quota management                                   │  │
│  │  - Response time tracking                             │  │
│  │  - Cost tracking                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Health Checks:                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /health, /health/ready, /health/live                 │  │
│  │  - Database connectivity                              │  │
│  │  - Service status                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Platform Logs:                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Railway / Vercel                                     │  │
│  │  - Deployment logs                                   │  │
│  │  - Runtime logs                                      │  │
│  │  - Resource usage                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, Lucide React
- **Routing**: React Router DOM v7
- **HTTP Client**: Axios
- **Hosting**: Vercel

### Backend
- **Runtime**: Node.js 20.x
- **Framework**: Express.js 5.x
- **Database**: PostgreSQL 14+ (Supabase)
- **Authentication**: Passport.js
- **Validation**: Joi
- **File Storage**: AWS S3 / Local filesystem
- **Email**: AWS SES / SMTP
- **Hosting**: Railway

### Infrastructure
- **CI/CD**: GitHub Actions
- **Error Tracking**: Sentry
- **Monitoring**: Custom API monitoring
- **Logging**: Custom structured logger
- **Database**: Supabase (PostgreSQL)
- **Storage**: AWS S3
- **Notifications**: AWS SNS

