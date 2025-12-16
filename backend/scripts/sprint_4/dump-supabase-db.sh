#!/bin/bash

# =============================================================================
# Supabase Database Dump Script
# =============================================================================
# This script creates a local dump of your Supabase database
# Usage: ./dump-supabase-db.sh [output-file]
# Example: ./dump-supabase-db.sh db/dump_$(date +%Y%m%d_%H%M%S).sql
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
# Try to find .env file in backend directory (relative to script location)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$( cd "$SCRIPT_DIR/../.." && pwd )"
ENV_FILE="$BACKEND_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  echo -e "${BLUE}📄 Loading environment variables from $ENV_FILE${NC}"
  set -a  # Automatically export all variables
  source "$ENV_FILE"
  set +a
elif [ -f .env ]; then
  echo -e "${BLUE}📄 Loading environment variables from .env${NC}"
  set -a
  source .env
  set +a
else
  echo -e "${YELLOW}⚠️  No .env file found. Using environment variables from shell.${NC}"
fi

# Determine output file
# Script is in backend/scripts/sprint_4/, so go up to root: ../../../db/supabase_production_backups/
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$SCRIPT_DIR/../../.." && pwd )"
DEFAULT_OUTPUT_DIR="$ROOT_DIR/db/supabase_production_backups"
DEFAULT_OUTPUT_FILE="${DEFAULT_OUTPUT_DIR}/supabase_dump_$(date +%Y%m%d_%H%M%S).sql"

