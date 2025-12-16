// Middleware to check if user is authenticated
export const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
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
  const ip = req.ip;
  const now = Date.now();
  const key = `auth_rate_limit_${ip}`;

  if (!req.session.rateLimit) {
    req.session.rateLimit = {};
  }

  const userLimit = req.session.rateLimit[key] || {
    count: 0,
    resetTime: now + windowMs,
  };

  if (now > userLimit.resetTime) {
    userLimit.count = 1;
    userLimit.resetTime = now + windowMs;
  } else {
    userLimit.count++;
  }

  req.session.rateLimit[key] = userLimit;

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
