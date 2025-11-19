# Supabase Setup - Exact Commands (Day 1)

## Prerequisites
- Node.js and npm installed
- Supabase project already configured ✅

---

## Step 1: Verify Supabase Project ✅

**Status**: Already configured
- Project URL: `https://oomrmfhvsxtxgqqthisz.supabase.co`
- Project is active and accessible

**Verify in browser:**
```bash
# Open Supabase Dashboard
open https://supabase.com/dashboard/project/oomrmfhvsxtxgqqthisz
```

---

## Step 2: Create Environment File

**Create `.env.local` file:**

```bash
cat > .env.local << 'EOF'
VITE_SUPABASE_URL=https://oomrmfhvsxtxgqqthisz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbXJtZmh2c3h0eGdxcXRoaXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0ODcyNDIsImV4cCI6MjA3OTA2MzI0Mn0.5MxjbSa0yaBbMcEuxxlTXu8dM3fenl0ZzDXheSMd7C8
EOF
```

**Verify file was created:**
```bash
cat .env.local
```

---

## Step 3: Apply Database Schema ✅

**Schema file is ready**: `docs/prayermap_schema_v2.sql`

**Apply schema via Supabase Dashboard (Recommended):**

1. **Open SQL Editor:**
   ```bash
   open https://supabase.com/dashboard/project/oomrmfhvsxtxgqqthisz/sql/new
   ```

2. **Copy and paste the schema:**
   ```bash
   # View the schema file
   cat docs/prayermap_schema_v2.sql
   
   # Or open in your editor
   code docs/prayermap_schema_v2.sql
   ```

3. **In Supabase Dashboard:**
   - Copy entire contents of `docs/prayermap_schema_v2.sql`
   - Paste into SQL Editor
   - Click "Run" button (or Cmd/Ctrl + Enter)
   - Wait for completion (should take 10-30 seconds)

4. **Verify schema was applied:**
   ```bash
   # Run verification queries
   open https://supabase.com/dashboard/project/oomrmfhvsxtxgqqthisz/sql/new
   ```
   
   Then paste and run `verify-schema.sql` (provided in project root)

**Expected Results:**
- ✅ PostGIS extension enabled
- ✅ 6 tables created: users, prayers, prayer_responses, prayer_support, notifications, prayer_flags
- ✅ All tables have RLS enabled
- ✅ Critical index `prayers_location_gist_idx` created (for geospatial queries)
- ✅ Function `get_prayers_within_radius` created
- ✅ Custom types: media_type, prayer_status, notification_type

---

## Step 4: Verify RLS Policies ✅

**The schema automatically enables RLS on all tables and creates policies.**

**Verify RLS is active:**

Run this in Supabase SQL Editor:
```sql
-- Check RLS status on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 
    'prayers', 
    'prayer_responses', 
    'prayer_support', 
    'notifications', 
    'prayer_flags'
  )
ORDER BY tablename;
```

**Expected**: All 6 tables should show `rls_enabled = true`

**Check RLS policies (should have multiple per table):**
```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Expected Policies:**
- **users**: 3 policies (SELECT public profiles, SELECT own, UPDATE own)
- **prayers**: 4 policies (SELECT active, INSERT own, UPDATE own, DELETE own)
- **prayer_responses**: 3 policies (SELECT active prayers' responses, INSERT own, DELETE own)
- **prayer_support**: 3 policies (SELECT all, INSERT own, DELETE own)
- **notifications**: 2 policies (SELECT own, UPDATE own)
- **prayer_flags**: 2 policies (INSERT own, SELECT own)

**Quick verification script:**
```bash
# Use the provided verification file
open https://supabase.com/dashboard/project/oomrmfhvsxtxgqqthisz/sql/new
# Then paste contents of verify-schema.sql
```

---

## Step 5: Get API Credentials ✅

**Credentials are already available:**

**Project URL:**
```
https://oomrmfhvsxtxgqqthisz.supabase.co
```

**Anon Key (already in .env.local):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbXJtZmh2c3h0eGdxcXRoaXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0ODcyNDIsImV4cCI6MjA3OTA2MzI0Mn0.5MxjbSa0yaBbMcEuxxlTXu8dM3fenl0ZzDXheSMd7C8
```

