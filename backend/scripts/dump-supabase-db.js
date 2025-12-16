#!/usr/bin/env node

/**
 * Supabase Database Dump Script (Node.js version)
 *
 * This script creates a local dump of your Supabase database using pg_dump
 *
 * Usage:
 *   node dump-supabase-db.js [output-file]
 *
 * Example:
 *   node dump-supabase-db.js db/dump_20241214.sql
 *
 * Environment Variables:
 *   DATABASE_URL - Full PostgreSQL connection string
 *   OR individual variables:
 *     DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { resolve } from "path";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
// Try multiple locations: backend/.env, scripts/../.env, or current directory
const envPaths = [
  resolve(__dirname, "../.env"), // backend/.env (when run from backend/)
  resolve(__dirname, "../../.env"), // backend/.env (when run from scripts/)
  resolve(process.cwd(), ".env"), // Current working directory
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`📄 Loaded environment variables from ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.log(
    "⚠️  No .env file found. Using environment variables from shell."
  );
}

// Get output file from command line argument or use default
// Script is in backend/scripts/, so go up to root: ../../db/supabase_production_backups/
const rootDir = resolve(__dirname, "../..");
const DEFAULT_OUTPUT_DIR = resolve(rootDir, "db/supabase_production_backups");
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
const DEFAULT_OUTPUT_FILE = resolve(
  DEFAULT_OUTPUT_DIR,
  `supabase_dump_${TIMESTAMP}.sql`
);

let outputFile;
if (process.argv[2]) {
  // If argument provided, resolve relative to root if relative path
  if (process.argv[2].startsWith("/")) {
    outputFile = process.argv[2]; // Absolute path
  } else {
    outputFile = resolve(rootDir, process.argv[2]); // Relative path
  }
} else {
  outputFile = DEFAULT_OUTPUT_FILE;
}

// Ensure output directory exists
const outputDir = dirname(outputFile);
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
  console.log(`📁 Created output directory: ${outputDir}`);
}

console.log(
  "\n============================================================================="
);
console.log("Supabase Database Dump");
console.log(
  "=============================================================================\n"
);

// Check for DATABASE_URL or individual variables
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  // Try to construct from individual variables
  const dbHost = process.env.DB_HOST;
  const dbPort = process.env.DB_PORT || "5432";
  const dbName = process.env.DB_NAME || "postgres";
  const dbUser = process.env.DB_USER || "postgres";
  const dbPass = process.env.DB_PASS;

  if (!dbHost || !dbPass) {
    console.error("❌ Error: DATABASE_URL or DB_HOST/DB_PASS must be set");
    console.error("\nPlease set DATABASE_URL in your .env file:");
    console.error(
      "  DATABASE_URL=postgresql://user:password@host:6543/database?pgbouncer=true"
    );
    console.error("\nOr use individual variables:");
    console.error("  DB_HOST=your-supabase-host.supabase.co");
    console.error("  DB_PORT=6543");
    console.error("  DB_NAME=postgres");
    console.error("  DB_USER=postgres");
    console.error("  DB_PASS=your-password");
    process.exit(1);
  }

  databaseUrl = `postgresql://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}`;
}

// Check if using connection pooler
if (databaseUrl.includes(":6543") || databaseUrl.includes("pgbouncer=true")) {
  console.log("⚠️  Using connection pooler (port 6543)");
  console.log(
    "   Note: Some pg_dump features may be limited with connection pooler"
  );
  console.log(
    "   For full dumps, consider using direct connection (port 5432)\n"
  );
}

console.log(`📊 Output file: ${outputFile}\n`);

// Check if pg_dump is available
try {
  const version = execSync("pg_dump --version", { encoding: "utf-8" }).trim();
  console.log(`✅ pg_dump found: ${version}\n`);
} catch (error) {
  console.error("❌ Error: pg_dump is not installed");
  console.error("\nInstall PostgreSQL client tools:");
  console.error("  macOS: brew install postgresql");
  console.error("  Ubuntu/Debian: sudo apt-get install postgresql-client");
  console.error(
    "  Windows: Download from https://www.postgresql.org/download/"
  );
  process.exit(1);
}

// Create dump
console.log("🔄 Creating database dump...\n");

try {
  // Use pg_dump with appropriate options
  // -Fp = plain text format (readable, can be edited)
  // --no-owner = don't output commands to set ownership
  // --no-acl = don't output access privilege commands
  // --clean = include commands to drop objects before creating
  // --if-exists = use IF EXISTS when dropping objects

  execSync(
    `pg_dump "${databaseUrl}" --no-owner --no-acl --clean --if-exists --format=plain --file="${outputFile}"`,
    { stdio: "inherit" }
  );

  // Get file size
  const { statSync } = await import("fs");
  const stats = statSync(outputFile);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log("\n✅ Database dump created successfully!\n");
  console.log("📊 Dump Details:");
  console.log(`  File: ${outputFile}`);
  console.log(`  Size: ${fileSizeMB} MB\n`);
  console.log("💡 Next Steps:");
  console.log(`  1. Review the dump file: head -50 ${outputFile}`);
  console.log("  2. Restore to local database:");
  console.log(
    `     psql -h localhost -U postgres -d ats_tracker -f ${outputFile}`
  );
  console.log("  3. Or restore to another Supabase project:");
  console.log(`     psql "$DATABASE_URL" -f ${outputFile}\n`);
} catch (error) {
  console.error("\n❌ Error: Failed to create database dump");
  console.error("\nCommon issues:");
  console.error("  1. Check DATABASE_URL is correct");
  console.error("  2. Verify network connectivity to Supabase");
  console.error("  3. Check database credentials");
  console.error("  4. Ensure pg_dump version is compatible");
  console.error(`\nError details: ${error.message}\n`);
  process.exit(1);
}