# If argument provided, use it (resolve relative to root if relative path)
if [ -n "$1" ]; then
  if [[ "$1" = /* ]]; then
    # Absolute path
    OUTPUT_FILE="$1"
  else
    # Relative path - resolve from root directory
    OUTPUT_FILE="$ROOT_DIR/$1"
  fi
else
  OUTPUT_FILE="$DEFAULT_OUTPUT_FILE"
fi

# Ensure output directory exists
OUTPUT_DIR=$(dirname "$OUTPUT_FILE")
if [ ! -d "$OUTPUT_DIR" ]; then
  echo -e "${BLUE}📁 Creating output directory: $OUTPUT_DIR${NC}"
  mkdir -p "$OUTPUT_DIR"
fi

echo -e "${BLUE}=============================================================================${NC}"
echo -e "${BLUE}Supabase Database Dump${NC}"
echo -e "${BLUE}=============================================================================${NC}"
echo ""

# Check for Supabase-specific variables first, then fall back to generic ones
# Priority: SUPABASE_DATABASE_URL > SUPABASE_DB_* > DATABASE_URL > DB_*

if [ -n "$SUPABASE_DATABASE_URL" ]; then
  DATABASE_URL="$SUPABASE_DATABASE_URL"
  echo -e "${GREEN}✅ Using SUPABASE_DATABASE_URL${NC}"
elif [ -z "$DATABASE_URL" ]; then
  # Try to construct from Supabase-specific variables first
  SUPABASE_HOST="${SUPABASE_DB_HOST:-$DB_HOST}"
  SUPABASE_PORT="${SUPABASE_DB_PORT:-${DB_PORT:-6543}}"
  SUPABASE_NAME="${SUPABASE_DB_NAME:-${DB_NAME:-postgres}}"
  SUPABASE_USER="${SUPABASE_DB_USER:-$DB_USER}"
  SUPABASE_PASS="${SUPABASE_DB_PASS:-$DB_PASS}"
  
  if [ -n "$SUPABASE_HOST" ] && [ -n "$SUPABASE_USER" ] && [ -n "$SUPABASE_NAME" ]; then
    if [ -z "$SUPABASE_PASS" ]; then
      echo -e "${YELLOW}⚠️  Supabase database password is not set${NC}"
      echo ""
      echo "Please provide your Supabase database password:"
      echo ""
      echo "Option 1: Set SUPABASE_DATABASE_URL in .env:"
      echo "  SUPABASE_DATABASE_URL=postgresql://user:password@host:6543/database?pgbouncer=true"
      echo ""
      echo "Option 2: Set SUPABASE_DB_PASS in .env:"
      echo "  SUPABASE_DB_PASS=your-password"
      echo ""
      echo "Option 3: Get full connection string from Supabase Dashboard:"
      echo "  Settings → Database → Connection string → Session mode"
      echo ""
      echo "Required Supabase variables:"
      echo "  SUPABASE_DB_HOST=aws-0-us-west-2.pooler.supabase.com"
      echo "  SUPABASE_DB_PORT=6543"
      echo "  SUPABASE_DB_NAME=postgres"
      echo "  SUPABASE_DB_USER=postgres.jnjxvsncxfwencryoklc"
      echo "  SUPABASE_DB_PASS=[YOUR-PASSWORD]"
      echo ""
      exit 1
    fi
    
    # Construct DATABASE_URL from individual variables
    # URL encode password if it contains special characters
    ENCODED_PASS=$(printf '%s' "$SUPABASE_PASS" | jq -sRr @uri 2>/dev/null || printf '%s' "$SUPABASE_PASS" | sed 's/:/%3A/g; s/@/%40/g; s/#/%23/g; s/\?/%3F/g; s/&/%26/g; s/=/%3D/g')
    DATABASE_URL="postgresql://${SUPABASE_USER}:${ENCODED_PASS}@${SUPABASE_HOST}:${SUPABASE_PORT}/${SUPABASE_NAME}?pgbouncer=true"
    
    echo -e "${GREEN}✅ Constructed DATABASE_URL from Supabase variables${NC}"
  else
    echo -e "${RED}❌ Error: Supabase database configuration is missing${NC}"
    echo ""
    echo "Please set one of the following in your .env file:"
    echo ""
    echo "Option 1 (Recommended): Full connection string"
    echo "  SUPABASE_DATABASE_URL=postgresql://user:password@host:6543/database?pgbouncer=true"
    echo ""
    echo "Option 2: Individual Supabase variables"
    echo "  SUPABASE_DB_HOST=aws-0-us-west-2.pooler.supabase.com"
    echo "  SUPABASE_DB_PORT=6543"
    echo "  SUPABASE_DB_NAME=postgres"
    echo "  SUPABASE_DB_USER=postgres.jnjxvsncxfwencryoklc"
    echo "  SUPABASE_DB_PASS=your-password"
    echo ""
    echo "Note: These are separate from local database variables (DB_HOST, DB_PORT, etc.)"
    exit 1
  fi
fi

# Parse DATABASE_URL if provided
if [ -n "$DATABASE_URL" ]; then
  echo -e "${GREEN}✅ Using DATABASE_URL${NC}"
  
  # Extract connection details from DATABASE_URL
  # Format: postgresql://user:password@host:port/database?params
  # Remove query parameters for pg_dump (it doesn't accept them)
  DB_URL=$(echo "$DATABASE_URL" | sed 's/?.*$//')
  
  # Check if using connection pooler (port 6543)
  if [[ "$DATABASE_URL" == *":6543"* ]] || [[ "$DATABASE_URL" == *"pgbouncer=true"* ]]; then
    echo -e "${YELLOW}⚠️  Using connection pooler (port 6543)${NC}"
    echo -e "${YELLOW}   Note: Some pg_dump features may be limited with connection pooler${NC}"
    echo -e "${YELLOW}   For full dumps, consider using direct connection (port 5432)${NC}"
    echo ""
  fi
else
  # Use individual variables
  DB_HOST=${DB_HOST:-"localhost"}
  DB_PORT=${DB_PORT:-5432}
  DB_NAME=${DB_NAME:-"postgres"}
  DB_USER=${DB_USER:-"postgres"}
  DB_PASS=${DB_PASS:-""}
  
  if [ -z "$DB_PASS" ]; then
    echo -e "${RED}❌ Error: DB_PASS is not set${NC}"
    exit 1
  fi
  
  DB_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
fi

echo -e "${BLUE}📊 Output file: ${OUTPUT_FILE}${NC}"
echo ""

# Check if pg_dump is available
# Prefer PostgreSQL 17 if available (for compatibility with Supabase PostgreSQL 17)
PG_DUMP_CMD=""
if [ -f "/opt/homebrew/opt/postgresql@17/bin/pg_dump" ]; then
  PG_DUMP_CMD="/opt/homebrew/opt/postgresql@17/bin/pg_dump"
elif command -v pg_dump &> /dev/null; then
  PG_DUMP_CMD="pg_dump"
else
  echo -e "${RED}❌ Error: pg_dump is not installed${NC}"
  echo ""
  echo "Install PostgreSQL client tools:"
  echo "  macOS: brew install postgresql@17"
  echo "  Ubuntu/Debian: sudo apt-get install postgresql-client-17"
  echo "  Windows: Download from https://www.postgresql.org/download/"
  exit 1
fi

echo -e "${GREEN}✅ pg_dump found: $($PG_DUMP_CMD --version)${NC}"
echo ""

# Create dump
echo -e "${BLUE}🔄 Creating database dump...${NC}"
echo ""

# Use pg_dump with appropriate options
# -Fc = custom format (compressed, allows selective restore)
# -Fp = plain text format (readable, can be edited)
# Using plain format for better compatibility

if $PG_DUMP_CMD "$DB_URL" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --format=plain \
  --file="$OUTPUT_FILE" 2>&1; then
  
  FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
  
  echo ""
  echo -e "${GREEN}✅ Database dump created successfully!${NC}"
  echo ""
  echo -e "${BLUE}📊 Dump Details:${NC}"
  echo "  File: $OUTPUT_FILE"
  echo "  Size: $FILE_SIZE"
  echo ""
  echo -e "${BLUE}💡 Next Steps:${NC}"
  echo "  1. Review the dump file: cat $OUTPUT_FILE | head -50"
  echo "  2. Restore to local database:"
  echo "     psql -h localhost -U postgres -d ats_tracker -f $OUTPUT_FILE"
  echo "  3. Or restore to another Supabase project:"
  echo "     psql \"\$DATABASE_URL\" -f $OUTPUT_FILE"
  echo ""
else
  echo ""
  echo -e "${RED}❌ Error: Failed to create database dump${NC}"
  echo ""
  echo "Common issues:"
  echo "  1. Check DATABASE_URL is correct"
  echo "  2. Verify network connectivity to Supabase"
  echo "  3. Check database credentials"
  echo "  4. Ensure pg_dump version is compatible"
  echo ""
  exit 1
fi

