// Import with `import * as Sentry from "@sentry/node"` since we are using ESM
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

// Only initialize Sentry if DSN is provided
const sentryDsn =
  process.env.SENTRY_DSN ||
  "https://24b0eb05209985e57974ae4d3a07765d@o4510533802590208.ingest.us.sentry.io/4510533803769856";

if (sentryDsn) {
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
}

// Profiling happens automatically after setting it up with `Sentry.init()`.
// All spans (unless those discarded by sampling) will have profiling data attached to them.
