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

      // Check if using Supabase connection pooler (port 6543 or pgbouncer=true param)
      const isPooler =
        url.port === "6543" || url.searchParams.get("pgbouncer") === "true";

      // Supabase requires SSL connections
      // Use rejectUnauthorized: false for Supabase's self-signed certificates
      const config = {
        user: url.username,
        password: url.password,
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.slice(1), // Remove leading '/'
        ssl: { rejectUnauthorized: false }, // Required for Supabase
      };

      // Connection pooler settings (required for IPv4-only platforms like Railway)
      if (isPooler) {
        // Session pooler requires these settings
        config.allowExitOnIdle = true;
        // Note: Pooler mode doesn't support prepared statements, so we'll handle that in queries
        console.log("✅ Using Supabase Connection Pooler (IPv4 compatible)");
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
