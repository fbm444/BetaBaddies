# Security Testing Suite

## Overview

This security testing suite performs basic penetration testing to identify common OWASP Top 10 vulnerabilities.

## Running the Tests

```bash
cd backend
node tests/security.test.js
```

Or using the test runner:

```bash
npm test -- tests/security.test.js
```

## Test Coverage

### 1. SQL Injection Tests
- Tests SQL injection attempts in login forms
- Tests SQL injection in search/filter parameters
- Verifies that SQL errors are not exposed to users

### 2. XSS (Cross-Site Scripting) Tests
- Tests XSS payloads in user input fields
- Verifies that script tags are sanitized in responses
- Checks for script execution in profile fields

### 3. Authentication Bypass Tests
- Tests access to protected endpoints without authentication
- Tests invalid session cookies
- Tests path traversal in session cookies

### 4. Rate Limiting Tests
- Verifies rate limiting on login endpoints
- Tests that excessive requests are blocked

### 5. Authorization Tests
- Tests that users cannot access other users' resources
- Verifies proper access control on protected resources

### 6. CSRF Tests
- Tests cross-origin request handling
- Verifies CSRF protection (if implemented)

### 7. Sensitive Data Exposure Tests
- Checks for sensitive information in error messages
- Verifies passwords are not returned in API responses
- Tests for stack traces in error responses

### 8. Input Validation Tests
- Tests extremely long input strings
- Tests special characters and edge cases
- Verifies proper input sanitization

### 9. Session Management Tests
- Tests session invalidation on logout
- Verifies session timeout handling

### 10. API Endpoint Security Tests
- Tests HTTP method restrictions
- Verifies proper error handling for unsupported methods

## Expected Results

### Passing Tests
- ✓ SQL injection attempts are blocked
- ✓ XSS payloads are sanitized
- ✓ Unauthenticated access is denied
- ✓ Rate limiting works correctly
- ✓ Sensitive data is not exposed
- ✓ Input validation works properly

### Common Issues to Fix

1. **SQL Injection**: Ensure all database queries use parameterized statements
2. **XSS**: Sanitize all user input before storing or displaying
3. **Authentication**: Verify all protected routes require authentication
4. **Rate Limiting**: Implement rate limiting on authentication endpoints
5. **Sensitive Data**: Never expose passwords, stack traces, or database errors
6. **Input Validation**: Validate and sanitize all user inputs

## Security Best Practices

1. **Always use parameterized queries** - Never concatenate user input into SQL queries
2. **Sanitize user input** - Use libraries like DOMPurify for HTML sanitization
3. **Implement proper authentication** - Use secure session management
4. **Rate limit authentication endpoints** - Prevent brute force attacks
5. **Validate all inputs** - Use validation libraries like Joi
6. **Don't expose sensitive data** - Sanitize error messages
7. **Use HTTPS** - Encrypt all communications
8. **Implement CSRF protection** - Use CSRF tokens for state-changing operations
9. **Keep dependencies updated** - Regularly update npm packages
10. **Use security headers** - Implement Helmet.js for security headers

## Notes

- These are basic security tests. For production applications, consider:
  - Professional penetration testing
  - Automated security scanning tools (OWASP ZAP, Burp Suite)
  - Dependency vulnerability scanning (npm audit, Snyk)
  - Code security analysis (SonarQube, ESLint security plugins)

## Reporting Issues

If tests fail, document the vulnerability and fix it immediately. Common fixes:

- **SQL Injection**: Use parameterized queries (already implemented via database.query)
- **XSS**: Sanitize output using libraries like DOMPurify
- **Authentication**: Ensure isAuthenticated middleware is applied
- **Rate Limiting**: Adjust rate limit configuration
- **Sensitive Data**: Sanitize error messages in errorHandler middleware

