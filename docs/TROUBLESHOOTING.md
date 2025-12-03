# TROUBLESHOOTING.md - PrayerMap Debugging Guide

> **CORE PRINCIPLE**: When something silently fails, go to the source of truth - not the code. The database schema and logs never lie.

---

## The Debugging Hierarchy (ALWAYS Follow This Order)

Before reading ANY code, complete these steps in order:

### Step 1: Check the Database Schema

```sql
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'YOUR_TABLE_NAME'
ORDER BY ordinal_position;
```

**Why first?** TypeScript interfaces can be outdated. The database is the source of truth.

### Step 2: Check Browser Console/Network Tab

1. Open DevTools (F12 or Cmd+Option+I)
2. Go to **Console** tab - look for red errors
3. Go to **Network** tab - filter by "Fetch/XHR"
4. Find the failed request - click it
5. Check the **Response** tab for error details

**Supabase errors look like:**
```json
{
  "code": "42703",
  "message": "column \"content_url\" of relation \"prayer_responses\" does not exist"
}
```

### Step 3: Check Supabase Logs

1. Go to Supabase Dashboard
2. Navigate to **Logs** → **Postgres**
3. Look for recent errors (red entries)
4. The exact SQL that failed will be shown

### Step 4: Test the Operation in Isolation

```sql
-- Test an INSERT directly
INSERT INTO prayer_responses (prayer_id, responder_id, message, content_type)
VALUES ('test-id', 'test-user', 'test message', 'text');

-- If it fails, Supabase will tell you EXACTLY why
```

### Step 5: THEN Read the Code

Only after steps 1-4 do you have enough context to understand what's wrong.

---

## Common Issues & Solutions

### Issue: "Animation plays but data doesn't persist"

**Symptom:** Frontend animation completes successfully, but the data never appears in the database or on refresh.

**Root Cause:** Schema mismatch between TypeScript interface and actual database columns.

**Solution:**
1. Check actual column names: `SELECT column_name FROM information_schema.columns WHERE table_name = 'xxx'`
2. Compare with TypeScript interface
3. Fix the code to use correct column names

**Real Example (2025-12-03):**
- Code used `content_url` but database column was `media_url`
- Code tried to insert `responder_name` but column didn't exist
- Animation worked (frontend), but INSERT failed (backend)

---

### Issue: "Works locally but fails in production"

**Checklist:**
1. Are environment variables set in Vercel?
2. Is the database migration applied to production?
3. Are RLS policies allowing the operation?

**Check RLS:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'YOUR_TABLE';
```

---

### Issue: "Real-time updates not working"

**Checklist:**
1. Is Supabase realtime enabled for the table? (Dashboard → Database → Replication)
2. Is the subscription set up correctly?
3. Check browser console for WebSocket errors

**Test realtime:**
```typescript
const channel = supabase
  .channel('test')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'prayers' },
    (payload) => console.log('Change:', payload))
  .subscribe();
```

---

### Issue: "RPC function not found"

**Check if function exists:**
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'your_function_name';
```

**Check function signature:**
```sql
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'your_function_name';
```

---

### Issue: "PostGIS location queries returning wrong results"

**Remember:** PostGIS uses `POINT(longitude latitude)` - longitude FIRST!

```sql
-- Correct
ST_MakePoint(-122.4194, 37.7749)  -- San Francisco (lng, lat)

-- Wrong
ST_MakePoint(37.7749, -122.4194)  -- Will put you in the ocean
```

---

## Red Flags That Indicate Schema Mismatch

When you see these symptoms, CHECK THE DATABASE FIRST:

- Animation plays but data doesn't persist
- Frontend works, backend silently fails
- No error in console but operation doesn't complete
- "It worked before" but now it doesn't
- Insert/update seems to succeed but data isn't there

---

## Quick Reference Commands

### Check Table Schema
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'TABLE_NAME'
ORDER BY ordinal_position;
```

### Check RLS Policies
```sql
SELECT * FROM pg_policies WHERE tablename = 'TABLE_NAME';
```

### Check RPC Functions
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
```

### Test Connection Insert
```sql
SELECT * FROM create_prayer_connection(
  'prayer-id',
  'response-id',
  37.7749,
  -122.4194
);
```

### Check Recent Logs (Supabase CLI)
```bash
supabase logs --type postgres
```

---

## The Golden Rules

1. **Trust the symptom, not the code.** If it says "database failing," go to the database.

2. **The database schema is the source of truth.** TypeScript interfaces are documentation that can be wrong.

3. **Silent failures mean backend problems.** If the frontend works but data doesn't persist, the issue is in the database layer.

4. **Check logs before code.** Supabase logs will tell you the exact error in seconds. Reading code might take hours.

5. **Test operations in isolation.** Run the INSERT/UPDATE/SELECT directly to prove it works before blaming application code.

---

**Last Updated:** 2025-12-03
**Version:** 1.0 (Created from memorial lines debugging breakthrough)
