# ENVIRONMENT-STRATEGY.md - Environment Variable Management

> **PURPOSE:** Define how environment variables are classified, stored, and synchronized across development, preview, and production environments.

---

## Core Principles

1. **Never expose secrets to client** - Server-side keys stay server-side
2. **Environment isolation** - Dev/preview/prod use different credentials
3. **Single source of truth** - Vercel dashboard for deployed envs, .env.local for local
4. **Explicit classification** - Every variable is documented with its security level

---

## Variable Classification

### Client-Side Safe (VITE_ prefix)

These variables are embedded in the JavaScript bundle and visible to anyone inspecting the code. Only use for:
- Public API endpoints
- Public tokens that are domain-restricted or rate-limited
- Feature flags
- Non-sensitive configuration

```bash
# Safe for VITE_ prefix
VITE_SUPABASE_URL           # Public API endpoint
VITE_SUPABASE_ANON_KEY      # RLS-protected, read-only public access
VITE_MAPBOX_TOKEN           # Domain-restricted
VITE_AWS_REGION             # Just a region name
VITE_S3_BUCKET              # Bucket name (access controlled by IAM)
VITE_CLOUDFRONT_URL         # Public CDN URL
VITE_DATADOG_APP_ID         # Public app identifier
VITE_DATADOG_CLIENT_TOKEN   # Client-specific token
VITE_DATADOG_ENABLE_DEV     # Boolean flag
```

### Server-Side Only (NO VITE_ prefix)

These variables should NEVER be exposed to the client. Use only in:
- Edge functions
- API routes
- Build-time scripts
- Server-side rendering

```bash
# NEVER use VITE_ prefix for these
SUPABASE_SERVICE_ROLE_KEY   # Bypasses RLS - CRITICAL
HIVE_API_KEY                # AI moderation API
OPENAI_API_KEY              # Can incur charges
ANTHROPIC_API_KEY           # Can incur charges
AWS_SECRET_ACCESS_KEY       # Full AWS access
GITHUB_TOKEN                # Repo access
SLACK_BOT_TOKEN             # Slack API access
PINECONE_API_KEY            # Vector DB access
LANGSMITH_API_KEY           # LLM tracing
DATADOG_API_KEY             # Full Datadog access
DB_PASSWORD                 # Database credential
```

---

## Environment File Structure

### Local Development

```
/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/
├── .env                    # Base config (can commit, no secrets)
├── .env.local              # Local overrides (NEVER commit)
├── .env.development        # Dev-specific (optional)
├── .env.production         # Prod-specific (optional)
└── .env.example            # Template with placeholders (commit this)
```

### File Hierarchy (Vite loads in this order)

1. `.env` - Always loaded
2. `.env.local` - Always loaded, git-ignored
3. `.env.[mode]` - Loaded for specific mode (development/production)
4. `.env.[mode].local` - Mode-specific, git-ignored

Later files override earlier ones.

---

## .env.example Template

This file should be committed and kept up-to-date:

```bash
# .env.example - Environment Variable Template
# Copy to .env.local and fill in values

# =============================================================================
# TIER 1: SUPABASE (Required)
# =============================================================================
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Server-side only (for edge functions)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# =============================================================================
# TIER 2: MAPBOX (Required for map)
# =============================================================================
VITE_MAPBOX_TOKEN=pk.your-mapbox-token

# =============================================================================
# TIER 3: AWS/MEDIA (Required for image uploads)
# =============================================================================
VITE_AWS_REGION=us-east-1
VITE_S3_BUCKET=your-bucket-name
VITE_CLOUDFRONT_URL=https://your-cdn.cloudfront.net

# Server-side only
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your-secret-key

# =============================================================================
# TIER 4: CONTENT MODERATION (Required for safety)
# =============================================================================
# Server-side only - NOT VITE_ prefix
HIVE_API_KEY=your-hive-api-key
MODERATION_WEBHOOK_URL=https://your-project.supabase.co/functions/v1/moderation-webhook

# =============================================================================
# TIER 5: AI SERVICES (Optional - for AI features)
# =============================================================================
# Server-side only
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...

# =============================================================================
# TIER 6: OBSERVABILITY (Recommended)
# =============================================================================
VITE_DATADOG_APP_ID=your-app-id
VITE_DATADOG_CLIENT_TOKEN=pub...
VITE_DATADOG_ENABLE_DEV=false

# Server-side only
DATADOG_API_KEY=your-api-key

# =============================================================================
# TIER 7: INTEGRATIONS (Optional)
# =============================================================================
# Server-side only
SLACK_BOT_TOKEN=xoxb-...
SLACK_TEAM_ID=T...
SLACK_CHANNEL_ID=C...

PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=your-index

LANGSMITH_API_KEY=lsv2_sk_...
LANGSMITH_PROJECT=prayermap

GITHUB_TOKEN=github_pat_...
```

