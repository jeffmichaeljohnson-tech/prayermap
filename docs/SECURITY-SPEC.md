# SECURITY-SPEC.md - RLS Policy Design & Security Standards

> **PURPOSE:** Define the intended security posture for PrayerMap, including RLS policy design, access patterns, and security requirements. Agents MUST implement security according to this specification.

---

## Security Philosophy

1. **Defense in Depth** - Multiple layers of protection, never single point of failure
2. **Least Privilege** - Grant minimum access needed, never more
3. **Explicit Over Implicit** - All access must be explicitly granted
4. **Fail Secure** - When in doubt, deny access

---

## User Roles and Access Levels

### Role Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    ROLE HIERARCHY                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  service_role   ─── Full database access (webhooks, APIs)   │
│       │                                                     │
│       ▼                                                     │
│  admin/moderator ─── Oversight access (read all + moderate) │
│       │                                                     │
│       ▼                                                     │
│  authenticated  ─── User access (own data + public data)    │
│       │                                                     │
│       ▼                                                     │
│  anon          ─── Public access (read-only public data)    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Role Definitions

| Role | Description | Use Case |
|------|-------------|----------|
| `service_role` | Full bypass of RLS | Webhooks, background jobs, admin APIs |
| `authenticated` | Logged-in users | Normal app operations |
| `anon` | Not logged in | Public map viewing, before sign-up |

### Admin Roles (Custom)

Stored in `admin_roles` table:

| Role | Permissions |
|------|-------------|
| `admin` | Full admin access, can manage other admins |
| `moderator` | Can view flags, moderate content, ban users |
| `support` | Can view user issues, limited moderation |

---

## Table Security Matrix

### High-Traffic Tables (Tier 1)

| Table | RLS | anon | authenticated | admin | service_role |
|-------|-----|------|---------------|-------|--------------|
| `prayers` | ✅ | Read public | Read all + CRUD own | Full | Full |
| `profiles` | ✅ | Read public name | Read all + CRUD own | Full | Full |
| `prayer_responses` | ✅ | ❌ | Read related + CRUD own | Full | Full |
| `prayer_connections` | ✅ | Read all | Read all + Create | Full | Full |

### Moderate-Traffic Tables (Tier 2)

| Table | RLS | anon | authenticated | admin | service_role |
|-------|-----|------|---------------|-------|--------------|
| `notifications` | ✅ | ❌ | CRUD own | Read all | Full |
| `prayer_support` | ✅ | ❌ | CRUD own | Read all | Full |
| `prayer_flags` | ✅ | ❌ | Create | Full | Full |

### Admin Tables (Tier 3)

| Table | RLS | anon | authenticated | admin | service_role |
|-------|-----|------|---------------|-------|--------------|
| `admin_roles` | ✅ | ❌ | ❌ | Full | Full |
| `audit_logs` | ✅ | ❌ | ❌ | Read | Full |
| `user_bans` | ✅ | ❌ | ❌ | Full | Full |
| `moderation_results` | ✅ | ❌ | ❌ | Read | Full |

### System Tables (Tier 4)

| Table | RLS | Notes |
|-------|-----|-------|
| `spatial_ref_sys` | ❌ | PostGIS reference data, read-only, no user data |

---

## RLS Policy Specifications

### moderation_results (CRITICAL)

**Purpose:** Stores AI content moderation results from Hive API

**Security Requirements:**
- Service role: Full access (webhooks write results)
- Admin/Moderator: Read-only (oversight and debugging)
- Authenticated: NO access (sensitive AI decisions)
- Anon: NO access

**Required Policies:**

```sql
-- Policy 1: Service role full access (for webhooks)
CREATE POLICY "Service role full access"
ON public.moderation_results
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 2: Admin read access (for oversight)
CREATE POLICY "Admins can view moderation results"
ON public.moderation_results
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.admin_roles
        WHERE admin_roles.user_id = (SELECT auth.uid())
        AND admin_roles.role IN ('admin', 'moderator')
    )
);
```

**Why Both Policies:**
1. Service role needs write access for webhook processing
2. Admins need read access to review AI decisions and debug issues
3. WITHOUT admin policy, no human can review moderation decisions

---

### prayers

**Purpose:** Core prayer request data

**Security Requirements:**
- Anon: Read public prayers only
- Authenticated: Read all public + CRUD own
- Admin: Full access

