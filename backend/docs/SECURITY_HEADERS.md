# Security Headers Configuration

## Current Status: ✅ Configured

Security headers are configured using Helmet.js and are active in production.

## Headers Currently Set

Based on production response headers, the following security headers are configured:

### ✅ Content-Security-Policy (CSP)

```
default-src 'self';
style-src 'self' 'unsafe-inline';
script-src 'self';
img-src 'self' data: https:;
base-uri 'self';
font-src 'self' https: data:;
form-action 'self';
frame-ancestors 'self';
object-src 'none';
script-src-attr 'none';
upgrade-insecure-requests
```

**Configuration:** `backend/server.js` lines 65-77

### ✅ Strict-Transport-Security (HSTS)

```
max-age=31536000; includeSubDomains
```

**Status:** Enabled by Helmet (default)

- Forces HTTPS connections
- 1 year max-age
- Includes subdomains

### ✅ X-Content-Type-Options

```
nosniff
```

**Status:** Enabled by Helmet (default)

- Prevents MIME-type sniffing
- Forces browsers to respect declared content types

### ✅ X-Frame-Options

```
SAMEORIGIN
```

**Status:** Enabled by Helmet (default)

- Prevents clickjacking attacks
- Allows framing from same origin only

### ✅ X-DNS-Prefetch-Control

```
off
```

**Status:** Enabled by Helmet (default)

- Disables DNS prefetching for privacy

### ✅ X-Download-Options

```
noopen
```

**Status:** Enabled by Helmet (default)

- Prevents Internet Explorer from executing downloads

### ✅ X-Permitted-Cross-Domain-Policies

```
none
```

**Status:** Enabled by Helmet (default)

- Restricts cross-domain policies

### ✅ X-XSS-Protection

```
0
```

**Status:** Enabled by Helmet (default)

- Disabled (correct for modern browsers)
- Modern browsers have built-in XSS protection

## Configuration

Security headers are configured in `backend/server.js`:

```javascript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);
```

## Testing Security Headers

### Check Headers in Production

```bash
# Check all headers
curl -I https://betabaddies-production.up.railway.app/health

# Check specific security headers
curl -I https://betabaddies-production.up.railway.app/health | grep -i "x-\|strict-transport\|content-security"
```

### Online Tools

- **SecurityHeaders.com**: https://securityheaders.com
- **HTTP Security Headers Analyzer**: https://httpsecurityheaders.com

## Recommendations

### Current Configuration: ✅ Good

The current configuration is appropriate for an API backend:

1. **CSP is configured** - Protects against XSS attacks
2. **HSTS is enabled** - Forces HTTPS connections
3. **All standard headers are set** - Comprehensive protection

### Optional Enhancements

If you need to serve a frontend from the same domain, you may want to adjust CSP:

```javascript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
    imgSrc: ["'self'", "data:", "https:"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    connectSrc: ["'self'", "https://api.example.com"],
  },
}
```

**Note:** For API-only backends, the current CSP is sufficient.

## Security Best Practices

1. ✅ **Helmet.js is configured** - Provides comprehensive security headers
2. ✅ **HSTS is enabled** - Forces HTTPS
3. ✅ **CSP is configured** - Prevents XSS attacks
4. ✅ **Trust proxy is set** - Required for Railway/cloud deployments
5. ✅ **Rate limiting is configured** - Prevents abuse
6. ✅ **CORS is properly configured** - Restricts origins
7. ✅ **Session cookies are secure** - HttpOnly, Secure, SameSite

## Verification

To verify headers are working:

```bash
# Test production
curl -I https://betabaddies-production.up.railway.app/health

# Expected headers:
# - content-security-policy
# - strict-transport-security
# - x-content-type-options: nosniff
# - x-frame-options: SAMEORIGIN
# - x-xss-protection: 0
```

## References

- [Helmet.js Documentation](https://helmetjs.github.io/)
- [OWASP Secure Headers](https://owasp.org/www-project-secure-headers/)
- [MDN Security Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security)