---

## Environment-Specific Configuration

### Production (Vercel - main branch)

```bash
# Configure in Vercel Dashboard > Settings > Environment Variables
# Select: Production only

VITE_SUPABASE_URL=https://oomrmfhvsxtxgqqthisz.supabase.co
VITE_SUPABASE_ANON_KEY=[production anon key]
SUPABASE_SERVICE_ROLE_KEY=[production service role] # Mark as Sensitive
VITE_DATADOG_ENABLE_DEV=false
```

### Preview (Vercel - non-main branches)

```bash
# Configure in Vercel Dashboard > Settings > Environment Variables
# Select: Preview only

VITE_SUPABASE_URL=[branch URL from Supabase]
VITE_SUPABASE_ANON_KEY=[branch anon key]
SUPABASE_SERVICE_ROLE_KEY=[branch service role] # Mark as Sensitive
VITE_DATADOG_ENABLE_DEV=true
```

### Development (Local)

```bash
# In .env.local (never commit)

# Can point to production OR branch database depending on what you're testing
VITE_SUPABASE_URL=https://oomrmfhvsxtxgqqthisz.supabase.co
VITE_SUPABASE_ANON_KEY=[your choice]
SUPABASE_SERVICE_ROLE_KEY=[your choice]
VITE_DATADOG_ENABLE_DEV=true
```

---

## Vercel Dashboard Configuration

### Step-by-Step Setup

1. **Navigate to Project Settings**
   - Go to https://vercel.com/[team]/prayermap
   - Click "Settings" > "Environment Variables"

2. **Add Production Variables**
   - Click "Add New"
   - Enter variable name and value
   - Select "Production" environment only
   - Check "Sensitive" for API keys and secrets
   - Click "Save"

3. **Add Preview Variables**
   - Repeat for "Preview" environment
   - Use Supabase branch credentials
   - Mark sensitive variables

4. **Verify Configuration**
   - Deploy to preview branch
   - Check browser console: `console.log(import.meta.env.VITE_SUPABASE_URL)`
   - Should show branch URL, not production

### Variables to Configure

| Variable | Production | Preview | Sensitive? |
|----------|-----------|---------|------------|
| `VITE_SUPABASE_URL` | Production URL | Branch URL | No |
| `VITE_SUPABASE_ANON_KEY` | Production key | Branch key | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | Branch | **YES** |
| `VITE_MAPBOX_TOKEN` | Same | Same | No |
| `HIVE_API_KEY` | Same | Same | **YES** |
| `AWS_SECRET_ACCESS_KEY` | Same | Same | **YES** |
| `VITE_DATADOG_ENABLE_DEV` | `false` | `true` | No |

---

## Common Issues and Fixes

### Issue: Variable not available in code

**Symptom:** `import.meta.env.VITE_X` is undefined

**Fixes:**
1. Verify variable has `VITE_` prefix (required for client access)
2. Restart dev server after adding variable
3. Check for typos in variable name
4. Verify variable is in correct .env file

### Issue: Server-side variable exposed to client

**Symptom:** API key visible in browser network tab or source

**Fixes:**
1. Remove `VITE_` prefix from variable name
2. Move API call to edge function or API route
3. Audit all VITE_ variables for sensitivity

### Issue: Production using wrong database

**Symptom:** Preview data appearing in production or vice versa

**Fixes:**
1. Check Vercel environment variable scopes
2. Ensure Production and Preview have different values
3. Redeploy after changing environment variables

### Issue: Duplicate variable definitions

**Symptom:** Inconsistent behavior, hard-to-debug issues

