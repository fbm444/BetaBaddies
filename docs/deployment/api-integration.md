# API Integration Documentation

Complete guide to integrating with the BetaBaddies API.

## Table of Contents

- [API Overview](#api-overview)
- [Authentication](#authentication)
- [Base URLs](#base-urls)
- [API Endpoints](#api-endpoints)
- [Request/Response Format](#requestresponse-format)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Webhooks](#webhooks)
- [SDK Examples](#sdk-examples)

## API Overview

The BetaBaddies API is a RESTful API built with Express.js, following REST principles and versioning.

### API Versioning

- **Current Version**: `v1`
- **Base Path**: `/api/v1`
- **Versioning Strategy**: URL path versioning

### API Characteristics

- **Protocol**: HTTPS
- **Data Format**: JSON
- **Character Encoding**: UTF-8
- **Date Format**: ISO 8601 (e.g., `2024-01-01T00:00:00.000Z`)

## Authentication

### Session-Based Authentication

The API uses session-based authentication with HTTP-only cookies.

#### Login Flow

1. **POST** `/api/v1/users/login`
   ```json
   {
     "email": "user@example.com",
     "password": "password123"
   }
   ```

2. **Response** sets HTTP-only session cookie
   ```json
   {
     "ok": true,
     "data": {
       "user": {
         "id": "uuid",
         "email": "user@example.com"
       }
     }
   }
   ```

3. **Subsequent Requests** include session cookie automatically

#### OAuth Authentication

##### Google OAuth

1. **Redirect to**: `/api/v1/users/auth/google`
2. **Callback**: `/api/v1/users/auth/google/callback`
3. **Session**: Automatically created on success

##### LinkedIn OAuth

1. **Redirect to**: `/api/v1/users/auth/linkedin`
2. **Callback**: `/api/v1/users/auth/linkedin/callback`

##### GitHub OAuth

1. **Redirect to**: `/api/v1/users/auth/github`
2. **Callback**: `/api/v1/users/auth/github/callback`

### Making Authenticated Requests

#### Browser (with cookies)

```javascript
// Cookies automatically included
fetch('https://betabaddies-production.up.railway.app/api/v1/users/profile', {
  credentials: 'include'
});
```

#### cURL

```bash
# Login first to get session cookie
curl -X POST https://betabaddies-production.up.railway.app/api/v1/users/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"user@example.com","password":"password123"}'

# Use cookie for authenticated requests
curl https://betabaddies-production.up.railway.app/api/v1/users/profile \
  -b cookies.txt
```

#### Axios (with credentials)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://betabaddies-production.up.railway.app/api/v1',
  withCredentials: true, // Include cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// Authenticated request
const response = await api.get('/users/profile');
```

## Base URLs

### Production

- **Backend**: `https://betabaddies-production.up.railway.app`
- **API**: `https://betabaddies-production.up.railway.app/api/v1`
- **Frontend**: `https://beta-baddies.vercel.app`

### Staging

- **Backend**: `https://betabaddies-staging.up.railway.app`
- **API**: `https://betabaddies-staging.up.railway.app/api/v1`
- **Frontend**: `https://beta-baddies-staging.vercel.app`

### Development

- **Backend**: `http://localhost:3001`
- **API**: `http://localhost:3001/api/v1`
- **Frontend**: `http://localhost:3000`

## API Endpoints

### User Management

#### Register User
```
POST /api/v1/users/register
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    }
  }
}
```

#### Login
```
POST /api/v1/users/login
```

#### Get User Profile
```
GET /api/v1/users/profile
```

**Requires**: Authentication

#### Update Password
```
PUT /api/v1/users/change-password
```

**Requires**: Authentication

#### Delete Account
```
DELETE /api/v1/users/account
```

**Requires**: Authentication

### Job Opportunities

#### List Job Opportunities
```
GET /api/v1/job-opportunities
```

**Query Parameters:**
- `status` - Filter by status (Interested, Applied, Interview, etc.)
- `archived` - Filter archived jobs (true/false)
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset

**Response:**
```json
{
  "ok": true,
  "data": {
    "jobs": [...],
    "count": 10
  }
}
```

#### Create Job Opportunity
```
POST /api/v1/job-opportunities
```

**Request:**
```json
{
  "title": "Software Engineer",
  "company": "Tech Corp",
  "status": "Interested",
  "applicationDate": "2024-01-01",
  "deadline": "2024-01-15",
  "jobDescription": "Job description text...",
  "applicationSource": "LinkedIn"
}
```

#### Get Job Opportunity
```
GET /api/v1/job-opportunities/:id
```

#### Update Job Opportunity
```
PUT /api/v1/job-opportunities/:id
```

#### Delete Job Opportunity
```
DELETE /api/v1/job-opportunities/:id
```

### Resumes

#### List Resumes
```
GET /api/v1/resumes
```

#### Create Resume
```
POST /api/v1/resumes
```

**Request:**
```json
{
  "name": "Software Engineer Resume",
  "templateId": "uuid",
  "sections": {...}
}
```

#### Get Resume
```
GET /api/v1/resumes/:id
```

#### Update Resume
```
PUT /api/v1/resumes/:id
```

#### Generate Resume with AI
```
POST /api/v1/resumes/generate
```

**Request:**
```json
{
  "jobDescription": "Job description...",
  "templateId": "uuid"
}
```

### Interviews

#### List Interviews
```
GET /api/v1/interviews
```

#### Create Interview
```
POST /api/v1/interviews
```

**Request:**
```json
{
  "jobOpportunityId": "uuid",
  "interviewDate": "2024-01-15T10:00:00Z",
  "interviewType": "Phone Screen",
  "location": "Remote",
  "notes": "Interview notes..."
}
```

#### Get Interview
```
GET /api/v1/interviews/:id
```

#### Update Interview
```
PUT /api/v1/interviews/:id
```

### Certifications

#### List Certifications
```
GET /api/v1/certifications
```

#### Create Certification
```
POST /api/v1/certifications
```

**Request:**
```json
{
  "name": "AWS Certified Solutions Architect",
  "orgName": "Amazon Web Services",
  "dateEarned": "2024-01-01",
  "expirationDate": "2026-01-01",
  "neverExpires": false,
  "platform": "AWS",
  "category": "cloud",
  "verificationUrl": "https://...",
  "description": "Certification description..."
}
```

### Market Intelligence

#### Get Market Overview
```
GET /api/v1/market-intelligence/overview
```

**Requires**: Authentication

**Response:**
```json
{
  "ok": true,
  "data": {
    "industryTrends": {...},
    "salaryTrends": {...},
    "skillDemand": {...}
  }
}
```

#### Get Competitive Analysis
```
GET /api/v1/competitive-analysis/:jobOpportunityId
```

**Requires**: Authentication

### Health Checks

#### Health Check
```
GET /health
```

**Response:**
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

#### Readiness Check
```
GET /health/ready
```

#### Liveness Check
```
GET /health/live
```

## Request/Response Format

### Request Headers

```http
Content-Type: application/json
Accept: application/json
Cookie: connect.sid=...
```

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
      "fieldName": "Field-specific error message"
    }
  }
}
```

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error
- `503` - Service Unavailable

### Error Codes

- `VALIDATION_ERROR` - Input validation failed
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource conflict (e.g., duplicate)
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error

### Error Handling Example

```javascript
try {
  const response = await api.post('/job-opportunities', data);
  if (!response.data.ok) {
    // Handle API error
    console.error('API Error:', response.data.error);
    if (response.data.error.code === 'VALIDATION_ERROR') {
      // Handle validation errors
      Object.entries(response.data.error.fields).forEach(([field, message]) => {
        console.error(`${field}: ${message}`);
      });
    }
  }
} catch (error) {
  // Handle network error
  if (error.response) {
    // API responded with error
    console.error('API Error:', error.response.data);
  } else {
    // Network error
    console.error('Network Error:', error.message);
  }
}
```

## Rate Limiting

### Rate Limit Configuration

- **Window**: 15 minutes
- **Max Requests**: 1000 per window
- **Headers**: Rate limit info in response headers

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1704067200
```

### Rate Limit Exceeded

**Status**: `429 Too Many Requests`

**Response:**
```json
{
  "ok": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later."
  }
}
```

## Webhooks

Webhooks are not currently implemented but planned for future releases.

## SDK Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios';

class BetaBaddiesAPI {
  private baseURL: string;
  private client: axios.AxiosInstance;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL: `${baseURL}/api/v1`,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/users/login', {
      email,
      password
    });
    return response.data;
  }

  async getJobOpportunities(params?: any) {
    const response = await this.client.get('/job-opportunities', { params });
    return response.data;
  }

  async createJobOpportunity(data: any) {
    const response = await this.client.post('/job-opportunities', data);
    return response.data;
  }
}

