# Security Testing Quick Start

## Quick Run

```bash
cd backend
node tests/security.test.js
```

## What It Tests

The security test suite automatically tests for:

1. ✅ **SQL Injection** - Attempts SQL injection in login and search fields
2. ✅ **XSS (Cross-Site Scripting)** - Tests XSS payloads in user inputs
3. ✅ **Authentication Bypass** - Verifies protected endpoints require auth
4. ✅ **Rate Limiting** - Tests that rate limits work on login
5. ✅ **Authorization** - Checks access control on resources
6. ✅ **CSRF** - Tests cross-origin request handling
7. ✅ **Sensitive Data Exposure** - Checks for passwords/errors in responses
8. ✅ **Input Validation** - Tests long inputs and special characters
9. ✅ **Session Management** - Verifies logout invalidates sessions
10. ✅ **API Security** - Tests HTTP method restrictions

## Expected Output

```
🔒 Starting Security Testing Suite
==================================================
=== SQL Injection Tests ===
✓ PASS: SQL Injection in login (' OR '1'='1) - Status: 401
...
==================================================
📊 Security Test Summary
==================================================
✓ Passed: 25
✗ Failed: 0
⚠ Warnings: 2
```

## Fixing Issues

If tests fail:

1. **SQL Injection failures**: Ensure all queries use parameterized statements (already done via `database.query()`)
2. **XSS failures**: Sanitize user input before storing/displaying
3. **Authentication failures**: Verify `isAuthenticated` middleware is applied
4. **Rate limiting failures**: Check rate limit configuration in `authRateLimit`
5. **Sensitive data exposure**: Review error messages in `errorHandler.js`

## Integration with CI/CD

Add to your test suite:

```bash
# In package.json scripts
"test:security": "node tests/security.test.js"
```


