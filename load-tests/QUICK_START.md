# Quick Start Guide - Load Testing

## 1. Install k6

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```powershell
choco install k6
```

Verify installation:
```bash
k6 version
```

## 2. Create Test User

**Easiest method (via API):**
```bash
cd load-tests
./create-user-via-api.sh
```

**Alternative method (via script):**
```bash
cd backend
node scripts/createLoadTestUser.js
```

**Manual method (via curl):**
```bash
curl -X POST http://localhost:3001/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{"email": "loadtest@example.com", "password": "LoadTest123!"}'
```

## 3. Start Your Backend Server

Make sure your backend is running:
```bash
cd backend
npm start
```

## 4. Verify Login Works

Test that login is working before running full load tests:

```bash
cd load-tests
k6 run test-login.js
```

This will verify:
- Test user can log in
- Session cookie is extracted correctly
- Authenticated requests work

## 5. Run Load Tests

### Quick Test (API Endpoints - 50-100 users)
```bash
cd load-tests
k6 run api-endpoints.test.js
```

### All Tests
```bash
cd load-tests
chmod +x run-load-tests.sh
./run-load-tests.sh
```

### Custom Configuration
```bash
API_URL="http://localhost:3001/api/v1" \
TEST_USER_EMAIL="loadtest@example.com" \
TEST_USER_PASSWORD="LoadTest123!" \
k6 run full-load.test.js
```

## 5. View Results

Results are saved to `load-test-results/` directory:
- **JSON**: Detailed metrics
- **CSV**: Time-series data
- **HTML**: Visual reports (some tests)
- **Logs**: Console output

## Test Scenarios

| Test | Users | Duration | Focus |
|------|-------|----------|-------|
| `api-endpoints.test.js` | 25→100 | ~10 min | API endpoints |
| `database-performance.test.js` | 20→75 | ~7 min | Database queries |
| `file-upload-download.test.js` | 10→50 | ~7 min | File operations |
| `full-load.test.js` | 25→100 | ~17 min | Complete user journey |

## Performance Targets

- ✅ **P95 Response Time**: < 500ms
- ✅ **P99 Response Time**: < 1000ms
- ✅ **Error Rate**: < 1%
- ✅ **Database Queries**: < 500ms (P95)

## Troubleshooting

**"Login failed"**: Create test user first
**"Connection refused"**: Start backend server
**"High error rate"**: Check backend logs and database

For more details, see [README.md](./README.md)

