# Environment Variables Documentation

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Variable Reference](#variable-reference)
- [Environment-Specific Configuration](#environment-specific-configuration)
- [Security Considerations](#security-considerations)
- [Deployment Guide](#deployment-guide)
- [Troubleshooting](#troubleshooting)

---

## Overview

PrayerMap uses environment variables to configure different aspects of the application across development, staging, and production environments. This document provides comprehensive guidance on all environment variables used in the project.

### Variable Naming Conventions

PrayerMap follows Vite's environment variable conventions:

- **`VITE_*` prefix** - Client-side variables (exposed to the browser)
  - Bundled into the client-side JavaScript
  - Accessible via `import.meta.env.VITE_VARIABLE_NAME`
  - **Safe to expose** (but still follow security best practices)

- **No prefix** - Server-side only variables
  - Used in Node.js scripts, tests, and CI/CD
  - Accessible via `process.env.VARIABLE_NAME`
  - **Never exposed to the client**

### File Structure

```
prayermap/
├── .env.example          # Template file (committed to git)
├── .env.local           # Local development (gitignored) ← USE THIS
├── .env.staging         # Staging environment (gitignored)
├── .env.production      # Production secrets (gitignored)
└── admin/
    ├── .env.example     # Admin template (committed)
    └── .env.local       # Admin local (gitignored) ← USE THIS
```

### Loading Priority

Vite loads environment variables in this order (highest priority first):

1. `.env.local` - Local overrides (highest priority)
2. `.env.[mode]` - Mode-specific (e.g., `.env.production`)
3. `.env` - Shared defaults
4. Built-in Vite defaults

---

## Quick Start

### For Local Development

```bash
# 1. Copy the template
cp .env.example .env.local

# 2. Edit .env.local with your credentials
# Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_MAPBOX_TOKEN

# 3. Start the dev server
npm run dev

# 4. Set up admin dashboard (optional)
cd admin
cp .env.example .env.local
# Edit admin/.env.local (use same Supabase credentials)
npm run dev
```

### For Production Deployment (Vercel)

```bash
# Set variables in Vercel dashboard:
# 1. Go to your project settings
# 2. Navigate to Environment Variables
# 3. Add VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_MAPBOX_TOKEN
# 4. Deploy
```

---

## Variable Reference

### Required Variables

These variables **must** be set for the application to function:

#### `VITE_SUPABASE_URL`

- **Type:** Client-side (VITE_*)
- **Required:** Yes
- **Description:** Your Supabase project URL
- **Example:** `https://abcdefgh12345678.supabase.co`
- **Where to get it:** [Supabase Dashboard](https://supabase.com/dashboard) → Project → Settings → API → Project URL
- **Security:** Safe to expose (protected by RLS policies)

#### `VITE_SUPABASE_ANON_KEY`

- **Type:** Client-side (VITE_*)
- **Required:** Yes
- **Description:** Supabase anonymous/public API key
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Where to get it:** [Supabase Dashboard](https://supabase.com/dashboard) → Project → Settings → API → Project API keys → `anon` `public`
- **Security:** Safe to expose (limited permissions via RLS)
- **Note:** This is NOT the service_role key (which should never be exposed)

#### `VITE_MAPBOX_TOKEN`

- **Type:** Client-side (VITE_*)
- **Required:** Yes
- **Description:** Mapbox public access token for map rendering
- **Example:** `pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImFiYzEyMyJ9...`
- **Where to get it:** [Mapbox Account](https://account.mapbox.com/access-tokens/)
- **Security:** Safe to expose (public token, starts with `pk.`)
- **Best practice:** Restrict token to specific URLs in Mapbox dashboard
- **Aliases:** Some docs may reference `VITE_MAPBOX_ACCESS_TOKEN` (both work)

---

### Optional Variables

#### `VITE_APP_VERSION`

- **Type:** Client-side (VITE_*)
- **Required:** No
- **Default:** `'0.0.0'`
- **Description:** Application version for logging and display
- **Example:** `1.0.0`
- **Used in:**
  - `/home/user/prayermap/src/lib/logger.ts` (logging metadata)
  - `/home/user/prayermap/src/App.tsx` (app initialization)

#### `OPENAI_API_KEY`

- **Type:** Server-side (no prefix)
- **Required:** No (only for memory system)
- **Description:** OpenAI API key for generating text embeddings
- **Example:** `sk-proj-abc123...`
- **Where to get it:** [OpenAI Platform](https://platform.openai.com/api-keys)
- **Security:** **SENSITIVE** - Never expose to client, server-side only
- **Used for:** Agent memory system (Pinecone vector embeddings)
- **Used in:**
  - `/home/user/prayermap/src/memory/query.ts`
  - `/home/user/prayermap/src/memory/logger.ts`

#### `PINECONE_API_KEY`

- **Type:** Server-side (no prefix)
- **Required:** No (only for memory system)
- **Description:** Pinecone API key for vector database
- **Example:** `pcsk_abc123...`
- **Where to get it:** [Pinecone Console](https://app.pinecone.io/)
- **Security:** **SENSITIVE** - Never expose to client, server-side only
- **Setup required:**
  - Create index named `prayermap-agent-memory`
  - Dimensions: 1536 (OpenAI ada-002 embeddings)
  - Metric: cosine

#### `SESSION_ID`

- **Type:** Server-side (no prefix)
- **Required:** No
- **Default:** `'default-session'`
- **Description:** Session identifier for memory logging
- **Example:** `dev-session-2024-01-15`
- **Used for:** Organizing memory logs by session

#### `CI`

- **Type:** Server-side (no prefix)
- **Required:** No
- **Default:** `false`
- **Description:** Indicates if running in CI/CD environment
- **Example:** `true`
- **Auto-set by:** GitHub Actions, GitLab CI, etc.
- **Used in:**
  - `/home/user/prayermap/playwright.config.ts` (test configuration)
  - `.cursor/rules/testing-quality.mdc` (testing rules)

#### `ADMIN_EMAIL` / `ADMIN_PASSWORD`

- **Type:** Server-side (no prefix)
- **Required:** No (only for E2E tests)
- **Description:** Admin credentials for automated testing
- **Security:** **NEVER use production credentials**
- **Used in:** `/home/user/prayermap/admin/e2e/auth.spec.ts`
- **Example:**
  ```bash
  ADMIN_EMAIL=admin@example.com
  ADMIN_PASSWORD=test-password-123
  ```

---

### Automatic Variables (Vite Built-ins)

These are automatically set by Vite and Node.js:

#### `NODE_ENV`

- **Auto-set by:** Node.js
- **Values:** `development` | `production` | `test`
- **Description:** Node.js environment mode
- **Accessible via:** `process.env.NODE_ENV`
- **Used in:**
  - `/home/user/prayermap/src/components/ErrorBoundary.tsx`
  - `/home/user/prayermap/src/components/FallbackUI.tsx`

#### `import.meta.env.DEV`

- **Auto-set by:** Vite
- **Type:** Boolean
- **Description:** `true` in development, `false` in production
- **Accessible via:** `import.meta.env.DEV`
- **Used in:** `/home/user/prayermap/src/lib/logger.ts`

#### `import.meta.env.MODE`

- **Auto-set by:** Vite
- **Values:** `development` | `production` | custom (via `--mode` flag)
- **Description:** Current Vite mode
- **Accessible via:** `import.meta.env.MODE`
- **Used in:** `/home/user/prayermap/src/lib/logger.ts`

---

## Environment-Specific Configuration

### Development

**File:** `.env.local`

```bash
# Required
VITE_SUPABASE_URL=https://your-dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...dev-anon-key
VITE_MAPBOX_TOKEN=pk.eyJ...dev-token

# Optional
VITE_APP_VERSION=1.0.0-dev
OPENAI_API_KEY=sk-proj-...
PINECONE_API_KEY=pcsk_...
SESSION_ID=dev-session
```

**Best practices:**
- Use a separate Supabase project for development
- Use a separate Mapbox token with URL restrictions
- Never commit `.env.local` to git
- Test with realistic data, not production data

### Staging

**File:** `.env.staging`

```bash
# Required
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...staging-anon-key
VITE_MAPBOX_TOKEN=pk.eyJ...staging-token

# Optional
VITE_APP_VERSION=1.0.0-staging
```

**Deployment:**
```bash
# Build with staging environment
vite build --mode staging
```

**Best practices:**
- Use a separate Supabase project for staging
- Mirror production data structure, but use test data
- Test deployment process before production

### Production

**File:** Set in Vercel Dashboard (NOT `.env.production` file)

**Required variables in Vercel:**
1. `VITE_SUPABASE_URL` → Production Supabase URL
2. `VITE_SUPABASE_ANON_KEY` → Production Supabase anon key
3. `VITE_MAPBOX_TOKEN` → Production Mapbox token

**How to set:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to Settings → Environment Variables
4. Add each variable with value
5. Scope: Production (or all environments as needed)
6. Save and redeploy

**Best practices:**
- Never commit production secrets to git
- Use Vercel's encrypted environment variables
- Rotate keys regularly (quarterly recommended)
- Monitor usage and set up alerts
- Use URL restrictions on Mapbox tokens
- Use separate Supabase project for production

---

## Security Considerations

### Client-Side Variables (VITE_*)

#### Safe to Expose
These variables are **bundled into client-side JavaScript** and visible to users:

- `VITE_SUPABASE_URL` - Protected by RLS policies
- `VITE_SUPABASE_ANON_KEY` - Limited permissions via RLS
- `VITE_MAPBOX_TOKEN` - Public token (starts with `pk.`)
- `VITE_APP_VERSION` - Non-sensitive metadata

#### Security Measures
- **Supabase:** Always use Row Level Security (RLS) policies
- **Mapbox:** Add URL restrictions in Mapbox dashboard
- **Never expose:**
  - Database passwords
  - Service role keys
  - Private API keys
  - User credentials

### Server-Side Variables (No VITE_ prefix)

#### Sensitive - Never Expose
These must **never** be accessible to the client:

- `OPENAI_API_KEY` - Server-side only
- `PINECONE_API_KEY` - Server-side only
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` - Testing only, never production

#### Protection Mechanisms
- Not bundled into client JavaScript
- Only accessible in Node.js environment
- Use `.env.local` (gitignored)
- Set in Vercel as encrypted secrets

### Best Practices Checklist

✅ **DO:**
- Use `.env.local` for local development
- Set production variables in Vercel dashboard
- Use different projects/keys for dev/staging/prod
- Add URL restrictions to Mapbox tokens
- Use RLS policies to protect Supabase data
- Rotate API keys quarterly
- Monitor API usage and set alerts
- Use strong, unique credentials
- Test with non-production data

❌ **DON'T:**
- Commit `.env.local`, `.env.staging`, or `.env.production`
- Share API keys via chat, email, or Slack
- Use production credentials in development
- Hardcode secrets in source code
- Expose server-side variables to client
- Use the same Supabase project for all environments
- Ignore security warnings from Supabase/Mapbox

---

## Deployment Guide

### Vercel Deployment

#### Initial Setup

1. **Connect Repository**
   ```bash
   # Push code to GitHub
   git push origin main

   # Import in Vercel dashboard
   # https://vercel.com/new
   ```

2. **Configure Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add required variables:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `VITE_MAPBOX_TOKEN`
   - Scope: Production (or all environments)

3. **Deploy**
   ```bash
   # Automatic deployment on push to main
   git push origin main

   # Or manual deployment
   vercel --prod
   ```

#### Admin Dashboard Deployment

The admin dashboard is deployed separately:

1. **Create New Vercel Project**
   - Same repository
   - Root directory: `admin`

2. **Configure Environment Variables**
   - Use **same Supabase credentials** as main app
   - Add: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

3. **Build Settings**
   - Build command: `npm run build`
   - Output directory: `dist`

### Manual Deployment

```bash
# Build for production
npm run build

# Preview build locally
npm run preview

# Build admin dashboard
cd admin && npm run build
```

### Mobile Deployment (iOS/Android)

Environment variables are bundled during the Capacitor build process:

```bash
# 1. Set variables in .env.local
# 2. Build web app with variables
npm run build

# 3. Sync to native platforms
npx cap sync

# 4. Open in native IDE
npx cap open ios      # Xcode
npx cap open android  # Android Studio

# 5. Build and deploy from IDE
```

**Note:** Mobile apps use the same environment variables as the web app.

---

## Troubleshooting

### Common Issues

#### "Missing Supabase environment variables"

**Error:**
```
Warning: Missing Supabase environment variables - some features may not work
```

**Solution:**
1. Check `.env.local` exists
2. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
3. Restart dev server: `npm run dev`

#### "Mapbox token is not set"

**Error:**
```
Error: VITE_MAPBOX_TOKEN is not set
```

**Solution:**
1. Get token from [Mapbox Account](https://account.mapbox.com/access-tokens/)
2. Add to `.env.local`: `VITE_MAPBOX_TOKEN=pk.eyJ...`
3. Restart dev server

#### Variables not updating

**Issue:** Changed `.env.local` but values still old

**Solution:**
1. Stop dev server (Ctrl+C)
2. Clear Vite cache: `rm -rf node_modules/.vite`
3. Restart: `npm run dev`

#### Production deployment fails

**Issue:** Build succeeds locally but fails on Vercel

**Solution:**
1. Check Vercel environment variables are set
2. Verify variable names match exactly (case-sensitive)
3. Check build logs for specific errors
4. Ensure variables are scoped correctly (Production/Preview/Development)

#### RLS policy errors

**Issue:** "new row violates row-level security policy"

**Solution:**
1. Check Supabase RLS policies are enabled
2. Verify `VITE_SUPABASE_ANON_KEY` is correct
3. Test policies in Supabase SQL editor
4. See database schema: `/home/user/prayermap/prayermap_schema_v2.sql`

### Debugging Commands

```bash
# Check which variables are available
npm run dev
# Then in browser console:
console.log(import.meta.env)

# Verify .env.local is being read
cat .env.local

# Check if file is gitignored (should return empty)
git status .env.local

# Test Supabase connection
# Add this to any component:
import { supabase } from '@/lib/supabase'
console.log('Supabase client:', supabase)

# Test Mapbox token
# In browser console:
console.log('Mapbox token:', import.meta.env.VITE_MAPBOX_TOKEN)
```

### Getting Help

If issues persist:

1. **Check Documentation**
   - [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
   - [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
   - [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/guides/)

2. **Review Project Files**
   - `/home/user/prayermap/.env.example` - Template
   - `/home/user/prayermap/src/lib/supabase.ts` - Supabase setup
   - `/home/user/prayermap/vite.config.ts` - Vite configuration

3. **Check Project Memory**
   - Query memory system for past solutions
   - See `/home/user/prayermap/CLAUDE.md` - Principle 5

---

## Quick Reference

### Minimal .env.local (Development)

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key
VITE_MAPBOX_TOKEN=pk.eyJ...your-token
```

### Complete .env.local (All Features)

```bash
# Required
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key
VITE_MAPBOX_TOKEN=pk.eyJ...your-token

# Optional
VITE_APP_VERSION=1.0.0
OPENAI_API_KEY=sk-proj-...
PINECONE_API_KEY=pcsk_...
SESSION_ID=dev-session
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=test-password
```

### Vercel Production (Dashboard)

```
VITE_SUPABASE_URL → https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY → eyJ...prod-anon-key
VITE_MAPBOX_TOKEN → pk.eyJ...prod-token
```

---

**Last Updated:** 2025-11-29
**Maintained by:** Environment Variables Manager Agent
**Related Documentation:**
- `/home/user/prayermap/.env.example` - Main template
- `/home/user/prayermap/admin/.env.example` - Admin template
- `/home/user/prayermap/CLAUDE.md` - Project principles
- `/home/user/prayermap/README.md` - Project overview
