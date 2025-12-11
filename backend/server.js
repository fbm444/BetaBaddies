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
import gmailRoutes from "./routes/gmailRoutes.js";
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
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    res.setHeader("X-RateLimit-Status", "exceeded");
    console.warn(
      `[RateLimit] Threshold exceeded for ${req.ip}. Allowing request to proceed in development mode.`
    );
    next();
  },
});

app.use(limiter);

// Logging
app.use(morgan("combined"));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Session configuration
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || "your-secret-key-change-in-production",
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

// Serve static files from uploads directory
app.use("/uploads", express.static("uploads"));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
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
app.use("/api/v1/gmail", gmailRoutes);
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
