// Middleware to check if user is authenticated
export const isAuthenticated = (req, res, next) => {
  console.log(`[isAuthenticated] Checking authentication for ${req.method} ${req.path}`);
  console.log(`[isAuthenticated] Session data:`, {
    hasSession: !!req.session,
    userId: req.session?.userId,
    userEmail: req.session?.userEmail,
    cookie: req.headers.cookie ? 'present' : 'missing',
  });

  if (req.session && req.session.userId) {
    console.log(`[isAuthenticated] ✅ User authenticated: ${req.session.userId}`);
    return next();
  }
  
  console.log(`[isAuthenticated] ❌ User not authenticated`);
  res.status(401).json({
    ok: false,
    error: {
      code: "UNAUTHORIZED",
      message: "Authentication required",
    },
  });
};

// Backwards-compatible alias used by some routes
export const requireAuth = isAuthenticated;

// Rate limiting middleware for authentication attempts
export const authRateLimit = (windowMs, maxAttempts) => (req, res, next) => {
  // Ensure session exists (express-session should create it, but check to be safe)
  if (!req.session) {
    // If session middleware isn't working, skip rate limiting
    console.warn("⚠️ Session not available for rate limiting, allowing request");
    return next();
  }

  const ip = req.ip;
  const now = Date.now();
  const key = `auth_rate_limit_${ip}`;

  // Initialize rateLimit object if it doesn't exist
  if (!req.session.rateLimit) {
    req.session.rateLimit = {};
  }

  const userLimit = req.session.rateLimit[key] || {
    count: 0,
    resetTime: now + windowMs,
  };

  // Reset if time window has passed
  if (now > userLimit.resetTime) {
    userLimit.count = 1;
    userLimit.resetTime = now + windowMs;
  } else {
    userLimit.count++;
  }

  req.session.rateLimit[key] = userLimit;

  // Check if rate limit exceeded
  if (userLimit.count > maxAttempts) {
    return res.status(429).json({
      ok: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many authentication attempts. Please try again later.",
      },
    });
  }

  next();
};
