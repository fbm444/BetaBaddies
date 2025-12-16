# Deployment Documentation

Comprehensive deployment documentation for the BetaBaddies application.

## 📚 Documentation Index

This directory contains all deployment-related documentation:

- **[Architecture Diagrams](./architecture-diagrams.md)** - System architecture and component diagrams
- **[Deployment Runbooks](./deployment-runbooks.md)** - Step-by-step deployment procedures
- **[Environment Configuration](./environment-configuration.md)** - Environment variables and configuration
- **[API Integration](./api-integration.md)** - API endpoints and integration guides
- **[Troubleshooting Guide](./troubleshooting.md)** - Common issues and solutions
- **[Incident Response](./incident-response.md)** - Incident handling procedures

## 🚀 Quick Links

- **Production Backend**: https://betabaddies-production.up.railway.app
- **Production Frontend**: https://beta-baddies.vercel.app
- **Sentry Dashboard**: https://sentry.io
- **Railway Dashboard**: https://railway.app
- **Vercel Dashboard**: https://vercel.com

## 📋 Prerequisites

Before deploying, ensure you have:

- GitHub repository access
- Railway account and project
- Vercel account and project
- Supabase database
- AWS account (for S3, SES, SNS)
- Sentry account
- All required API keys (OpenAI, Google OAuth, etc.)

## 🔐 Required Secrets

See [Environment Configuration](./environment-configuration.md) for complete list of required environment variables and secrets.

## 📖 Getting Started

1. Review [Architecture Diagrams](./architecture-diagrams.md) to understand the system
2. Configure [Environment Variables](./environment-configuration.md)
3. Follow [Deployment Runbooks](./deployment-runbooks.md) for deployment procedures
4. Refer to [Troubleshooting Guide](./troubleshooting.md) if issues arise
5. Follow [Incident Response](./incident-response.md) procedures for production incidents

## 🔄 Deployment Workflow

```
Development → Staging → Production
     ↓           ↓          ↓
   Local    Railway    Railway
            Vercel     Vercel
```

## 📞 Support

For deployment issues:
1. Check [Troubleshooting Guide](./troubleshooting.md)
2. Review [Incident Response](./incident-response.md)
3. Check Sentry for error logs
4. Review Railway/Vercel deployment logs

