# API Monitoring System

## Overview

The API Monitoring System provides comprehensive tracking, logging, and reporting for all external API integrations. Administrators can monitor API usage, track quotas, view errors, and generate reports to optimize integrations and stay within free tier limits.

## Features

✅ **API Usage Statistics** - Track requests, success rates, tokens used, and costs for all services  
✅ **Quota Tracking** - Monitor remaining quota for rate-limited APIs (daily, hourly, monthly)  
✅ **Rate Limit Alerts** - Automatic alerts when approaching API rate limits (80% and 95% thresholds)  
✅ **Error Logging** - Comprehensive error logging with timestamps, error codes, and details  
✅ **Fallback Mechanisms** - Automatic fallback when APIs are unavailable  
✅ **User-Facing Messages** - Display API limitation messages to users  
✅ **Performance Monitoring** - Track response times (avg, P50, P95, P99, min, max)  
✅ **Weekly Reports** - Generate and view weekly API usage reports  

## Database Setup

Run the migration to create the monitoring tables:

```bash
psql -U postgres -d ats_tracker -f db/migrations/create_api_monitoring_tables.sql
```

This creates the following tables:
- `api_services` - Configuration for each API service
- `api_usage_logs` - Logs of all API calls
- `api_error_logs` - Error logs with details
- `api_quotas` - Quota tracking (hourly, daily, monthly)
- `api_response_times` - Performance metrics
- `api_alerts` - Rate limit and error alerts
- `api_usage_reports` - Weekly usage reports

## Monitored Services

The system automatically tracks:
- **OpenAI** - AI-powered features (summaries, cover letters, resume assistance, etc.)
- **Abstract API** - Company enrichment data
- **NewsAPI** - Company news articles
- **BLS API** - Bureau of Labor Statistics salary data

## Usage

### Backend

#### Wrapping API Calls

Use the `wrapApiCall` utility to monitor API calls:

```javascript
import { wrapApiCall } from "../utils/apiCallWrapper.js";

const result = await wrapApiCall({
  serviceName: "openai",
  endpoint: "chatCompletion",
  userId: req.session.userId,
  apiCall: async () => {
    return await openai.chat.completions.create({...});
  },
  fallback: async (error) => {
    // Return fallback data
    return { data: "Fallback response" };
  },
  tokenCalculator: (response) => response.usage?.total_tokens,
  costCalculator: (response, tokens) => {
    // Calculate cost based on tokens and model
    return tokens * 0.00003; // Example: $0.00003 per token
  }
});
```

#### API Monitoring Service

```javascript
import apiMonitoringService from "../services/apiMonitoringService.js";

// Get usage statistics
const stats = await apiMonitoringService.getUsageStats("openai", startDate, endDate);

// Get remaining quota
const quota = await apiMonitoringService.getRemainingQuota("newsapi", "daily");

// Get recent errors
const errors = await apiMonitoringService.getRecentErrors("openai", 50);

// Get active alerts
const alerts = await apiMonitoringService.getActiveAlerts();

// Generate weekly report
const reports = await apiMonitoringService.generateWeeklyReport();
```

### Frontend

#### Accessing the Admin Dashboard

Navigate to `/admin/api-monitoring` in your browser (requires authentication).

The dashboard provides:
- **Dashboard Tab** - Overview with summary cards, quotas, alerts, and usage stats
- **Usage Stats Tab** - Detailed usage statistics with filters
- **Errors Tab** - Recent API errors with details
- **Alerts Tab** - Active rate limit and error alerts
- **Performance Tab** - Response time metrics
- **Reports Tab** - Weekly usage reports

#### Using the API Monitoring Service

```typescript
import { apiMonitoringService } from "../services/apiMonitoringService";

// Get dashboard summary
const dashboard = await apiMonitoringService.getDashboard();

// Get usage stats
const stats = await apiMonitoringService.getUsageStats("openai", "2024-01-01", "2024-01-31");

// Get quotas
const quotas = await apiMonitoringService.getQuotas("newsapi", "daily");

// Get errors
const errors = await apiMonitoringService.getRecentErrors("openai", 100);

// Get alerts
const alerts = await apiMonitoringService.getActiveAlerts();

// Resolve alert
await apiMonitoringService.resolveAlert(alertId);

// Generate weekly report
const reports = await apiMonitoringService.generateWeeklyReport();
```