// Usage
const api = new BetaBaddiesAPI('https://betabaddies-production.up.railway.app');
await api.login('user@example.com', 'password');
const jobs = await api.getJobOpportunities();
```

### Python

```python
import requests

class BetaBaddiesAPI:
    def __init__(self, base_url):
        self.base_url = f"{base_url}/api/v1"
        self.session = requests.Session()
    
    def login(self, email, password):
        response = self.session.post(
            f"{self.base_url}/users/login",
            json={"email": email, "password": password}
        )
        return response.json()
    
    def get_job_opportunities(self, params=None):
        response = self.session.get(
            f"{self.base_url}/job-opportunities",
            params=params
        )
        return response.json()

# Usage
api = BetaBaddiesAPI("https://betabaddies-production.up.railway.app")
api.login("user@example.com", "password")
jobs = api.get_job_opportunities()
```

### cURL Examples

```bash
# Login
curl -X POST https://betabaddies-production.up.railway.app/api/v1/users/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"user@example.com","password":"password123"}'

# Get profile
curl https://betabaddies-production.up.railway.app/api/v1/users/profile \
  -b cookies.txt

# Create job opportunity
curl -X POST https://betabaddies-production.up.railway.app/api/v1/job-opportunities \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Software Engineer",
    "company": "Tech Corp",
    "status": "Interested"
  }'
```

## Testing

### Health Check

```bash
curl https://betabaddies-production.up.railway.app/health
```

### API Testing Tools

- **Postman**: Import API collection
- **Insomnia**: REST client
- **cURL**: Command-line tool
- **HTTPie**: User-friendly CLI

## Related Documentation

- [Deployment Runbooks](./deployment-runbooks.md)
- [Troubleshooting Guide](./troubleshooting.md)
- [Backend API Documentation](../../backend/docs/API_ROUTES_DOCUMENTATION.md)

