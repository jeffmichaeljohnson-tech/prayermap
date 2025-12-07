# Supabase Migration

Create a Supabase database migration.

## Migration Format
```sql
-- Migration: YYYYMMDDHHMMSS_description.sql

-- Enable required extensions
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create table
CREATE TABLE IF NOT EXISTS table_name (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
  -- Add columns
);

-- Enable RLS (REQUIRED for all tables)
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "policy_name"
  ON table_name FOR SELECT
  USING (true);  -- Adjust condition

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_table_column ON table_name(column_name);

-- Create updated_at trigger
CREATE TRIGGER update_table_name_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Requirements
- ALWAYS enable RLS on new tables
- ALWAYS create appropriate policies
- Include indexes for query performance
- Add comments for complex logic
- Use snake_case for table/column names
- Include created_at and updated_at timestamps

## After Migration
1. Run `supabase db push` to apply
2. Run `supabase gen types typescript` to update types
3. Update any affected queries in the app
