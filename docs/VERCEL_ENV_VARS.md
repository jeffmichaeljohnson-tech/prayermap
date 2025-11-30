# Vercel Environment Variables - Quick Reference

This is a quick reference guide for setting up environment variables in Vercel for PrayerMap.

## Required Environment Variables

### Via Vercel Dashboard

**Path:** Project Settings → Environment Variables → Add New

| Variable Name | Type | Scope | Example Value | Source |
|--------------|------|-------|---------------|--------|
| `VITE_SUPABASE_URL` | Plain Text | Production, Preview, Development | `https://xxxxx.supabase.co` | [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Plain Text | Production, Preview, Development | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API |
| `VITE_MAPBOX_TOKEN` | Plain Text | Production, Preview, Development | `pk.eyJ1Ijoieour-username...` | [MapBox Account](https://account.mapbox.com/) → Access Tokens |

### Via Vercel CLI

```bash
# Navigate to project directory
cd /path/to/prayermap

# Add environment variables
vercel env add VITE_SUPABASE_URL
# When prompted, enter: https://xxxxx.supabase.co
# Select scope: Production, Preview, Development (select all)

vercel env add VITE_SUPABASE_ANON_KEY
# When prompted, paste your Supabase anon key
# Select scope: Production, Preview, Development (select all)

vercel env add VITE_MAPBOX_TOKEN
# When prompted, paste your MapBox token
# Select scope: Production, Preview, Development (select all)

# Verify variables are set
vercel env ls
```

## Optional Environment Variables (Backend/Serverless Only)

These are only needed if you're using serverless functions or backend features:

| Variable Name | Type | Scope | Description |
|--------------|------|-------|-------------|
| `OPENAI_API_KEY` | Secret | Production, Preview | OpenAI API key for embeddings (memory system) |
| `PINECONE_API_KEY` | Secret | Production, Preview | Pinecone API key for vector storage |
| `SESSION_ID` | Plain Text | Production, Preview, Development | Session identifier (default: "production") |

**Note:** These are NOT prefixed with `VITE_` and will NOT be exposed to the client.

## Environment-Specific Configuration

### Production Environment
```bash
# Use production Supabase project
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-prod-anon-key

# Use production MapBox token
VITE_MAPBOX_TOKEN=your-production-token
```

### Preview/Staging Environment (Optional)
```bash
# Option 1: Use same as production (recommended)
# Preview deployments will inherit production values

# Option 2: Use separate staging environment
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-staging-anon-key
VITE_MAPBOX_TOKEN=your-staging-token
```

### Development Environment (Local)
```bash
# Copy .env.example to .env.local
cp .env.example .env.local

# Edit .env.local with your local/development values
# Development environment in Vercel can use same as production
```

## Verification Checklist

After setting environment variables in Vercel:

- [ ] All three required variables are set (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MAPBOX_TOKEN`)
- [ ] Variables are set for all required scopes (Production, Preview, Development)
- [ ] Variable values have no leading/trailing whitespace
- [ ] Supabase URL format is correct: `https://xxxxx.supabase.co`
- [ ] Supabase anon key starts with `eyJ`
- [ ] MapBox token starts with `pk.`
- [ ] Trigger a deployment to verify variables work: `vercel --prod`

## Troubleshooting

### Variables Not Showing in Build

**Issue:** Build logs show "undefined" for environment variables

**Solution:**
1. Ensure variables are prefixed with `VITE_` (Vite requirement)
2. Verify scope includes the environment you're deploying to
3. Redeploy after adding variables: `vercel --prod --force`

### Supabase Connection Failing

**Issue:** Console shows "Failed to connect to Supabase"

**Solution:**
1. Verify `VITE_SUPABASE_URL` has `https://` prefix
2. Check `VITE_SUPABASE_ANON_KEY` is the "anon/public" key, not "service_role" key
3. Test URL in browser: `https://xxxxx.supabase.co/rest/v1/` should return Supabase info

### MapBox Not Loading

**Issue:** Map shows blank or "Invalid token" error

**Solution:**
1. Verify token starts with `pk.` (public token)
2. Check token is not expired in MapBox dashboard
3. Ensure token has required scopes enabled: `styles:read`, `fonts:read`, `datasets:read`
4. Test token: `https://api.mapbox.com/styles/v1?access_token=YOUR_TOKEN`

## Security Best Practices

**DO:**
- ✅ Use `VITE_` prefix for client-exposed variables
- ✅ Use separate Supabase projects for prod/staging (optional)
- ✅ Rotate MapBox tokens periodically
- ✅ Use URL restrictions on MapBox tokens (restrict to prayermap.net)
- ✅ Monitor usage in Supabase and MapBox dashboards

**DON'T:**
- ❌ Expose `SUPABASE_SERVICE_ROLE_KEY` to client (backend only!)
- ❌ Commit `.env.local` to version control
- ❌ Share environment variables in public channels
- ❌ Use production keys in development (use separate project)
- ❌ Store sensitive data in localStorage without encryption

## Quick Links

- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase API Settings](https://supabase.com/dashboard)
- [MapBox Access Tokens](https://account.mapbox.com/access-tokens/)
- [Vite Environment Variables Guide](https://vitejs.dev/guide/env-and-mode.html)

---

**Last Updated:** 2025-11-29
**For:** PrayerMap Production Deployment
