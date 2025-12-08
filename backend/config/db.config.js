import dotenv from "dotenv";
dotenv.config();

/**
 * Database configuration that supports both DATABASE_URL (for Supabase/cloud)
 * and individual connection parameters (for local development)
 */
function getDbConfig() {
  // If DATABASE_URL is provided (Supabase/cloud), parse it
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      const port = parseInt(url.port) || 5432;

      // Check if using Supabase connection pooler (port 6543 or pgbouncer=true param)
      const isPooler =
        port === 6543 || url.searchParams.get("pgbouncer") === "true";

      // Warn if using direct connection (port 5432) on Railway/cloud platforms
      if (
        port === 5432 &&
        (process.env.RAILWAY_ENVIRONMENT ||
          process.env.NODE_ENV === "production")
      ) {
        console.error("⚠️ WARNING: Direct connection (port 5432) detected!");
        console.error("   Railway and other cloud platforms are IPv4-only.");
        console.error(
          "   You MUST use Supabase Connection Pooler (port 6543)."
        );
        console.error("");
        console.error(
          "   Fix: Get the 'Session mode' connection string from Supabase Dashboard:"
        );
        console.error(
          "   - Go to: Project Settings → Database → Connection string"
        );
        console.error("   - Select: 'Session mode' (port 6543)");
        console.error(
          "   - Update DATABASE_URL in Railway with the pooler connection string"
        );
        console.error("");
      }

      // Supabase requires SSL connections
      // Use rejectUnauthorized: false for Supabase's self-signed certificates
      const config = {
        user: url.username,
        password: url.password,
        host: url.hostname,
        port: port,
        database: url.pathname.slice(1), // Remove leading '/'
        ssl: { rejectUnauthorized: false }, // Required for Supabase
      };

      // Connection pooler settings (required for IPv4-only platforms like Railway)
      if (isPooler) {
        // Session pooler requires these settings
        config.allowExitOnIdle = true;
        // Note: Pooler mode doesn't support prepared statements, so we'll handle that in queries
        console.log("✅ Using Supabase Connection Pooler (IPv4 compatible)");
      } else if (port === 5432) {
        console.log(
          "ℹ️  Using direct connection (port 5432) - ensure IPv6 is available"
        );
      }

      return config;
    } catch (error) {
      console.error("❌ Error parsing DATABASE_URL:", error.message);
      console.log("Falling back to individual database variables...");
    }
  }

  // Fall back to individual variables (local development)
  return {
    user: process.env.DB_USER || "ats_user",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "ats_tracker",
    password: process.env.DB_PASS || "ats_password",
    port: parseInt(process.env.DB_PORT) || 5432,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  };
}

export default getDbConfig();
