# Vercel Deployment Guide for PrayerMap

This document provides comprehensive instructions for deploying PrayerMap to Vercel with optimal configuration.

## Table of Contents
1. [Environment Variables](#environment-variables)
2. [Deployment Configuration](#deployment-configuration)
3. [Security Headers](#security-headers)
4. [Preview Deployments](#preview-deployments)
5. [Performance Optimization](#performance-optimization)
6. [Troubleshooting](#troubleshooting)

---

## Environment Variables

### Required Environment Variables

Configure these in your Vercel project settings:
**Project Settings → Environment Variables**

#### 1. Supabase Configuration

```bash
# Supabase Project URL
VITE_SUPABASE_URL=https://your-project.supabase.co

# Supabase Anonymous/Public Key
# Safe to expose in client-side code
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to find:**
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Select your project
- Navigate to **Settings → API**
- Copy "Project URL" and "anon/public" key

#### 2. MapBox Configuration

```bash
# MapBox Access Token
VITE_MAPBOX_TOKEN=pk.eyJ1Ijoieour-username...
```

**Where to find:**
- Go to [MapBox Account](https://account.mapbox.com/)
- Navigate to **Access Tokens**
- Create a new token or copy an existing one
- Recommended scopes: `styles:read`, `fonts:read`, `datasets:read`

#### 3. Optional: Memory System (Backend Only)

These are NOT exposed to the client and should only be set in Vercel environment variables if using serverless functions:

```bash
# OpenAI API Key (for embeddings)
OPENAI_API_KEY=sk-...

# Pinecone API Key (for vector storage)
PINECONE_API_KEY=...

# Session identifier
SESSION_ID=production
```

### Environment Variable Configuration

1. **Production Environment:**
   - Set all `VITE_*` variables
   - Ensure URLs point to production Supabase project
   - Use production MapBox token

2. **Preview/Development Environment:**
   - Can use the same values as production
   - Or set up separate Supabase project for staging
   - Preview deployments inherit production environment variables by default

3. **How to Set in Vercel:**
   ```bash
   # Via Vercel CLI
   vercel env add VITE_SUPABASE_URL production
   vercel env add VITE_SUPABASE_ANON_KEY production
   vercel env add VITE_MAPBOX_TOKEN production

   # Via Vercel Dashboard
   # 1. Go to Project Settings
   # 2. Navigate to Environment Variables
   # 3. Add each variable with appropriate scope (Production, Preview, Development)
   ```

---

## Deployment Configuration

### vercel.json Overview

The `vercel.json` file at the root of the project configures:

```json
{
  "buildCommand": "npm run build",           // Vite build command
  "outputDirectory": "dist",                 // Build output directory
  "framework": "vite",                       // Framework detection
  "regions": ["iad1"],                       // US East (Ashburn, VA)
  "github": {
    "silent": false,                         // Show deployment comments on PRs
    "autoJobCancelation": true               // Cancel outdated deployments
  }
}
```

### Build Settings

**Build Command:** `npm run build`
- Runs Vite production build
- Outputs to `dist/` directory
- Minifies JS/CSS with Terser
- Removes console.logs
- Generates optimized chunks

**Output Directory:** `dist/`
- Contains compiled HTML, JS, CSS, and assets
- Static files served directly by Vercel Edge Network
- Cached with immutable headers for performance

### Region Configuration

**Primary Region:** `iad1` (US East - Ashburn, Virginia)
- Optimal for US-based traffic
- Low latency to Supabase (if using US region)
- Can add multiple regions if needed: `["iad1", "sfo1"]`

**Available Regions:**
- `iad1` - US East (Ashburn, VA)
- `sfo1` - US West (San Francisco, CA)
- `lhr1` - Europe West (London, UK)
- `gru1` - South America (São Paulo, Brazil)

---

## Security Headers

### Content Security Policy (CSP)

The CSP is configured to allow:

```
default-src 'self'
  → Only load resources from same origin by default

script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.mapbox.com
  → Allow scripts from self, inline (for Vite), eval (for MapBox), and MapBox API
  → NOTE: 'unsafe-inline' and 'unsafe-eval' needed for Vite + MapBox compatibility

style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.mapbox.com
  → Allow styles from self, inline (for Tailwind), Google Fonts, MapBox

img-src 'self' data: blob: https: https://*.supabase.co https://api.mapbox.com https://*.tiles.mapbox.com
  → Allow images from self, data URLs, blobs, HTTPS, Supabase storage, MapBox tiles

font-src 'self' data: https://fonts.gstatic.com
  → Allow fonts from self, data URLs, Google Fonts CDN

connect-src 'self' https://*.supabase.co https://api.mapbox.com https://events.mapbox.com wss://*.supabase.co
  → Allow API connections to Supabase (HTTP and WebSocket), MapBox API

worker-src 'self' blob:
  → Allow web workers from self and blob URLs

child-src 'self' blob:
  → Allow child frames from self and blob URLs

frame-src 'none'
  → Block all iframes (enhanced clickjacking protection)

upgrade-insecure-requests
  → Automatically upgrade HTTP to HTTPS
```

### Additional Security Headers

**X-Content-Type-Options: nosniff**
- Prevents MIME type sniffing
- Forces browser to respect declared content types
- Mitigates XSS attacks via content type confusion

**X-Frame-Options: DENY**
- Prevents page from being embedded in iframes
- Protects against clickjacking attacks
- Alternative to CSP frame-src

**X-XSS-Protection: 1; mode=block**
- Enables browser XSS filtering
- Blocks page if XSS attack detected
- Legacy header but still useful for older browsers

**Referrer-Policy: strict-origin-when-cross-origin**
- Only send origin in Referer header for cross-origin requests
- Protects user privacy
- Prevents leaking sensitive URLs

**Permissions-Policy**
```
camera=(self)       → Only allow camera access from same origin
microphone=(self)   → Only allow microphone access from same origin
geolocation=(self)  → Only allow geolocation from same origin
payment=()          → Block payment API
usb=()              → Block USB API
```

### Strict Transport Security (HSTS)

Vercel automatically adds HSTS headers:
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```
- Forces HTTPS for 2 years
- Applies to all subdomains
- Eligible for browser preload lists

---

## Preview Deployments

### Automatic Preview Deployments

Every pull request automatically gets a preview deployment:

**URL Format:**
```
https://prayermap-[branch-name]-[team-slug].vercel.app
```

**Features:**
- Isolated environment per PR
- Inherits production environment variables
- Automatic SSL certificates
- Full feature parity with production

### Preview Deployment Configuration

**GitHub Integration Settings:**
```json
{
  "silent": false,              // Post deployment comments on PRs
  "autoJobCancelation": true    // Cancel outdated deployments
}
```

**Benefits:**
- **Testing:** Test features before merging to main
- **Collaboration:** Share preview URLs with team/stakeholders
- **QA:** Validate mobile compatibility via device testing
- **Performance:** Run Lighthouse audits on preview deployments

### Preview Environment Variables

Preview deployments can have separate environment variables:

1. **Use Production Values (Default):**
   - Preview uses production Supabase project
   - Recommended for most cases

2. **Separate Staging Environment:**
   ```bash
   # Set preview-specific variables
   vercel env add VITE_SUPABASE_URL preview
   vercel env add VITE_SUPABASE_ANON_KEY preview
   ```

### Testing Preview Deployments

```bash
# After PR is created, Vercel will comment with preview URL
# Example: https://prayermap-feature-prayer-cards-team.vercel.app

# Test on real devices:
1. Open preview URL on iPhone
2. Open preview URL on Android device
3. Test iOS Safari, Chrome, Firefox
4. Verify geolocation, camera, notifications work
5. Run Lighthouse audit in Chrome DevTools
```

---

## Performance Optimization

### Caching Strategy

**HTML (index.html):**
```
Cache-Control: public, max-age=0, must-revalidate
```
- Always revalidate to get latest version
- Ensures users get updates immediately

**JavaScript/CSS Bundles:**
```
Cache-Control: public, max-age=31536000, immutable
```
- Cache for 1 year (31536000 seconds)
- `immutable` tells browser file will never change
- Safe because Vite uses content hashes in filenames

**Static Assets (images, fonts, etc.):**
```
Cache-Control: public, max-age=31536000, immutable
```
- Long-term caching for performance
- Content-addressed filenames prevent stale cache

**Manifest.json:**
```
Cache-Control: public, max-age=0, must-revalidate
Content-Type: application/manifest+json
```
- Always fetch latest manifest
- Ensures PWA updates work correctly

### Build Optimizations

**Code Splitting:**
- Vite automatically splits code by route
- Manual chunks for large libraries (MapBox, React, Radix UI)
- Reduces initial bundle size

**Tree Shaking:**
- Removes unused code
- Enabled by default in Vite production mode

**Minification:**
- Terser minification for JavaScript
- Removes console.logs in production
- Optimizes CSS with PostCSS

**Performance Budget:**
- Main bundle target: < 500KB
- MapBox chunk: ~1.6MB raw (443KB gzipped)
- Total page weight: < 2MB

### Monitoring Performance

**Vercel Analytics:**
- Automatically tracks Core Web Vitals
- Provides Real User Monitoring (RUM)
- Available in Project → Analytics

**Metrics to Monitor:**
- First Contentful Paint (FCP): Target < 1.5s
- Largest Contentful Paint (LCP): Target < 2.5s
- Time to Interactive (TTI): Target < 2s
- Cumulative Layout Shift (CLS): Target < 0.1
- First Input Delay (FID): Target < 100ms

**Manual Testing:**
```bash
# Run Lighthouse audit
npm run build
npm run preview
# Open Chrome DevTools → Lighthouse → Run audit

# Expected scores:
# Performance: 90+
# Accessibility: 95+
# Best Practices: 95+
# SEO: 90+
```

---

## Troubleshooting

### Common Issues

#### 1. Build Fails - Environment Variables Missing

**Symptom:**
```
Error: Missing environment variable: VITE_SUPABASE_URL
```

**Solution:**
```bash
# Verify environment variables are set in Vercel
vercel env ls

# Add missing variables
vercel env add VITE_SUPABASE_URL production
```

#### 2. CSP Violations in Browser Console

**Symptom:**
```
Refused to load the script 'https://example.com/script.js' because it violates
the following Content Security Policy directive: "script-src 'self'"
```

**Solution:**
1. Identify the blocked resource domain
2. Add domain to appropriate CSP directive in `vercel.json`
3. Redeploy

**Example:**
```json
{
  "key": "Content-Security-Policy",
  "value": "script-src 'self' https://trusted-domain.com; ..."
}
```

#### 3. Preview Deployment Not Created

**Symptom:**
PR is created but no preview deployment comment appears

**Solution:**
1. Check Vercel GitHub app permissions
2. Verify repository is connected in Vercel dashboard
3. Check `github.silent` is set to `false` in `vercel.json`
4. Re-trigger deployment by pushing new commit

#### 4. 404 Errors on Direct URL Access

**Symptom:**
`/prayers` route works when navigating within app, but 404 when accessing directly

**Solution:**
Already configured in `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
This ensures all routes serve `index.html` for client-side routing.

#### 5. MapBox Not Loading on Mobile

**Symptom:**
Map shows blank on iOS/Android preview deployments

**Solution:**
1. Verify `VITE_MAPBOX_TOKEN` is set correctly
2. Check MapBox token has correct scopes enabled
3. Verify CSP allows MapBox domains:
   - `https://api.mapbox.com`
   - `https://*.tiles.mapbox.com`
   - `https://events.mapbox.com`

#### 6. Slow Initial Load Time

**Symptom:**
LCP > 4s, poor Lighthouse performance score

**Solution:**
1. Check bundle size: `npm run build` and review output
2. Verify chunks are split correctly (check `dist/assets/`)
3. Test with throttled connection: Chrome DevTools → Network → Slow 3G
4. Consider lazy loading non-critical components
5. Optimize images: use WebP, compress with TinyPNG

---

## Deployment Checklist

### Pre-Deployment

- [ ] All environment variables set in Vercel project
- [ ] `vercel.json` configuration reviewed
- [ ] Security headers validated
- [ ] Build succeeds locally: `npm run build`
- [ ] Preview deployment tested on mobile devices
- [ ] Lighthouse audit scores meet targets (90+)

### Post-Deployment

- [ ] Production URL loads correctly: https://prayermap.net
- [ ] Browser console shows no CSP violations
- [ ] MapBox tiles load correctly
- [ ] Supabase authentication works
- [ ] Prayer posting/viewing works
- [ ] Camera/geolocation permissions work on mobile
- [ ] Verify analytics data in Vercel dashboard

### Monitoring

- [ ] Check Vercel Analytics daily for performance regressions
- [ ] Monitor error rates in Sentry (if configured)
- [ ] Review Supabase logs for API errors
- [ ] Test critical user flows weekly on real devices

---

## Additional Resources

**Official Documentation:**
- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Content Security Policy Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

**PrayerMap Documentation:**
- [CLAUDE.md](../CLAUDE.md) - Project principles and guidelines
- [ARTICLE.md](../ARTICLE.md) - Autonomous Excellence Manifesto
- [README.md](../README.md) - Project overview and setup
- [.env.example](../.env.example) - Environment variable template

**Performance Tools:**
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WebPageTest](https://www.webpagetest.org/)
- [GTmetrix](https://gtmetrix.com/)
- [Vercel Speed Insights](https://vercel.com/docs/concepts/speed-insights)

---

**Last Updated:** 2025-11-29
**Maintained for:** Vercel Edge Network
**Version:** 1.0
