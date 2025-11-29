# Supabase Setup Guide - Day 1

## Current Status
✅ **Supabase Project**: Already configured
- Project URL: `https://oomrmfhvsxtxgqqthisz.supabase.co`
- Anon Key: Available (see below)

## Step-by-Step Setup

### Step 1: Verify Supabase Project ✅

Your Supabase project is already configured:
- **Project URL**: `https://oomrmfhvsxtxgqqthisz.supabase.co`
- **Status**: Active

**To verify in Supabase Dashboard:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to Settings → General to see project details

---

### Step 2: Apply Database Schema

**Note**: You mentioned `docs/prayermap_schema_v2.sql` but it's not in the workspace. 

**Option A: If you have the schema file elsewhere:**
1. Copy the schema file to this project:
   ```bash
   # Create docs directory if it doesn't exist
   mkdir -p docs
   
   # Copy your schema file here (adjust path as needed)
   cp /path/to/prayermap_schema_v2.sql docs/
   ```

2. Apply the schema using Supabase MCP:
   ```bash
   # The schema will be applied via the Supabase MCP tools
   ```

**Option B: If you need to create the schema:**
We'll need to create it based on your requirements. Please provide the schema details or the SQL file.

**To apply schema via Supabase Dashboard:**
1. Go to https://supabase.com/dashboard/project/oomrmfhvsxtxgqqthisz/sql/new
2. Paste your SQL schema
3. Click "Run"

---

### Step 3: Verify RLS Policies

After applying the schema, verify Row Level Security (RLS) is enabled:

**Command to check RLS status:**
```sql
-- Run this in Supabase SQL Editor
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected output**: All tables should show `rowsecurity = true`

**To enable RLS on a table (if needed):**
```sql
ALTER TABLE your_table_name ENABLE ROW LEVEL SECURITY;
```

---

### Step 4: Get API Credentials ✅

Your API credentials are already available:

**Project URL:**
```
https://oomrmfhvsxtxgqqthisz.supabase.co
```

**Anon/Public Key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbXJtZmh2c3h0eGdxcXRoaXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0ODcyNDIsImV4cCI6MjA3OTA2MzI0Mn0.5MxjbSa0yaBbMcEuxxlTXu8dM3fenl0ZzDXheSMd7C8
```

**To get Service Role Key (for admin operations):**
1. Go to https://supabase.com/dashboard/project/oomrmfhvsxtxgqqthisz/settings/api
2. Copy the "service_role" key (keep this secret!)

**Create environment file:**
```bash
# Create .env.local file
cat > .env.local << 'EOF'
VITE_SUPABASE_URL=https://oomrmfhvsxtxgqqthisz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbXJtZmh2c3h0eGdxcXRoaXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0ODcyNDIsImV4cCI6MjA3OTA2MzI0Mn0.5MxjbSa0yaBbMcEuxxlTXu8dM3fenl0ZzDXheSMd7C8
EOF
```

---

### Step 5: Test Authentication

**Create a test user via Supabase Dashboard:**
1. Go to https://supabase.com/dashboard/project/oomrmfhvsxtxgqqthisz/auth/users
2. Click "Add User" → "Create new user"
3. Enter email and password
4. Click "Create User"

**Or test via SQL (if auth.users table exists):**
```sql
-- This is typically handled by Supabase Auth, not direct SQL
-- Use the Dashboard or Auth API instead
```

**Test authentication with curl:**
```bash
# Sign up a test user
curl -X POST 'https://oomrmfhvsxtxgqqthisz.supabase.co/auth/v1/signup' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbXJtZmh2c3h0eGdxcXRoaXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0ODcyNDIsImV4cCI6MjA3OTA2MzI0Mn0.5MxjbSa0yaBbMcEuxxlTXu8dM3fenl0ZzDXheSMd7C8" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'

# Sign in
curl -X POST 'https://oomrmfhvsxtxgqqthisz.supabase.co/auth/v1/token?grant_type=password' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbXJtZmh2c3h0eGdxcXRoaXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0ODcyNDIsImV4cCI6MjA3OTA2MzI0Mn0.5MxjbSa0yaBbMcEuxxlTXu8dM3fenl0ZzDXheSMd7C8" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

**Test with JavaScript/TypeScript:**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://oomrmfhvsxtxgqqthisz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbXJtZmh2c3h0eGdxcXRoaXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0ODcyNDIsImV4cCI6MjA3OTA2MzI0Mn0.5MxjbSa0yaBbMcEuxxlTXu8dM3fenl0ZzDXheSMd7C8'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Sign up
const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'testpassword123',
})

// Sign in
const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'testpassword123',
})

console.log('User:', signInData.user)
console.log('Session:', signInData.session)
```

---

## Next Steps

1. **Apply your schema** - Once you have `docs/prayermap_schema_v2.sql`, we can apply it
2. **Verify RLS policies** - Check that all tables have RLS enabled
3. **Set up environment variables** - Create `.env.local` file
4. **Test authentication** - Create and test a user account

---

## Useful Commands

**Check current tables:**
```bash
# Via Supabase MCP (if available)
# Or via SQL Editor in Dashboard
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

**Check RLS policies:**
```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public';
```

**List all migrations:**
```bash
# Check migrations in Supabase Dashboard
# Or via Supabase CLI: supabase migration list
```