**Required Policies:**

```sql
-- Public can view public prayers
CREATE POLICY "Anyone can view public prayers"
ON public.prayers
FOR SELECT
USING (
    is_public = true
    OR user_id = (SELECT auth.uid())
);

-- Users can create own prayers
CREATE POLICY "Users can create own prayers"
ON public.prayers
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

-- Users can update own prayers
CREATE POLICY "Users can update own prayers"
ON public.prayers
FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Users can delete own prayers
CREATE POLICY "Users can delete own prayers"
ON public.prayers
FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- Admins can manage all prayers
CREATE POLICY "Admins can manage all prayers"
ON public.prayers
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.admin_roles
        WHERE admin_roles.user_id = (SELECT auth.uid())
        AND admin_roles.role IN ('admin', 'moderator')
    )
);
```

---

### prayer_connections (Living Map)

**Purpose:** Memorial lines connecting prayers - THE CORE SPIRITUAL FEATURE

**Security Requirements:**
- Anon: Read all (see the living map)
- Authenticated: Read all + Create (respond to prayers)
- Admin: Full access
- **CRITICAL:** Connections should NEVER be deleted (eternal memorial)

**Required Policies:**

```sql
-- Anyone can view connections (the living map)
CREATE POLICY "Anyone can view prayer connections"
ON public.prayer_connections
FOR SELECT
USING (true);

-- Authenticated users can create connections
CREATE POLICY "Authenticated can create connections"
ON public.prayer_connections
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- NO DELETE POLICY FOR REGULAR USERS
-- Connections are eternal memorial lines

-- Only admins can manage (for data cleanup if absolutely necessary)
CREATE POLICY "Admins can manage connections"
ON public.prayer_connections
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.admin_roles
        WHERE admin_roles.user_id = (SELECT auth.uid())
        AND admin_roles.role = 'admin'
    )
);
```

---

## RLS Performance Standards

### Optimization Pattern

**Always use:**
```sql
(SELECT auth.uid())  -- Per-query execution
```

**Never use:**
```sql
auth.uid()  -- Per-row execution (10-100x slower)
```

**Why:** PostgreSQL treats `auth.uid()` as volatile, executing it for every row. Wrapping in `(SELECT ...)` executes once per query.

### Performance Verification

After creating/updating policies, verify optimization:

```sql
-- Should return 0 rows (no unoptimized policies)
SELECT policyname, tablename
FROM pg_policies
WHERE schemaname = 'public'
AND ((qual LIKE '%auth.uid()%' AND qual NOT LIKE '%SELECT auth.uid()%')
  OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%SELECT auth.uid()%'));
```

---

## Admin Role Verification Pattern

All admin checks MUST use this pattern:

```sql
EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE admin_roles.user_id = (SELECT auth.uid())
    AND admin_roles.role IN ('admin', 'moderator')  -- Adjust roles as needed
)
```

**Why:**
- Uses EXISTS for efficiency (stops at first match)
- Checks against admin_roles table (source of truth)
- Uses optimized `(SELECT auth.uid())` pattern
- Specifies exact roles needed for operation

---

## Function Security

### Required Function Attributes

All database functions MUST include:

```sql
CREATE OR REPLACE FUNCTION function_name()
RETURNS return_type
LANGUAGE plpgsql
SECURITY DEFINER  -- Or INVOKER, depending on need
SET search_path = public, pg_temp  -- CRITICAL: Prevents privilege escalation
AS $$
BEGIN
    -- function body
END;
$$;
```

**Why `SET search_path`:**
Without this, malicious users could create schemas that shadow public tables, enabling privilege escalation.

### Current Status

48 functions have mutable search_path (security warning). This is tracked for remediation but not blocking.

---

## API Key Security

### Client-Side Safe (VITE_ prefix OK)

| Key | Why Safe |
|-----|----------|
| `VITE_SUPABASE_URL` | Public API endpoint |
| `VITE_SUPABASE_ANON_KEY` | RLS-protected, read-only public data |
| `VITE_MAPBOX_TOKEN` | Domain-restricted |
| `VITE_DATADOG_CLIENT_TOKEN` | Client-specific, can't access account |

### Server-Side Only (NO VITE_ prefix)