## API Endpoints

All endpoints require authentication and are prefixed with `/api/v1/admin/api-monitoring`:

- `GET /dashboard` - Get dashboard summary
- `GET /stats` - Get usage statistics (query params: `serviceName`, `startDate`, `endDate`)
- `GET /quotas` - Get quota information (query params: `serviceName`, `periodType`)
- `GET /errors` - Get recent errors (query params: `serviceName`, `limit`)
- `GET /alerts` - Get active alerts (query params: `serviceName`)
- `PATCH /alerts/:alertId/resolve` - Resolve an alert
- `GET /response-times` - Get response time metrics (query params: `serviceName`, `startDate`, `endDate`, `limit`)
- `GET /reports/weekly` - Get weekly reports (query params: `serviceName`, `weeks`)
- `POST /reports/weekly` - Generate weekly report (body: `{ serviceName?: string }`)

## Configuration

### Setting Rate Limits

Update the `api_services` table to configure rate limits:

```sql
UPDATE api_services 
SET rate_limit_per_day = 100, 
    quota_limit_per_month = 3000
WHERE service_name = 'newsapi';
```

### Cost Calculation

For OpenAI, the system tracks tokens. To calculate costs, implement a cost calculator:

```javascript
costCalculator: (response, tokensUsed) => {
  const model = response.model || 'gpt-4';
  const costPerToken = {
    'gpt-4': 0.00003,
    'gpt-4o-mini': 0.0000015,
    'gpt-3.5-turbo': 0.000002
  }[model] || 0.00003;
  return tokensUsed * costPerToken;
}
```

## Fallback Mechanisms

The system includes automatic fallback mechanisms:

1. **Abstract API** - Returns minimal data structure if API fails
2. **NewsAPI** - Returns empty array if API fails
3. **BLS API** - Returns null if API fails (caller handles)
4. **OpenAI** - Services should implement their own fallbacks

## Alerts

The system automatically creates alerts when:
- Rate limit usage reaches 80% (warning)
- Rate limit usage reaches 95% (critical)
- Monthly quota reaches 80% (warning/critical)
- Critical errors occur (rate limit exceeded, quota exceeded)

Alerts can be resolved from the admin dashboard.

## Weekly Reports

Weekly reports are automatically generated and include:
- Total requests (successful and failed)
- Token usage and costs
- Average, P95, and P99 response times
- Error counts
- Rate limit hits

Reports can be manually generated from the dashboard or scheduled via cron job.

## User-Facing Messages

When APIs are unavailable or rate-limited, the system provides user-friendly messages:

- Rate limit warnings are displayed in the UI
- Fallback mechanisms ensure features continue to work
- Error messages are logged but don't break user experience

## Best Practices

1. **Always use `wrapApiCall`** for external API calls
2. **Implement fallbacks** for critical features
3. **Monitor quotas regularly** to avoid service interruptions
4. **Set up alerts** for important services
5. **Review weekly reports** to optimize usage
6. **Calculate costs accurately** for budget planning

## Troubleshooting

### No data showing in dashboard
- Ensure the database migration has been run
- Check that API services are being called with the monitoring wrapper
- Verify API service names match those in the `api_services` table

### Alerts not appearing
- Check that rate limits are configured in `api_services` table
- Verify quota tracking is working (check `api_quotas` table)
- Ensure alerts aren't being filtered out as duplicates

### Performance issues
- The system uses indexes for efficient queries
- Consider archiving old logs if tables grow too large
- Use date filters when querying large datasets

## Future Enhancements

- Email notifications for critical alerts
- Automated quota management
- Cost budget alerts
- Integration with monitoring tools (e.g., Grafana, Datadog)
- API key rotation management
- Historical trend analysis

