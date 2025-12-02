-- Migration: Add created_at and updated_at columns to company_info table
-- This migration adds timestamp columns to track when company research entries are created and updated

-- Add created_at column (defaults to current timestamp for existing rows)
ALTER TABLE company_info
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add updated_at column (defaults to current timestamp for existing rows)
ALTER TABLE company_info
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create a trigger to automatically update updated_at on row updates
CREATE OR REPLACE FUNCTION update_company_info_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS company_info_updated_at_trigger ON company_info;
CREATE TRIGGER company_info_updated_at_trigger
    BEFORE UPDATE ON company_info
    FOR EACH ROW
    EXECUTE FUNCTION update_company_info_timestamp();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON company_info TO ats_user;
GRANT EXECUTE ON FUNCTION update_company_info_timestamp() TO ats_user;

-- Add comment to document the migration
COMMENT ON COLUMN company_info.created_at IS 'Timestamp when the company research entry was created';
COMMENT ON COLUMN company_info.updated_at IS 'Timestamp when the company research entry was last updated';