| Key | Why Sensitive |
|-----|---------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS completely |
| `HIVE_API_KEY` | Can make API calls on our behalf |
| `OPENAI_API_KEY` | Can incur charges |
| `AWS_SECRET_ACCESS_KEY` | Full S3 access |
| `ANTHROPIC_API_KEY` | Can incur charges |

### Current Issues

- `VITE_HIVE_API_KEY` - WRONG: Should not have VITE_ prefix
- Fix: Rename to `HIVE_API_KEY` and call from server/edge function

---

## Security Verification Queries

### 1. Check RLS Enabled on All Tables

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity, tablename;
```

**Expected:** All tables except `spatial_ref_sys` have `rowsecurity = true`

### 2. List All Policies by Table

```sql
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 3. Find Tables Without Policies

```sql
SELECT t.tablename
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
AND t.rowsecurity = true
AND p.policyname IS NULL;
```

**Expected:** No results (all RLS-enabled tables have policies)

### 4. Find Overly Permissive Policies

```sql
SELECT policyname, tablename, qual
FROM pg_policies
WHERE schemaname = 'public'
AND qual = 'true'
AND roles != '{service_role}';
```

**Review:** Any `USING (true)` policies should be intentional (like public prayer viewing)

### 5. Find Unoptimized Policies

```sql
SELECT policyname, tablename
FROM pg_policies
WHERE schemaname = 'public'
AND ((qual LIKE '%auth.uid()%' AND qual NOT LIKE '%SELECT auth.uid()%')
  OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%SELECT auth.uid()%'));
```

**Expected:** No results after optimization

---

## Security Testing Checklist

### Per-Table Tests

For each table, verify:

```markdown
- [ ] RLS is enabled
- [ ] anon role has expected access (or none)
- [ ] authenticated role has expected access
- [ ] admin role has elevated access
- [ ] service_role has full access
- [ ] No unintended data leakage
```

### Access Tests

```sql
-- Test as anon
SET ROLE anon;
SELECT * FROM table_name LIMIT 5;
-- Verify: Only expected data visible

-- Test as authenticated (impersonate user)
SET ROLE authenticated;
SET request.jwt.claims = '{"sub": "user-uuid-here"}';
SELECT * FROM table_name LIMIT 5;
-- Verify: Own data + public data visible

-- Test as service_role
SET ROLE service_role;
SELECT * FROM table_name LIMIT 5;
-- Verify: All data visible

RESET ROLE;
```

---

## Migration Template for Security Changes

```sql
-- Migration: [YYYYMMDD]_[description].sql
-- Purpose: [What security change this makes]
-- Author: [Agent/Human name]
-- Date: [Date]

-- SAFETY: This migration [does/does not] affect existing data

BEGIN;

-- 1. Enable RLS if not already enabled
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policy if updating
DROP POLICY IF EXISTS "Policy name" ON public.table_name;

-- 3. Create new policy with optimized pattern
CREATE POLICY "Policy name"
ON public.table_name
FOR [SELECT|INSERT|UPDATE|DELETE|ALL]
TO [anon|authenticated|service_role]
USING (
    -- Read condition using (SELECT auth.uid())
)
WITH CHECK (
    -- Write condition using (SELECT auth.uid())
);

-- 4. Verification query
-- Run after migration to confirm:
-- SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'table_name';

COMMIT;
```

---

## Incident Response

### If Data Breach Suspected

1. **Immediately:** Revoke compromised API keys
2. **Investigate:** Check audit_logs for unauthorized access
3. **Contain:** Add restrictive RLS policies if needed
4. **Notify:** Follow data breach notification requirements
5. **Remediate:** Fix root cause, rotate all credentials

### If RLS Bypassed

1. **Verify:** Confirm bypass with query tests
2. **Fix:** Add missing policy immediately
3. **Audit:** Check what data may have been exposed
4. **Review:** Audit all related tables for similar issues

---

## Related Documentation

- **[SESSION-CONTEXT.md](./SESSION-CONTEXT.md)** - Include security context in sessions
- **[ACCEPTANCE-CRITERIA.md](./ACCEPTANCE-CRITERIA.md)** - Security verification requirements
- **[AI-AGENTS.md](./AI-AGENTS.md)** - Agent security responsibilities
- **[ENVIRONMENT-STRATEGY.md](./ENVIRONMENT-STRATEGY.md)** - API key management

---

**Last Updated:** 2025-12-03
**Version:** 1.0
**Security Contact:** [Define who to contact for security issues]