**Get Service Role Key (for admin operations - keep secret!):**
```bash
# Open API settings
open https://supabase.com/dashboard/project/oomrmfhvsxtxgqqthisz/settings/api
```

Copy the `service_role` key and add to `.env.local` (optional):
```bash
echo "VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here" >> .env.local
```

---

## Step 6: Test Authentication

**⚠️ Important: Email Confirmation**

For testing purposes, you may want to disable email confirmation:

1. **Disable email confirmation (for testing only):**
   ```bash
   open https://supabase.com/dashboard/project/oomrmfhvsxtxgqqthisz/auth/providers
   ```
   
   - Scroll to "Email" provider
   - Toggle OFF "Confirm email" (or set "Enable email confirmations" to false)
   - Click "Save"

**Note**: Re-enable email confirmation for production!

### Option A: Test via Supabase Dashboard

1. **Create test user:**
   ```bash
   open https://supabase.com/dashboard/project/oomrmfhvsxtxgqqthisz/auth/users
   ```
   
   - Click "Add User" → "Create new user"
   - Email: `test@example.com`
   - Password: `TestPassword123!`
   - Click "Create User"

### Option B: Test via cURL

**Sign up a test user:**
```bash
curl -X POST 'https://oomrmfhvsxtxgqqthisz.supabase.co/auth/v1/signup' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbXJtZmh2c3h0eGdxcXRoaXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0ODcyNDIsImV4cCI6MjA3OTA2MzI0Mn0.5MxjbSa0yaBbMcEuxxlTXu8dM3fenl0ZzDXheSMd7C8" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

**Sign in:**
```bash
curl -X POST 'https://oomrmfhvsxtxgqqthisz.supabase.co/auth/v1/token?grant_type=password' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbXJtZmh2c3h0eGdxcXRoaXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0ODcyNDIsImV4cCI6MjA3OTA2MzI0Mn0.5MxjbSa0yaBbMcEuxxlTXu8dM3fenl0ZzDXheSMd7C8" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

### Option C: Test via TypeScript Script

**Install test dependency:**
```bash
npm install -D tsx
```

**Run test script:**
```bash
npx tsx test-auth.ts
```

**Expected output:**
```
🔐 Testing Supabase Authentication

Project URL: https://oomrmfhvsxtxgqqthisz.supabase.co
---

1️⃣ Testing Sign Up...
   Email: test-1234567890@example.com
   ✅ Sign Up Successful!
   User ID: abc123...
   Email: test-1234567890@example.com

2️⃣ Testing Sign In...
   ✅ Sign In Successful!
   User ID: abc123...
   Session Token: eyJhbGciOiJIUzI1NiIs...

3️⃣ Testing Get Current User...
   ✅ Current User Retrieved!
   User ID: abc123...
   Email: test-1234567890@example.com

4️⃣ Testing Sign Out...
   ✅ Sign Out Successful!

🎉 All authentication tests passed!
```

---

## Verification Checklist

- [ ] ✅ Supabase project is active
- [ ] ✅ `.env.local` file created with credentials
- [ ] ⏳ Database schema applied (need `docs/prayermap_schema_v2.sql`)
- [ ] ⏳ RLS policies verified (need schema first)
- [ ] ✅ API credentials obtained
- [ ] ⏳ Authentication tested (can test now)

---

## Next Steps After Schema is Applied

1. **Verify all tables exist:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```

2. **Check RLS policies:**
   ```sql
   SELECT tablename, policyname, cmd 
   FROM pg_policies 
   WHERE schemaname = 'public';
   ```

3. **Test database queries:**
   ```typescript
   const { data, error } = await supabase
     .from('your_table_name')
     .select('*')
   ```

---

## Troubleshooting

**If authentication fails:**
- Check that email confirmation is disabled in Auth settings (for testing)
- Verify credentials in `.env.local`
- Check Supabase project status

**If schema fails to apply:**
- Check SQL syntax errors in Supabase SQL Editor
- Verify you have the correct schema version
- Check migration history

**If RLS policies are missing:**
- Review `docs/IMPLEMENTATION_GUIDE_v2.md` for required policies
- Apply policies manually via SQL Editor

