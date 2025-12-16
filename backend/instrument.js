// Import with `import * as Sentry from "@sentry/node"` since we are using ESM
// Check Node.js version first - Sentry v10+ requires Node.js v18.13.0+
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
const minorVersion = parseInt(nodeVersion.slice(1).split('.')[1]);

const isNodeVersionCompatible = majorVersion > 18 || (majorVersion === 18 && minorVersion >= 13) || majorVersion >= 19;

let Sentry = null;
let nodeProfilingIntegration = null;

// Use async IIFE to handle dynamic imports
// Only attempt to load Sentry if Node.js version is compatible
if (!isNodeVersionCompatible) {
  console.warn("⚠️  Sentry initialization skipped due to Node.js version incompatibility.");
  console.warn(`   Sentry requires Node.js v18.13.0+ (you are on: ${nodeVersion})`);
  console.warn("   The application will continue without Sentry monitoring.");
} else {
  (async () => {
    try {
      // Dynamic import to handle potential import errors
      const sentryModule = await import("@sentry/node");
      const profilingModule = await import("@sentry/profiling-node");
      Sentry = sentryModule.default || sentryModule;
      nodeProfilingIntegration = profilingModule.nodeProfilingIntegration;
      
      // Only initialize Sentry if DSN is provided and Sentry loaded successfully
      const sentryDsn =
        process.env.SENTRY_DSN ||
        "https://24b0eb05209985e57974ae4d3a07765d@o4510533802590208.ingest.us.sentry.io/4510533803769856";

      if (sentryDsn && Sentry && nodeProfilingIntegration) {
        try {
          Sentry.init({
            dsn: sentryDsn,
            integrations: [nodeProfilingIntegration()],

            // Send structured logs to Sentry
            enableLogs: true,
            // Tracing
            tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0, // 10% in production, 100% in development
            // Set sampling rate for profiling - this is evaluated only once per SDK.init call
            profileSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
            // Trace lifecycle automatically enables profiling during active traces
            profileLifecycle: "trace",
            // Setting this option to true will send default PII data to Sentry.
            // For example, automatic IP address collection on events
            sendDefaultPii: true,
            // Environment
            environment: process.env.NODE_ENV || "development",
          });
          console.log("✅ Sentry initialized successfully");
        } catch (error) {
          console.warn("⚠️  Sentry initialization failed:", error.message);
          console.warn("   The application will continue without Sentry monitoring.");
        }
      }
    } catch (error) {
      console.warn("⚠️  Sentry import failed:", error.message);
      console.warn("   The application will continue without Sentry monitoring.");
    }
  })().catch((error) => {
    console.warn("⚠️  Sentry setup error:", error.message);
    console.warn("   The application will continue without Sentry monitoring.");
  });
}

// Profiling happens automatically after setting it up with `Sentry.init()`.
// All spans (unless those discarded by sampling) will have profiling data attached to them.