**Fixes:**
1. Search .env.local for duplicates: `grep -n "VITE_SUPABASE" .env.local`
2. Keep only one definition of each variable
3. Use consistent ordering in env files

---

## Security Checklist

### Before Deploying

- [ ] No API keys with VITE_ prefix (except intentionally public ones)
- [ ] Sensitive variables marked as "Sensitive" in Vercel
- [ ] Production and Preview use different Supabase URLs
- [ ] .env.local is in .gitignore
- [ ] .env.example is up-to-date (no real values)
- [ ] No hardcoded secrets in source code

### Regular Audit

- [ ] Review Vercel environment variables monthly
- [ ] Rotate API keys quarterly (or after any suspected breach)
- [ ] Check for new variables that need classification
- [ ] Verify .gitignore includes all env files

---

## Variable Inventory

### Current Variables (as of 2025-12-03)

| Variable | Classification | Environment | Notes |
|----------|---------------|-------------|-------|
| `VITE_SUPABASE_URL` | Client | All | Public API endpoint |
| `VITE_SUPABASE_ANON_KEY` | Client | All | RLS-protected |
| `VITE_MAPBOX_TOKEN` | Client | All | Domain-restricted |
| `VITE_AWS_REGION` | Client | All | Just a region name |
| `VITE_S3_BUCKET` | Client | All | Bucket name |
| `VITE_CLOUDFRONT_URL` | Client | All | Public CDN |
| `VITE_DATADOG_APP_ID` | Client | All | Public identifier |
| `VITE_DATADOG_CLIENT_TOKEN` | Client | All | Client token |
| `VITE_DATADOG_ENABLE_DEV` | Client | All | Boolean flag |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | All | **CRITICAL - bypasses RLS** |
| `HIVE_API_KEY` | Server | All | AI moderation |
| `AWS_ACCESS_KEY_ID` | Server | All | AWS identity |
| `AWS_SECRET_ACCESS_KEY` | Server | All | AWS credential |
| `ANTHROPIC_API_KEY` | Server | All | AI API |
| `OPENAI_API_KEY` | Server | All | AI API |
| `SLACK_BOT_TOKEN` | Server | All | Slack integration |
| `PINECONE_API_KEY` | Server | All | Vector DB |
| `LANGSMITH_API_KEY` | Server | All | LLM tracing |
| `DATADOG_API_KEY` | Server | All | Observability |
| `GITHUB_TOKEN` | Server | All | CI/CD |

### Known Issues to Fix

| Issue | Current | Should Be | Priority |
|-------|---------|-----------|----------|
| `VITE_HIVE_API_KEY` | Has VITE_ prefix | `HIVE_API_KEY` | HIGH |
| Duplicate `VITE_MAPBOX_TOKEN` | Lines 15 & 37 | Single definition | MEDIUM |
| Duplicate `VITE_SUPABASE_*` | Multiple definitions | Single each | MEDIUM |

---

## Supabase Branch Credentials

When a Supabase branch is created, you'll need these credentials:

```bash
# After running: supabase branches create develop
# Get credentials from Supabase dashboard or API

# Branch: develop
# Project ref: [from create_branch response]
BRANCH_SUPABASE_URL=https://[project-ref].supabase.co
BRANCH_SUPABASE_ANON_KEY=[from dashboard]
BRANCH_SUPABASE_SERVICE_ROLE_KEY=[from dashboard]
```

**Where to find:**
1. Supabase Dashboard > Project Settings > API
2. Or use `mcp__supabase__get_publishable_keys` with branch project_ref

---

## Syncing with Vercel

### Pull from Vercel to Local

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Link project (first time only)
vercel link

# Pull environment variables
vercel env pull .env.local
```

### Push Local Changes to Vercel

Environment variables cannot be pushed via CLI - must use dashboard or API.

---

## Related Documentation

- **[SESSION-CONTEXT.md](./SESSION-CONTEXT.md)** - Include env status in sessions
- **[SECURITY-SPEC.md](./SECURITY-SPEC.md)** - Security implications of env vars
- **[SEATBELT.md](./SEATBELT.md)** - Configuration audit includes env check

---

**Last Updated:** 2025-12-03
**Version:** 1.0
**Next Review:** When adding new environment variables
