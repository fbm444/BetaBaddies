import express from "express";
import cors from "cors";
import session from "express-session";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import passport from "./config/passport.js";

// Import routes
import userRoutes from "./routes/userRoutes.js";
import educationRoutes from "./routes/educationRoutes.js";
import skillRoutes from "./routes/skillRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import jobOpportunityRoutes from "./routes/jobOpportunityRoutes.js";
import certificationRoutes from "./routes/certificationRoutes.js";
import fileUploadRoutes from "./routes/fileUploadRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import resumeRoutes from "./routes/resumes/index.js";
import prospectiveJobRoutes from "./routes/prospectiveJobRoutes.js";
import coverLetterRoutes from "./routes/coverletters/index.js";
import companyResearchRoutes from "./routes/companyResearchRoutes.js";
import interviewRoutes from "./routes/interviewRoutes.js";
import interviewPrepRoutes from "./routes/interviewPrepRoutes.js";
import googleCalendarRoutes from "./routes/googleCalendarRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import goalRoutes from "./routes/goalRoutes.js";
import marketIntelligenceRoutes from "./routes/marketIntelligenceRoutes.js";
import timeLogRoutes from "./routes/timeLogRoutes.js";
import competitiveAnalysisRoutes from "./routes/competitiveAnalysisRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import collaborationRoutes from "./routes/collaborationRoutes.js";
import familyRoutes from "./routes/familyRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import followUpRoutes from "./routes/followUpRoutes.js";
import salaryNegotiationRoutes from "./routes/salaryNegotiationRoutes.js";
import writingPracticeRoutes from "./routes/writingPracticeRoutes.js";
import interviewPredictionRoutes from "./routes/interviewPredictionRoutes.js";
import googleContactsRoutes from "./routes/googleContactsRoutes.js";
import networkDiscoveryRoutes from "./routes/networkDiscoveryRoutes.js";
import professionalContactRoutes from "./routes/professionalContactRoutes.js";
import networkingEventRoutes from "./routes/networkingEventRoutes.js";
import referralRequestRoutes from "./routes/referralRequestRoutes.js";
import networkingGoalRoutes from "./routes/networkingGoalRoutes.js";
import linkedinRoutes from "./routes/linkedinRoutes.js";
import networkingRoutes from "./routes/networkingRoutes.js";

// Import middleware
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();

// Trust proxy - required for Railway and other cloud platforms
// This allows Express to correctly identify client IPs behind proxies
app.set("trust proxy", true);

// Security middleware
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

// CORS configuration
// Support multiple origins: production, preview deployments, and custom domains
let corsOrigin =
  process.env.CORS_ORIGIN ||
  process.env.FRONTEND_URL ||
  "http://localhost:3000";

// If FRONTEND_URL is set, automatically add common Vercel patterns
if (process.env.FRONTEND_URL && !process.env.CORS_ORIGIN) {
  const baseUrl = process.env.FRONTEND_URL;
  // Extract base domain (e.g., beta-baddies-72i5blr64-ats-trackers-projects.vercel.app)
  const urlMatch = baseUrl.match(/https?:\/\/([^/]+)/);
  if (urlMatch) {
    const domain = urlMatch[1];
    // Add production domain if it's a preview URL
    if (domain.includes("-") && domain.endsWith(".vercel.app")) {
      // Also allow the main vercel.app domain (without preview hash)
      const mainDomain =
        domain.split("-").slice(0, -1).join("-") + ".vercel.app";
      corsOrigin = `${baseUrl},https://${mainDomain},https://beta-baddies.vercel.app`;
    } else {
      // If it's already the main domain, also allow preview URLs
      corsOrigin = `${baseUrl},https://beta-baddies-*.vercel.app`;
    }
  }
}

const corsOrigins = corsOrigin.split(",").map((origin) => origin.trim());

// Log CORS configuration on startup
console.log("🌐 CORS Configuration:");
console.log(`   Allowed origins: ${corsOrigins.join(", ")}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || "development"}`);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        console.log("✅ CORS: Allowing request with no origin");
        return callback(null, true);
      }

      // In development, allow all origins
      if (process.env.NODE_ENV === "development") {
        console.log(`✅ CORS: Development mode - allowing origin: ${origin}`);
        return callback(null, true);
      }

      // Normalize origin (remove trailing slash)
      const normalizedOrigin = origin.endsWith("/")
        ? origin.slice(0, -1)
        : origin;
      const normalizedAllowed = corsOrigins.map((o) =>
        o.endsWith("/") ? o.slice(0, -1) : o
      );

      // Check against allowed origins (case-insensitive)
      // Also support wildcard patterns like *.vercel.app
      const isAllowed = normalizedAllowed.some((allowed) => {
        const allowedLower = allowed.toLowerCase();
        const originLower = normalizedOrigin.toLowerCase();

        // Exact match
        if (allowedLower === originLower) return true;

        // Wildcard pattern match (e.g., *.vercel.app)
        if (allowedLower.includes("*")) {
          const pattern = allowedLower.replace(/\*/g, ".*");
          const regex = new RegExp(`^${pattern}$`);
          return regex.test(originLower);
        }

        return false;
      });

      if (isAllowed) {
        console.log(`✅ CORS: Allowing origin: ${origin}`);
        callback(null, true);
      } else {
        console.error(`❌ CORS: Blocked origin: ${origin}`);
        console.error(`   Normalized origin: ${normalizedOrigin}`);
        console.error(`   Allowed origins: ${normalizedAllowed.join(", ")}`);
        console.error(`   NODE_ENV: ${process.env.NODE_ENV}`);
        console.error(`   FRONTEND_URL: ${process.env.FRONTEND_URL}`);
        console.error(`   CORS_ORIGIN: ${process.env.CORS_ORIGIN}`);
        // Return the origin that was requested for debugging
        callback(
          new Error(
            `CORS: Origin ${origin} not allowed. Allowed: ${normalizedAllowed.join(
              ", "
            )}`
          )
        );
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Rate limiting
const rateLimitWindowMs =
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 minutes
const rateLimitMax =
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) ||
  (process.env.NODE_ENV === "production" ? 100 : 1000);

const limiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    if (process.env.NODE_ENV === "development") {
      res.setHeader("X-RateLimit-Status", "exceeded");
      console.warn(
        `[RateLimit] Threshold exceeded for ${req.ip}. Allowing request to proceed in development mode.`
      );
      next();
    } else {
      res.status(429).json({
        ok: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Please try again later.",
        },
      });
    }
  },
});

app.use(limiter);

// Logging
const logFormat =
  process.env.LOG_FORMAT ||
  (process.env.NODE_ENV === "production" ? "combined" : "dev");
app.use(morgan(logFormat));

// Body parsing
const uploadMaxSize = process.env.UPLOAD_MAX_SIZE || "10mb";
app.use(express.json({ limit: uploadMaxSize }));
app.use(express.urlencoded({ extended: true, limit: uploadMaxSize }));

// Session configuration
const isProduction = process.env.NODE_ENV === "production";
const sessionSecret =
  process.env.SESSION_SECRET ||
  (isProduction ? null : "your-secret-key-change-in-production");

if (!sessionSecret && isProduction) {
  console.error("❌ ERROR: SESSION_SECRET must be set in production!");
  process.exit(1);
}

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to false for local development, even in production mode
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "lax", // Use lax for local development - allows cookies on redirects
      domain: undefined, // Let browser set domain automatically
    },
  })
);

// Initialize Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Serve static files from uploads directory (only in development with local storage)
const useLocalStorage =
  !process.env.CLOUD_PROVIDER || process.env.CLOUD_PROVIDER === "local";
if (process.env.NODE_ENV === "development" && useLocalStorage) {
  app.use("/uploads", express.static("uploads"));
} else if (process.env.NODE_ENV === "production" && useLocalStorage) {
  // In production with local storage, still serve files but log warning
  console.warn(
    "⚠️ WARNING: Using local file storage in production. Consider using cloud storage."
  );
  app.use("/uploads", express.static("uploads"));
}

// Health check endpoint
app.get("/health", async (req, res) => {
  const checks = {
    database: false,
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || "1.0.0",
    environment: process.env.NODE_ENV || "development",
  };

  // Check database connectivity
  try {
    await database.query("SELECT 1");
    checks.database = true;
  } catch (error) {
    checks.database = false;
    checks.databaseError = error.message;
  }

  const isHealthy = checks.database;
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    ok: isHealthy,
    data: {
      status: isHealthy ? "healthy" : "unhealthy",
      checks,
    },
  });
});

// Readiness probe (for Kubernetes/container orchestration)
app.get("/health/ready", async (req, res) => {
  try {
    // Check critical dependencies
    await database.query("SELECT 1");

    // If cloud storage is configured, could check connectivity here
    // For now, just check database

    res.status(200).json({
      ok: true,
      data: {
        status: "ready",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      data: {
        status: "not ready",
        error: error.message,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// Liveness probe (simple check that app is running)
app.get("/health/live", (req, res) => {
  res.status(200).json({
    ok: true,
    data: {
      status: "alive",
      timestamp: new Date().toISOString(),
    },
  });
});

// API routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/education", educationRoutes);
app.use("/api/v1/skills", skillRoutes);
app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/job-opportunities", jobOpportunityRoutes);
app.use("/api/v1/certifications", certificationRoutes);
app.use("/api/v1/files", fileUploadRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/resumes", resumeRoutes);
app.use("/api/v1/prospective-jobs", prospectiveJobRoutes);
app.use("/api/v1/coverletter", coverLetterRoutes);
app.use("/api/v1/company-research", companyResearchRoutes);
app.use("/api/v1/interviews", interviewRoutes);
app.use("/api/v1/interview-prep", interviewPrepRoutes);
app.use("/api/v1/calendar", googleCalendarRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/goals", goalRoutes);
app.use("/api/v1/market-intelligence", marketIntelligenceRoutes);
app.use("/api/v1/time-logs", timeLogRoutes);
app.use("/api/v1/competitive-analysis", competitiveAnalysisRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/teams", teamRoutes);
app.use("/api/v1/collaboration", collaborationRoutes);
app.use("/api/v1/family", familyRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1", followUpRoutes); // For /api/v1/follow-ups/pending
app.use("/api/v1/salary-negotiations", salaryNegotiationRoutes);
app.use("/api/v1/writing-practice", writingPracticeRoutes);
app.use("/api/v1/interview-predictions", interviewPredictionRoutes);
app.use("/api/v1/network/google-contacts", googleContactsRoutes);
app.use("/api/v1/network/explore", networkDiscoveryRoutes);
app.use("/api/v1/network/contacts", professionalContactRoutes);
app.use("/api/v1/network/events", networkingEventRoutes);
app.use("/api/v1/network/referrals", referralRequestRoutes);
app.use("/api/v1/network/goals", networkingGoalRoutes);
app.use("/api/v1/networking", networkingRoutes);
app.use("/api/v1/linkedin", linkedinRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

export default app;
