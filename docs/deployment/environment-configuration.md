# Environment Configuration

Complete guide to environment variables and configuration for the BetaBaddies application.

## Table of Contents

- [Overview](#overview)
- [Required Variables](#required-variables)
- [Optional Variables](#optional-variables)
- [Environment-Specific Configuration](#environment-specific-configuration)
- [Setting Environment Variables](#setting-environment-variables)
- [Configuration Validation](#configuration-validation)
- [Secrets Management](#secrets-management)

## Overview

The application uses environment variables for configuration. Different environments (development, staging, production) require different configurations.

### Configuration Files

- **Backend**: `backend/.env` (not committed to git)
- **Example**: `docs/env.example` (committed template)
- **Frontend**: Environment variables set in Vercel dashboard

## Required Variables

### Core Application

#### `NODE_ENV`
- **Description**: Application environment
- **Values**: `development`, `staging`, `production`
- **Required**: Yes
- **Example**: `NODE_ENV=production`

#### `SESSION_SECRET`
- **Description**: Secret key for session encryption
- **Required**: Yes (production)
- **Generation**: `openssl rand -base64 32`
- **Example**: `SESSION_SECRET=your-very-secure-random-secret-key`

#### `DATABASE_URL`
- **Description**: PostgreSQL connection string
- **Required**: Yes
- **Format**: `postgresql://user:password@host:port/database?pgbouncer=true`
- **Production**: Must use Supabase pooler (port 6543)
- **Example**: `DATABASE_URL=postgresql://postgres.xxx:password@db.xxx.supabase.co:6543/postgres?pgbouncer=true`

#### `BACKEND_URL`
- **Description**: Full backend URL
- **Required**: Yes (production)
- **Production**: `https://betabaddies-production.up.railway.app`
- **Staging**: `https://betabaddies-staging.up.railway.app`
- **Development**: `http://localhost:3001`

#### `FRONTEND_URL`
- **Description**: Full frontend URL
- **Required**: Yes (production)
- **Production**: `https://beta-baddies.vercel.app`
- **Staging**: `https://beta-baddies-staging.vercel.app`
- **Development**: `http://localhost:3000`

### Database (Alternative to DATABASE_URL)

If not using `DATABASE_URL`, use individual variables:

#### `DB_HOST`
- **Description**: Database hostname
- **Default**: `localhost`
- **Production**: `db.xxxxx.supabase.co`

#### `DB_PORT`
- **Description**: Database port
- **Default**: `5432`
- **Production**: `6543` (Supabase pooler)

#### `DB_NAME`
- **Description**: Database name
- **Default**: `ats_tracker`
- **Production**: `postgres`

#### `DB_USER`
- **Description**: Database username
- **Default**: `ats_user`
- **Production**: `postgres.xxxxx`

#### `DB_PASS`
- **Description**: Database password
- **Required**: Yes

#### `DB_SSL`
- **Description**: Enable SSL connection
- **Values**: `true`, `false`
- **Production**: `true`

## Optional Variables

### Server Configuration

#### `SERVER_PORT`
- **Description**: Server port
- **Default**: `3001`
- **Alternative**: `PORT` (used by Railway/Heroku)

#### `CORS_ORIGIN`
- **Description**: Comma-separated list of allowed CORS origins
- **Default**: Uses `FRONTEND_URL`
- **Supports**: Wildcards (e.g., `*.vercel.app`)
- **Example**: `CORS_ORIGIN=https://beta-baddies.vercel.app,https://*.vercel.app`

#### `LOG_LEVEL`
- **Description**: Logging level
- **Values**: `DEBUG`, `INFO`, `WARN`, `ERROR`
- **Default**: Based on `NODE_ENV`
  - Development: `DEBUG`
  - Staging: `INFO`
  - Production: `WARN`

#### `LOG_FORMAT`
- **Description**: HTTP logging format (Morgan)
- **Values**: `dev`, `combined`, `common`, `short`, `tiny`
- **Default**: `dev` (development), `combined` (production)

### Rate Limiting

#### `RATE_LIMIT_WINDOW_MS`
- **Description**: Rate limit window in milliseconds
- **Default**: `900000` (15 minutes)

#### `RATE_LIMIT_MAX_REQUESTS`
- **Description**: Maximum requests per window
- **Default**: `1000`

### File Upload

#### `UPLOAD_MAX_SIZE`
- **Description**: Maximum file upload size
- **Default**: `10mb`
- **Format**: `10mb`, `50mb`, etc.

#### `UPLOAD_DIR`
- **Description**: Directory for file uploads
- **Default**: `uploads`
- **Relative**: To backend directory

#### `CLOUD_PROVIDER`
- **Description**: File storage provider
- **Values**: `local`, `aws-s3`
- **Default**: `local`
- **Production**: `aws-s3`

### AWS Configuration

#### `AWS_ACCESS_KEY_ID`
- **Description**: AWS access key ID
- **Required**: If using AWS services (S3, SES, SNS)

#### `AWS_SECRET_ACCESS_KEY`
- **Description**: AWS secret access key
- **Required**: If using AWS services

#### `AWS_REGION`
- **Description**: AWS region
- **Default**: `us-east-1`
- **Common**: `us-east-1`, `us-east-2`, `us-west-2`

#### `AWS_S3_BUCKET`
- **Description**: S3 bucket name for file storage
- **Required**: If `CLOUD_PROVIDER=aws-s3`

### AWS SES (Email)

#### `USE_AWS_SES`
- **Description**: Use AWS SES for email
- **Values**: `true`, `false`
- **Default**: `false`

#### `AWS_SES_FROM_EMAIL`
- **Description**: From email address for AWS SES
- **Required**: If `USE_AWS_SES=true`
- **Note**: Must be verified in AWS SES

### SMTP (Email Alternative)

#### `SMTP_HOST`
- **Description**: SMTP server hostname
- **Default**: `smtp.gmail.com`
- **Required**: If `USE_AWS_SES=false`

#### `SMTP_PORT`
- **Description**: SMTP port
- **Default**: `587`

#### `SMTP_USER`
- **Description**: SMTP username/email
- **Required**: If `USE_AWS_SES=false`

#### `SMTP_PASS`
- **Description**: SMTP password/app password
- **Required**: If `USE_AWS_SES=false`
- **Note**: For Gmail, use App Password

#### `SMTP_SECURE`
- **Description**: Use TLS
- **Values**: `true`, `false`
- **Default**: `false` (uses STARTTLS on port 587)

### AWS SNS (Notifications)

#### `AWS_SNS_TOPIC_ARN`
- **Description**: SNS topic ARN for notifications
- **Format**: `arn:aws:sns:region:account-id:topic-name`

#### `AWS_SNS_PHONE_NUMBER`
- **Description**: Phone number for SMS notifications
- **Format**: `+1234567890`

### OpenAI

#### `OPENAI_API_KEY`
- **Description**: OpenAI API key
- **Required**: For AI features
- **Format**: `sk-...`
- **Get from**: https://platform.openai.com/api-keys

#### `OPENAI_API_URL`
- **Description**: OpenAI API URL
- **Default**: `https://api.openai.com/v1`
- **Use case**: Custom endpoints or proxies

#### `OPENAI_MODEL`
- **Description**: Default OpenAI model
- **Default**: `gpt-4o-mini`
- **Options**: `gpt-4`, `gpt-4-turbo`, `gpt-4o-mini`, `gpt-3.5-turbo`

### Google OAuth

#### `GOOGLE_CLIENT_ID`
- **Description**: Google OAuth client ID
- **Format**: `xxx.apps.googleusercontent.com`
- **Get from**: https://console.cloud.google.com/apis/credentials

#### `GOOGLE_CLIENT_SECRET`
- **Description**: Google OAuth client secret

#### `GOOGLE_CALLBACK_URL`
- **Description**: Google OAuth callback URL
- **Default**: `${BACKEND_URL}/api/v1/users/auth/google/callback`
- **Production**: `https://betabaddies-production.up.railway.app/api/v1/users/auth/google/callback`

### Google Calendar

#### `GOOGLE_CALENDAR_CLIENT_ID`
- **Description**: Separate client ID for Google Calendar
- **Default**: Falls back to `GOOGLE_CLIENT_ID`

#### `GOOGLE_CALENDAR_CLIENT_SECRET`
- **Description**: Separate client secret for Google Calendar
- **Default**: Falls back to `GOOGLE_CLIENT_SECRET`

#### `GOOGLE_CALENDAR_CALLBACK_URL`
- **Description**: Google Calendar callback URL
- **Default**: `${BACKEND_URL}/api/v1/calendar/auth/callback`

### Gmail

#### `GOOGLE_GMAIL_CALLBACK_URL`
- **Description**: Gmail OAuth callback URL
- **Default**: `${BACKEND_URL}/api/v1/gmail/auth/callback`

### Google Contacts

#### `GOOGLE_CONTACTS_CLIENT_ID`
- **Description**: Separate client ID for Google Contacts
- **Default**: Falls back to `GOOGLE_CLIENT_ID`

#### `GOOGLE_CONTACTS_CLIENT_SECRET`
- **Description**: Separate client secret for Google Contacts
- **Default**: Falls back to `GOOGLE_CLIENT_SECRET`

#### `GOOGLE_CONTACTS_CALLBACK_URL`
- **Description**: Google Contacts callback URL
- **Default**: `${BACKEND_URL}/api/v1/network/google-contacts/auth/callback`

### LinkedIn OAuth

#### `LINKEDIN_CLIENT_ID`
- **Description**: LinkedIn OAuth client ID
- **Get from**: https://www.linkedin.com/developers/apps

#### `LINKEDIN_CLIENT_SECRET`
- **Description**: LinkedIn OAuth client secret

#### `LINKEDIN_CALLBACK_URL`
- **Description**: LinkedIn OAuth callback URL
- **Default**: `${BACKEND_URL}/api/v1/linkedin/auth/callback`

### GitHub OAuth

#### `GITHUB_CLIENT_ID`
- **Description**: GitHub OAuth client ID
- **Get from**: https://github.com/settings/developers

#### `GITHUB_CLIENT_SECRET`
- **Description**: GitHub OAuth client secret

#### `GITHUB_CALLBACK_URL`
- **Description**: GitHub OAuth callback URL
- **Default**: `${BACKEND_URL}/api/v1/github/auth/callback`

### Geocoding

#### `GEOCODING_BASE_URL`
- **Description**: Geocoding API base URL
- **Default**: `https://nominatim.openstreetmap.org`

#### `GEOCODING_USER_AGENT`
- **Description**: User agent for geocoding API
- **Format**: `AppName/Version (contact@example.com)`
- **Required**: By Nominatim

#### `GEOCODING_REFERER`
- **Description**: Referer header for geocoding API
- **Default**: `http://localhost`

#### `GEOCODING_CONTACT_EMAIL`
- **Description**: Contact email for geocoding API

### Sentry

#### `SENTRY_DSN`
- **Description**: Sentry DSN for error tracking
- **Format**: `https://xxx@sentry.io/project-id`
- **Get from**: https://sentry.io/settings/projects/
- **Default**: Hardcoded DSN in `backend/instrument.js` (if not set)

### Railway

#### `RAILWAY_ENVIRONMENT`
- **Description**: Railway environment name
- **Auto-set**: By Railway
- **Values**: `production`, `staging`

## Environment-Specific Configuration

### Development

```env
NODE_ENV=development
ENVIRONMENT=development
LOG_LEVEL=DEBUG
LOG_FORMAT=dev

SERVER_PORT=3001
BACKEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# Database (local)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ats_tracker
DB_USER=ats_user
DB_PASS=ats_password
DB_SSL=false

# Or use DATABASE_URL for local
# DATABASE_URL=postgresql://ats_user:ats_password@localhost:5432/ats_tracker

SESSION_SECRET=dev-secret-key-change-in-production

# File storage (local)
CLOUD_PROVIDER=local
UPLOAD_DIR=uploads

# Email (SMTP for development)
USE_AWS_SES=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# OpenAI
OPENAI_API_KEY=sk-your-key-here

# OAuth (use localhost callbacks)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### Staging

```env
NODE_ENV=staging
ENVIRONMENT=staging
LOG_LEVEL=INFO
LOG_FORMAT=combined

BACKEND_URL=https://betabaddies-staging.up.railway.app
FRONTEND_URL=https://beta-baddies-staging.vercel.app
CORS_ORIGIN=https://beta-baddies-staging.vercel.app

# Database (Supabase)
DATABASE_URL=postgresql://user:pass@host:6543/db?pgbouncer=true

SESSION_SECRET=staging-secret-key

# File storage (S3)
CLOUD_PROVIDER=aws-s3
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=betabaddies-uploads-staging

# Email
USE_AWS_SES=true
AWS_SES_FROM_EMAIL=noreply@betabaddies.com

# OpenAI
OPENAI_API_KEY=sk-your-key-here

# OAuth (staging URLs)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=https://betabaddies-staging.up.railway.app/api/v1/users/auth/google/callback

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Production

```env
NODE_ENV=production
ENVIRONMENT=production
LOG_LEVEL=WARN
LOG_FORMAT=combined

BACKEND_URL=https://betabaddies-production.up.railway.app
FRONTEND_URL=https://beta-baddies.vercel.app
CORS_ORIGIN=https://beta-baddies.vercel.app

# Database (Supabase - MUST use pooler)
DATABASE_URL=postgresql://postgres.xxx:password@db.xxx.supabase.co:6543/postgres?pgbouncer=true

SESSION_SECRET=production-secret-key-generate-with-openssl-rand-base64-32

# File storage (S3)
CLOUD_PROVIDER=aws-s3
AWS_ACCESS_KEY_ID=your-production-key
AWS_SECRET_ACCESS_KEY=your-production-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=betabaddies-uploads

# Email
USE_AWS_SES=true
AWS_SES_FROM_EMAIL=noreply@betabaddies.com

# SNS
AWS_SNS_TOPIC_ARN=arn:aws:sns:us-east-1:xxx:deployment-notifications

# OpenAI
OPENAI_API_KEY=sk-your-production-key

# OAuth (production URLs)
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-client-secret
GOOGLE_CALLBACK_URL=https://betabaddies-production.up.railway.app/api/v1/users/auth/google/callback

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx
```

## Setting Environment Variables

### Railway (Backend)

1. **Via Dashboard**
   - Go to Railway project
   - Select service
   - Go to Variables tab
   - Add/edit variables
   - Redeploy service

2. **Via CLI**
   ```bash
   railway variables set KEY=value
   ```

3. **Via Railway Config**
   - Variables can be set per environment
   - Use Railway's environment management

### Vercel (Frontend)

1. **Via Dashboard**
   - Go to Vercel project
   - Go to Settings → Environment Variables
   - Add variables for each environment
   - Redeploy

2. **Via CLI**
   ```bash
   vercel env add VARIABLE_NAME
   ```

### Local Development

1. **Create `.env` file**
   ```bash
   cd backend
   cp ../docs/env.example .env
   ```

2. **Edit `.env`**
   ```bash
   nano .env  # or use your editor
   ```

3. **Load variables**
   - Automatically loaded by `dotenv` package
   - No need to export manually

## Configuration Validation

### Backend Validation

The backend validates critical environment variables on startup:

```javascript
// Required in production
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  console.error('❌ SESSION_SECRET is required in production');
  process.exit(1);
}
```

### Health Check

The `/health` endpoint validates:
- Database connectivity
- Environment configuration
- Service status

```bash
curl https://betabaddies-production.up.railway.app/health
```

## Secrets Management

### Best Practices

1. **Never Commit Secrets**
   - Use `.gitignore` for `.env` files
   - Use environment variables in CI/CD
   - Use secrets management services

2. **Rotate Regularly**
   - Rotate API keys quarterly
   - Rotate `SESSION_SECRET` annually
   - Rotate OAuth secrets when compromised

3. **Use Different Secrets**
   - Different secrets for each environment
   - Never reuse production secrets in development

4. **Limit Access**
   - Only grant access to necessary team members
   - Use read-only access when possible
   - Audit access regularly

### Generating Secrets

```bash
# Session secret
openssl rand -base64 32

# Random password
openssl rand -hex 16
```

## Troubleshooting

### Common Issues

1. **Missing SESSION_SECRET**
   - Error: Server exits on startup
   - Fix: Set `SESSION_SECRET` environment variable

2. **Database Connection Failed**
   - Error: Database query errors
   - Fix: Verify `DATABASE_URL` uses port 6543 (Supabase pooler)

3. **CORS Errors**
   - Error: Frontend can't access API
   - Fix: Verify `CORS_ORIGIN` includes frontend URL

4. **OAuth Callback Failed**
   - Error: OAuth redirect fails
   - Fix: Verify callback URLs match OAuth provider settings

See [Troubleshooting Guide](./troubleshooting.md) for more issues.

## Related Documentation

- [Deployment Runbooks](./deployment-runbooks.md)
- [Troubleshooting Guide](./troubleshooting.md)
- [API Integration](./api-integration.md)

