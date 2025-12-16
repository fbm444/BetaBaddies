# Deployment Runbooks

Step-by-step deployment procedures for the BetaBaddies application.

## Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Production Deployment](#production-deployment)
- [Staging Deployment](#staging-deployment)
- [Rollback Procedures](#rollback-procedures)
- [Post-Deployment Verification](#post-deployment-verification)
- [Emergency Procedures](#emergency-procedures)

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing (`npm run test:all`)
- [ ] No linter errors
- [ ] Code review completed
- [ ] Security scan passed
- [ ] Dependencies updated and secure

### Configuration
- [ ] Environment variables reviewed
- [ ] Database migrations tested
- [ ] API keys valid and not expired
- [ ] OAuth callback URLs configured
- [ ] CORS origins updated if needed

### Documentation
- [ ] Changelog updated
- [ ] Breaking changes documented
- [ ] API changes documented
- [ ] Migration guide prepared (if needed)

### Monitoring
- [ ] Sentry configured
- [ ] Health checks working
- [ ] Monitoring dashboards ready
- [ ] Alert rules configured

## Production Deployment

### Automated Deployment (Recommended)

Production deployments are automated via GitHub Actions when code is pushed to the `main` branch.

#### Steps

1. **Merge to Main Branch**
   ```bash
   git checkout main
   git pull origin main
   git merge staging  # or feature branch
   git push origin main
   ```

2. **GitHub Actions Workflow**
   - Workflow: `.github/workflows/deploy-production.yml`
   - Triggers automatically on push to `main`
   - Can also be triggered manually via GitHub Actions UI

3. **Workflow Steps**
   ```
   1. Checkout code
   2. Setup Node.js 20
   3. Install dependencies (npm ci)
   4. Setup test database
   5. Run all tests
   6. Deploy frontend to Vercel (production)
   7. Send deployment notification (AWS SNS)
   ```

4. **Monitor Deployment**
   - Check GitHub Actions: https://github.com/[repo]/actions
   - Monitor Railway logs: Railway dashboard → Service → Logs
   - Monitor Vercel deployment: Vercel dashboard → Deployments
   - Check Sentry for errors

5. **Verify Deployment**
   - Health check: `curl https://betabaddies-production.up.railway.app/health`
   - Frontend: Visit https://beta-baddies.vercel.app
   - Test critical user flows
   - Check Sentry dashboard for new errors

### Manual Deployment (Emergency)

If automated deployment fails, use manual deployment:

#### Backend (Railway)

1. **Connect to Railway**
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli
   
   # Login
   railway login
   
   # Link project
   railway link
   ```

2. **Deploy**
   ```bash
   # Deploy from current directory
   railway up
   
   # Or deploy specific service
   railway up --service [service-id]
   ```

3. **Set Environment Variables** (if needed)
   ```bash
   railway variables set KEY=value
   ```

#### Frontend (Vercel)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   cd frontend/ats-tracker
   vercel --prod
   ```

## Staging Deployment

### Automated Deployment

Staging deployments are automated when code is pushed to the `staging` branch.

#### Steps

1. **Push to Staging**
   ```bash
   git checkout staging
   git pull origin staging
   git merge development  # or feature branch
   git push origin staging
   ```

2. **GitHub Actions Workflow**
   - Workflow: `.github/workflows/deploy-staging.yml`
   - Triggers automatically on push to `staging`

3. **Workflow Steps**
   ```
   1. Checkout code
   2. Setup Node.js 20
   3. Install dependencies
   4. Setup test database
   5. Run all tests
   6. Deploy backend to Railway (staging)
   7. Deploy frontend to Vercel (staging)
   8. Send deployment notification
   ```

4. **Verify Staging**
   - Health check: `curl [staging-backend-url]/health`
   - Test staging environment
   - Verify environment variables

### Manual Staging Deployment

```bash
# Backend
cd backend
railway up --environment staging

# Frontend
cd frontend/ats-tracker
vercel --env staging
```

## Rollback Procedures

### Automated Rollback

Use the GitHub Actions rollback workflow:

1. **GitHub Actions → Rollback Deployment**
2. **Select Environment**: Production or Staging
3. **Enter Commit SHA**: Previous working commit (optional)
4. **Run Workflow**

### Manual Rollback

#### Backend (Railway)

1. **Via Railway Dashboard**
   - Go to Railway project
   - Select service
   - Go to Deployments
   - Click "Redeploy" on previous working deployment

2. **Via Railway CLI**
   ```bash
   railway rollback [deployment-id]
   ```

#### Frontend (Vercel)

1. **Via Vercel Dashboard**
   - Go to Vercel project
   - Go to Deployments
   - Find previous working deployment
   - Click "..." → "Promote to Production"

2. **Via Vercel CLI**
   ```bash
   vercel rollback [deployment-url]
   ```

### Database Rollback

If database migrations need to be rolled back:

1. **Identify Migration**
   ```bash
   # List recent migrations
   ls -lt db/migrations/
   ```

2. **Create Rollback Script**
   ```sql
   -- Create rollback SQL script
   -- Example: rollback_migration_xxx.sql
   ```

3. **Execute Rollback**
   ```bash
   # Connect to database
   psql $DATABASE_URL -f rollback_migration_xxx.sql
   ```

4. **Verify**
   ```bash
   # Check database state
   psql $DATABASE_URL -c "SELECT * FROM schema_migrations;"
   ```

## Post-Deployment Verification

### Health Checks

1. **Backend Health**
   ```bash
   curl https://betabaddies-production.up.railway.app/health
   ```
   Expected response:
   ```json
   {
     "ok": true,
     "data": {
       "status": "healthy",
       "checks": {
         "database": true,
         "timestamp": "2024-01-01T00:00:00.000Z"
       }
     }
   }
   ```

2. **Readiness Check**
   ```bash
   curl https://betabaddies-production.up.railway.app/health/ready
   ```

3. **Liveness Check**
   ```bash
   curl https://betabaddies-production.up.railway.app/health/live
   ```

### Functional Testing

1. **Authentication**
   - [ ] User registration
   - [ ] User login
   - [ ] OAuth login (Google, LinkedIn)
   - [ ] Password reset

2. **Core Features**
   - [ ] Job opportunity creation
   - [ ] Resume upload/generation
   - [ ] Interview scheduling
   - [ ] Profile management

3. **API Endpoints**
   - [ ] Test critical API endpoints
   - [ ] Verify response formats
   - [ ] Check error handling

### Monitoring Checks

1. **Sentry**
   - [ ] No new critical errors
   - [ ] Error rate within normal range
   - [ ] Performance metrics normal

2. **Railway**
   - [ ] Service running
   - [ ] Resource usage normal
   - [ ] No deployment errors

3. **Vercel**
   - [ ] Frontend deployed successfully
   - [ ] Build successful
   - [ ] No build errors

4. **Database**
   - [ ] Connection pool healthy
   - [ ] Query performance normal
   - [ ] No connection errors

## Emergency Procedures

### Service Down

1. **Check Status**
   ```bash
   # Backend health
   curl https://betabaddies-production.up.railway.app/health
   
   # Check Railway status
   # Check Vercel status
   ```

2. **Check Logs**
   - Railway: Dashboard → Service → Logs
   - Vercel: Dashboard → Deployments → Logs
   - Sentry: Error dashboard

3. **Immediate Actions**
   - If backend down: Restart Railway service
   - If frontend down: Redeploy Vercel
   - If database issue: Check Supabase status

4. **Rollback if Needed**
   - Follow [Rollback Procedures](#rollback-procedures)

### Database Issues

1. **Connection Issues**
   ```bash
   # Test connection
   psql $DATABASE_URL -c "SELECT 1;"
   ```

2. **Check Connection Pool**
   - Verify `DATABASE_URL` uses port 6543 (Supabase pooler)
   - Check connection pool settings

3. **Supabase Dashboard**
   - Check Supabase project status
   - Review connection pool metrics
   - Check for maintenance windows

### High Error Rate

1. **Check Sentry**
   - Identify error patterns
   - Check affected users
   - Review error stack traces

2. **Check Logs**
   - Railway logs for errors
   - Application logs for patterns

3. **Immediate Actions**
   - If critical bug: Rollback immediately
   - If rate limit: Check API quotas
   - If external service: Check service status

### Performance Degradation

1. **Check Metrics**
   - Sentry performance dashboard
   - Railway resource usage
   - Database query performance

2. **Identify Bottlenecks**
   - Slow API endpoints
   - Database query issues
   - External API delays

3. **Actions**
   - Scale Railway service if needed
   - Optimize slow queries
   - Check external API status

## Deployment Best Practices

### Before Deployment

1. **Test Locally**
   ```bash
   npm run test:all
   npm start  # Test locally
   ```

2. **Review Changes**
   - Review all code changes
   - Check for breaking changes
   - Verify environment variables

3. **Staging First**
   - Always deploy to staging first
   - Test thoroughly in staging
   - Only deploy to production after staging verification

### During Deployment

1. **Monitor Closely**
   - Watch deployment logs
   - Monitor error rates
   - Check health endpoints

2. **Communicate**
   - Notify team of deployment
   - Update status page if needed
   - Document any issues

### After Deployment

1. **Verify**
   - Run health checks
   - Test critical flows
   - Monitor for errors

2. **Document**
   - Update changelog
   - Document any issues
   - Update runbook if needed

## Deployment Schedule

### Recommended Schedule

- **Production**: Monday-Thursday, 10 AM - 2 PM EST
- **Staging**: Anytime (for testing)
- **Hotfixes**: As needed (with approval)

### Deployment Windows

- **Low Traffic**: 10 AM - 2 PM EST
- **Avoid**: Friday afternoons, weekends, holidays
- **Emergency**: Anytime (with team notification)

## Troubleshooting Deployment Issues

See [Troubleshooting Guide](./troubleshooting.md) for common deployment issues and solutions.

## Related Documentation

- [Architecture Diagrams](./architecture-diagrams.md)
- [Environment Configuration](./environment-configuration.md)
- [Troubleshooting Guide](./troubleshooting.md)
- [Incident Response](./incident-response.md)

