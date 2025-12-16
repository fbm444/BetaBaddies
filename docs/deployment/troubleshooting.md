# Troubleshooting Guide

Common issues and solutions for the BetaBaddies deployment.

## Table of Contents

- [Deployment Issues](#deployment-issues)
- [Database Issues](#database-issues)
- [Authentication Issues](#authentication-issues)
- [API Issues](#api-issues)
- [File Upload Issues](#file-upload-issues)
- [Email Issues](#email-issues)
- [Performance Issues](#performance-issues)
- [Monitoring Issues](#monitoring-issues)

## Deployment Issues

### Deployment Fails in GitHub Actions

#### Symptoms
- GitHub Actions workflow fails
- Tests fail
- Build errors

#### Solutions

1. **Check Test Failures**
   ```bash
   # Run tests locally
   cd backend
   npm run test:all
   ```

2. **Check Build Logs**
   - Review GitHub Actions logs
   - Look for specific error messages
   - Check dependency installation

3. **Verify Environment Variables**
   - Ensure all required secrets are set in GitHub
   - Check secret names match workflow file

4. **Check Node.js Version**
   - Verify Node.js 20.x is used
   - Check `package.json` engines

### Railway Deployment Fails

#### Symptoms
- Railway deployment shows error
- Service doesn't start
- Health checks fail

#### Solutions

1. **Check Railway Logs**
   ```bash
   # View logs via Railway CLI
   railway logs
   ```

2. **Verify Environment Variables**
   - Check Railway dashboard → Variables
   - Ensure all required variables are set
   - Verify `SESSION_SECRET` is set

3. **Check Build Configuration**
   - Verify `railway.json` is correct
   - Check start command: `npm start`
   - Verify root directory

4. **Database Connection**
   - Verify `DATABASE_URL` uses port 6543 (Supabase pooler)
   - Check Supabase project status
   - Verify connection string format

### Vercel Deployment Fails

#### Symptoms
- Vercel build fails
- Frontend doesn't load
- Build timeout

#### Solutions

1. **Check Build Logs**
   - Vercel dashboard → Deployments → Logs
   - Look for build errors
   - Check dependency issues

2. **Verify Build Configuration**
   - Check `vercel.json`
   - Verify build command
   - Check root directory setting

3. **Environment Variables**
   - Verify frontend env vars are set
   - Check `VITE_API_URL` is correct
   - Ensure variables are set for production

## Database Issues

### Database Connection Failed

#### Symptoms
- Error: "Connection refused"
- Error: "Connection timeout"
- Health check fails

#### Solutions

1. **Verify DATABASE_URL**
   ```bash
   # Test connection
   psql $DATABASE_URL -c "SELECT 1;"
   ```

2. **Check Supabase Pooler**
   - **CRITICAL**: Must use port 6543 (Session mode)
   - Format: `postgresql://user:pass@host:6543/db?pgbouncer=true`
   - Railway is IPv4-only, requires pooler

3. **Verify SSL**
   - Supabase requires SSL
   - Connection string should include SSL params
   - Check `rejectUnauthorized: false` in config

4. **Check Supabase Status**
   - Visit Supabase dashboard
   - Check project status
   - Verify maintenance windows

### Connection Pool Exhausted

#### Symptoms
- Error: "Too many connections"
- Slow queries
- Timeouts

#### Solutions

1. **Check Pool Settings**
   ```javascript
   // backend/config/db.config.js
   // Verify pool configuration
   ```

2. **Monitor Connections**
   - Check Supabase dashboard → Database → Connection Pooling
   - Review active connections
   - Check connection limits

3. **Optimize Queries**
   - Review slow queries
   - Add indexes if needed
   - Close connections properly

### Migration Issues

#### Symptoms
- Schema errors
- Missing tables
- Migration fails

#### Solutions

1. **Run Migrations**
   ```bash
   # Connect to database
   psql $DATABASE_URL
   
   # Run migration
   \i db/migrations/migration_file.sql
   ```

2. **Check Migration Order**
   - Verify migrations run in order
   - Check for dependencies

3. **Rollback if Needed**
   - Create rollback script
   - Test rollback locally first
   - Execute rollback carefully

## Authentication Issues

### Session Not Persisting

#### Symptoms
- User logged out unexpectedly
- Session cookie not set
- Authentication fails

#### Solutions

1. **Check SESSION_SECRET**
   ```bash
   # Verify SESSION_SECRET is set
   echo $SESSION_SECRET
   ```

2. **Verify Cookie Settings**
   - Check `httpOnly: true`
   - Verify `secure: true` in production
   - Check `sameSite` settings

3. **CORS Configuration**
   - Verify `CORS_ORIGIN` includes frontend URL
   - Check `credentials: true` in CORS config
   - Verify frontend sends credentials

### OAuth Callback Fails

#### Symptoms
- OAuth redirect fails
- "Invalid callback" error
- OAuth flow doesn't complete

#### Solutions

1. **Verify Callback URLs**
   - Google: https://console.cloud.google.com/apis/credentials
   - LinkedIn: https://www.linkedin.com/developers/apps
   - GitHub: https://github.com/settings/developers

2. **Check Environment Variables**
   ```env
   GOOGLE_CALLBACK_URL=https://betabaddies-production.up.railway.app/api/v1/users/auth/google/callback
   ```

3. **Verify OAuth Credentials**
   - Check client ID and secret
   - Verify credentials match environment
   - Check for typos

## API Issues

### 422 Validation Errors

#### Symptoms
- API returns 422 status
- Validation error messages
- Request rejected

#### Solutions

1. **Check Request Format**
   ```json
   // Verify JSON format
   // Check required fields
   // Validate data types
   ```

2. **Review Validation Rules**
   - Check `backend/middleware/validation.js`
   - Verify field requirements
   - Check data format

3. **Test with Valid Data**
   ```bash
   # Test with minimal valid request
   curl -X POST https://api/endpoint \
     -H "Content-Type: application/json" \
     -d '{"field": "value"}'
   ```

### 500 Internal Server Errors

#### Symptoms
- API returns 500
- Generic error messages
- Service crashes

#### Solutions

1. **Check Sentry**
   - Review Sentry dashboard
   - Look for error stack traces
   - Identify error patterns

2. **Check Logs**
   ```bash
   # Railway logs
   railway logs
   
   # Or via dashboard
   ```

3. **Common Causes**
   - Database connection issues
   - Missing environment variables
   - External API failures
   - Null pointer exceptions

### Rate Limiting Issues

#### Symptoms
- 429 Too Many Requests
- Rate limit errors
- API calls blocked

#### Solutions

1. **Check Rate Limit**
   - Default: 1000 requests per 15 minutes
   - Check response headers
   - Monitor usage

2. **Implement Backoff**
   ```javascript
   // Exponential backoff
   const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
   await new Promise(resolve => setTimeout(resolve, delay));
   ```

3. **Optimize Requests**
   - Batch requests when possible
   - Cache responses
   - Reduce unnecessary calls

## File Upload Issues

### Upload Fails

#### Symptoms
- File upload errors
- "File too large" errors
- Upload timeout

#### Solutions

1. **Check File Size**
   ```env
   UPLOAD_MAX_SIZE=10mb
   ```
   - Default: 10MB
   - Increase if needed
   - Check file size limits

2. **Verify Storage Configuration**
   ```env
   CLOUD_PROVIDER=aws-s3  # or local
   AWS_S3_BUCKET=your-bucket
   ```

3. **Check AWS Credentials**
   - Verify `AWS_ACCESS_KEY_ID`
   - Verify `AWS_SECRET_ACCESS_KEY`
   - Check IAM permissions

### S3 Upload Fails

#### Symptoms
- S3 upload errors
- "Access denied" errors
- Presigned URL issues

#### Solutions

1. **Verify IAM Permissions**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": ["s3:PutObject", "s3:GetObject"],
       "Resource": "arn:aws:s3:::bucket-name/*"
     }]
   }
   ```

2. **Check Bucket Configuration**
   - Verify bucket exists
   - Check bucket region
   - Verify CORS configuration

3. **Test S3 Connection**
   ```bash
   aws s3 ls s3://your-bucket
   ```

## Email Issues

### Emails Not Sending

#### Symptoms
- Email service errors
- Emails not delivered
- SMTP/SES errors

#### Solutions

1. **Check Email Configuration**
   ```env
   USE_AWS_SES=true  # or false for SMTP
   ```

2. **AWS SES Issues**
   - Verify email is verified in SES
   - Check SES sending limits
   - Verify IAM permissions

3. **SMTP Issues**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password  # Not regular password
   ```

4. **Test Email Service**
   ```bash
   # Check email service logs
   # Test with simple email
   ```

### Email Delivery Delays

#### Symptoms
- Emails arrive late
- Queued emails
- Delivery failures

#### Solutions

1. **Check Email Queue**
   - Review email service logs
   - Check for queued emails
   - Verify service status

2. **SES Sending Limits**
   - Check SES sending quota
   - Request limit increase if needed
   - Monitor sending rate

## Performance Issues

### Slow API Responses

#### Symptoms
- High response times
- Timeouts
- Slow queries

#### Solutions

1. **Check Database Queries**
   ```sql
   -- Enable query logging
   -- Review slow queries
   -- Add indexes
   ```

2. **Monitor Performance**
   - Check Sentry performance dashboard
   - Review slow endpoints
   - Identify bottlenecks

3. **Optimize Queries**
   - Add database indexes
   - Optimize JOIN queries
   - Use connection pooling

### High Memory Usage

#### Symptoms
- Service crashes
- Out of memory errors
- Slow performance

#### Solutions

1. **Check Resource Usage**
   - Railway dashboard → Metrics
   - Review memory usage
   - Check CPU usage

2. **Optimize Application**
   - Review memory leaks
   - Optimize data structures
   - Reduce cache size

3. **Scale Service**
   - Increase Railway service resources
   - Add more instances
   - Use load balancing

## Monitoring Issues

### Sentry Not Working

#### Symptoms
- Errors not appearing in Sentry
- Sentry initialization fails
- Missing error tracking

#### Solutions

1. **Verify SENTRY_DSN**
   ```env
   SENTRY_DSN=https://xxx@sentry.io/xxx
   ```

2. **Check Node.js Version**
   - Sentry requires Node.js 18.13.0+
   - Verify Node.js version
   - Check compatibility

3. **Test Sentry**
   ```bash
   # Test endpoint
   curl https://api/health
   # Check Sentry dashboard
   ```

### Health Checks Failing

#### Symptoms
- `/health` returns 503
- Database check fails
- Service marked unhealthy

#### Solutions

1. **Check Database**
   ```bash
   # Test database connection
   psql $DATABASE_URL -c "SELECT 1;"
   ```

2. **Verify Health Endpoint**
   ```bash
   curl https://api/health
   ```

3. **Check Service Status**
   - Verify service is running
   - Check Railway/Vercel status
   - Review deployment logs

## Quick Reference

### Common Commands

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check health
curl https://betabaddies-production.up.railway.app/health

# View Railway logs
railway logs

# Test API endpoint
curl -X GET https://api/endpoint \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### Useful Links

- **Sentry Dashboard**: https://sentry.io
- **Railway Dashboard**: https://railway.app
- **Vercel Dashboard**: https://vercel.com
- **Supabase Dashboard**: https://supabase.com

## Getting Help

1. **Check Logs**
   - Railway logs
   - Vercel logs
   - Sentry errors

2. **Review Documentation**
   - [Deployment Runbooks](./deployment-runbooks.md)
   - [Environment Configuration](./environment-configuration.md)
   - [Incident Response](./incident-response.md)

3. **Escalate**
   - Create GitHub issue
   - Contact team
   - Check status pages

## Related Documentation

- [Deployment Runbooks](./deployment-runbooks.md)
- [Environment Configuration](./environment-configuration.md)
- [Incident Response](./incident-response.md)
- [API Integration](./api-integration.md)

