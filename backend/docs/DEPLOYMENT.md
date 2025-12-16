# Production Deployment Guide

Complete guide for deploying the BetaBaddies backend to production.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Deployment Platforms](#deployment-platforms)
- [CI/CD Pipeline](#cicd-pipeline)
- [Database Setup](#database-setup)
- [File Storage](#file-storage)
- [Email Configuration](#email-configuration)
- [Monitoring Setup](#monitoring-setup)
- [Security Checklist](#security-checklist)
- [Troubleshooting](#troubleshooting)

## Overview

The backend is currently deployed to **Railway** for production hosting. The deployment is automated via GitHub Actions CI/CD pipeline.

**Production URL**: `https://betabaddies-production.up.railway.app`

## Prerequisites

- GitHub repository with CI/CD access
- Railway account and project
- Supabase database (PostgreSQL)
- AWS account (for S3, SES, SNS)
- Sentry account (for error tracking)

## Environment Configuration

### Required Environment Variables

#### Database

```env
# Supabase Database (Production)
DATABASE_URL=postgresql://user:password@host:6543/database?pgbouncer=true

# OR individual variables
DB_HOST=db.xxxxx.supabase.co
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.xxxxx
DB_PASS=your-password
```

#### Application

```env
# Server Configuration
NODE_ENV=production
SERVER_PORT=3001
BACKEND_URL=https://betabaddies-production.up.railway.app
FRONTEND_URL=https://beta-baddies.vercel.app

# Security
SESSION_SECRET=your-very-secure-random-secret-key
CORS_ORIGIN=https://beta-baddies.vercel.app

# Trust Proxy (for Railway)
TRUST_PROXY=true
```

#### Authentication

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://betabaddies-production.up.railway.app/api/v1/users/auth/google/callback

# Gmail Integration
GOOGLE_GMAIL_CALLBACK_URL=https://betabaddies-production.up.railway.app/api/v1/gmail/auth/callback

# Google Calendar
GOOGLE_CALENDAR_CALLBACK_URL=https://betabaddies-production.up.railway.app/api/v1/google-calendar/auth/callback

# Google Contacts
GOOGLE_CONTACTS_CALLBACK_URL=https://betabaddies-production.up.railway.app/api/v1/network/google-contacts/auth/callback

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_CALLBACK_URL=https://betabaddies-production.up.railway.app/api/v1/users/auth/linkedin/callback
```

#### AWS Services

```env
# S3 (File Storage)
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET_NAME=betabaddies-uploads

# SES (Email)
AWS_SES_REGION=us-east-2
AWS_SES_FROM_EMAIL=noreply@betabaddies.com

# SNS (Notifications)
AWS_SNS_TOPIC_ARN=arn:aws:sns:us-east-2:xxxxx:deployment-notifications
```

#### Email (Alternative to SES)

```env
# SMTP Configuration (if not using SES)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
```

#### External APIs

```env
# OpenAI (for AI features)
OPENAI_API_KEY=sk-xxxxx

# Sentry (Error Tracking)
SENTRY_DSN=https://xxxxx@o4510533802590208.ingest.us.sentry.io/xxxxx

# Geocoding
GEOCODING_USER_AGENT=YourApp/1.0
GEOCODING_REFERER=https://beta-baddies.vercel.app
```

### Setting Environment Variables in Railway

1. Go to Railway project dashboard
2. Select your service
3. Navigate to **Variables** tab
4. Add each environment variable
5. Redeploy service

## Deployment Platforms

### Railway (Current Production)

**Configuration File**: `railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Deployment Steps**:

1. **Connect Repository**:

   - Railway dashboard → New Project → Deploy from GitHub repo
   - Select repository and branch

2. **Configure Service**:

   - Set root directory (if needed)
   - Configure build command: `npm ci`
   - Set start command: `npm start`

3. **Set Environment Variables**:

   - Add all required environment variables
   - Use Railway's environment variable management

4. **Deploy**:
   - Railway auto-deploys on push to main branch
   - Or manually trigger deployment

**Health Check**: Railway automatically checks `/health` endpoint

### Manual Deployment

```bash
# Build
npm ci

# Start
npm start
```

## CI/CD Pipeline

**File**: `.github/workflows/deploy-production.yml`

The CI/CD pipeline:

1. **Tests**: Runs all backend tests
2. **Deploy Frontend**: Deploys to Vercel
3. **Notify**: Sends deployment notifications via AWS SNS

### Pipeline Steps

```yaml
1. Checkout code
2. Setup Node.js
3. Install dependencies (npm ci)
4. Setup test database
5. Run tests
6. Deploy frontend to Vercel
7. Send deployment notification
```

### Triggering Deployment

- **Automatic**: Push to `main` branch
- **Manual**: GitHub Actions → Run workflow

## Database Setup

### Supabase (Production)

1. **Create Project**:

   - Go to Supabase dashboard
   - Create new project
   - Note connection details

2. **Run Migrations**:

   ```bash
   # Connect to Supabase
   psql "postgresql://user:pass@host:6543/postgres?pgbouncer=true"

   # Run schema dump
   psql < db/sprint_4/database_schema_dump.sql
   ```

3. **Verify Connection**:
   - Test connection from Railway
   - Check database logs

### Database Backups

**Automated Backups**: Supabase provides automatic daily backups

**Manual Backup**:

```bash
# Use dump script
cd backend/scripts/sprint_4
./dump-supabase-db.sh
```

## File Storage

### AWS S3 (Production)

1. **Create S3 Bucket**:

   - AWS Console → S3 → Create bucket
   - Set bucket name: `betabaddies-uploads`
   - Configure CORS if needed

2. **IAM User**:

   - Create IAM user with S3 access
   - Generate access keys
   - Set in environment variables

3. **Bucket Structure**:
   ```
   betabaddies-uploads/
   ├── profile-pics/
   ├── resumes/
   ├── documents/
   └── exports/
   ```

### Local Storage (Development)

Files stored in `backend/uploads/` directory (not for production)

## Email Configuration

### AWS SES (Recommended)

1. **Verify Domain/Email**:

   - AWS SES → Verified identities
   - Verify sending domain or email

2. **Request Production Access**:

   - Move out of SES sandbox
   - Request production access

3. **Configure**:
   ```env
   AWS_SES_REGION=us-east-2
   AWS_SES_FROM_EMAIL=noreply@betabaddies.com
   ```

### SMTP (Alternative)

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
```

## Monitoring Setup

### Sentry

1. **Create Project**:

   - Sentry dashboard → Create project
   - Select Node.js platform
   - Copy DSN

2. **Configure**:

   ```env
   SENTRY_DSN=https://xxxxx@o4510533802590208.ingest.us.sentry.io/xxxxx
   ```

3. **Verify**:
   - Check Sentry dashboard for errors
   - Test with `/debug-sentry` endpoint

### Health Checks

**Endpoint**: `GET /health`

Returns:

```json
{
  "status": "ok",
  "timestamp": "2024-12-15T18:00:00.000Z",
  "uptime": 3600,
  "database": "connected"
}
```

### Logging

- **Structured Logging**: Custom logger in `utils/logger.js`
- **Log Levels**: debug, info, warn, error
- **Output**: Console (stdout/stderr)
- **Railway Logs**: Available in Railway dashboard

## Security Checklist

### ✅ Completed

- [x] Helmet.js security headers
- [x] CORS configuration
- [x] Rate limiting
- [x] Input validation
- [x] SQL injection prevention (parameterized queries)
- [x] Password hashing (bcrypt)
- [x] Session security
- [x] HTTPS enforcement
- [x] Environment variable security
- [x] Error message sanitization

### 🔒 Security Best Practices

1. **Environment Variables**:

   - Never commit `.env` files
   - Use Railway secrets management
   - Rotate secrets regularly

2. **Database**:

   - Use connection pooling
   - Limit database user permissions
   - Enable SSL connections

3. **API Security**:

   - Rate limiting enabled
   - CORS whitelist configured
   - Authentication required for protected routes

4. **File Upload**:
   - File type validation
   - Size limits enforced
   - Virus scanning (future enhancement)

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Symptoms**: `Error: Could not connect to PostgreSQL database`

**Solutions**:

- Verify `DATABASE_URL` is correct
- Check Supabase connection pooler is enabled
- Verify network access from Railway
- Check database credentials

#### 2. CORS Errors

**Symptoms**: `CORS: Origin not allowed`

**Solutions**:

- Add frontend URL to `CORS_ORIGIN`
- Check `FRONTEND_URL` environment variable
- Verify wildcard patterns for Vercel previews

#### 3. OAuth Redirect Issues

**Symptoms**: OAuth redirects to `localhost`

**Solutions**:

- Set `BACKEND_URL` environment variable
- Update OAuth callback URLs in Google/LinkedIn console
- Verify callback URLs match exactly

#### 4. File Upload Fails

**Symptoms**: `Error uploading file`

**Solutions**:

- Verify AWS S3 credentials
- Check S3 bucket permissions
- Verify bucket name is correct
- Check file size limits

#### 5. Email Not Sending

**Symptoms**: Emails not received

**Solutions**:

- Verify AWS SES configuration
- Check SES sandbox status
- Verify sender email is verified
- Check SMTP credentials if using SMTP

### Debugging

#### Check Logs

**Railway**:

- Dashboard → Service → Logs
- Real-time log streaming

**Local**:

```bash
# View logs
npm start

# Check specific service
node -e "import('./services/database.js')"
```

#### Test Endpoints

```bash
# Health check
curl https://betabaddies-production.up.railway.app/health

# API test
curl https://betabaddies-production.up.railway.app/api/v1/users/me \
  -H "Cookie: connect.sid=..."
```

#### Database Connection Test

```bash
# From Railway CLI or local
psql "$DATABASE_URL" -c "SELECT NOW();"
```

## Deployment Checklist

Before deploying to production:

- [ ] All environment variables set
- [ ] Database migrations run
- [ ] S3 bucket configured
- [ ] Email service configured
- [ ] OAuth callbacks updated
- [ ] Sentry DSN configured
- [ ] CORS origins configured
- [ ] Rate limits appropriate
- [ ] Health check endpoint working
- [ ] All tests passing
- [ ] Security headers verified
- [ ] Error tracking working

## Rollback Procedure

### Railway Rollback

1. Railway dashboard → Service → Deployments
2. Select previous successful deployment
3. Click "Redeploy"

### Database Rollback

```bash
# Restore from backup
psql "$DATABASE_URL" < backup.sql
```

## Performance Optimization

### Database

- Connection pooling enabled
- Query optimization
- Index usage
- Query result caching (where appropriate)

### Application

- Async/await for I/O
- Non-blocking operations
- Efficient error handling
- Response compression (future)

### Monitoring

- Sentry performance monitoring
- API response time tracking
- Database query logging
- Error rate monitoring

## Next Steps

- Review [Monitoring Documentation](./MONITORING.md) for observability
- Check [Architecture Documentation](./ARCHITECTURE.md) for system design
- See [Services Documentation](./SERVICES.md) for service details

