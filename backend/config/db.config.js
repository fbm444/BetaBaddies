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
      return {
        user: url.username,
        password: url.password,
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.slice(1), // Remove leading '/'
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      };
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
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
}

export default getDbConfig();
