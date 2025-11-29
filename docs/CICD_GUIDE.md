# CI/CD Guide - PrayerMap

**Complete guide to continuous integration, continuous deployment, and release management**

**Last Updated:** 2025-11-29
**Status:** Production Ready
**CI/CD Platform:** GitHub Actions + Vercel + App Stores

---

## Table of Contents

1. [Overview](#overview)
2. [CI/CD Architecture](#cicd-architecture)
3. [GitHub Actions Workflows](#github-actions-workflows)
4. [Deployment Platforms](#deployment-platforms)
5. [Required Secrets](#required-secrets)
6. [Monitoring Builds](#monitoring-builds)
7. [Troubleshooting](#troubleshooting)
8. [Deployment Runbook](#deployment-runbook)
9. [Quick Reference](#quick-reference)

---

## Overview

### CI/CD Philosophy

PrayerMap follows **continuous integration** and **continuous deployment** practices:

- **Every commit** is tested automatically
- **Every push to main** triggers deployment checks
- **Pull requests** must pass all checks before merge
- **Production deployments** are automated but controlled

### Deployment Targets

| Platform | Tool | Environment | Auto-Deploy |
|----------|------|-------------|-------------|
| Web (Production) | Vercel | Production | Yes (main branch) |
| Web (Preview) | Vercel | Preview | Yes (all PRs) |
| iOS | App Store Connect | Production | Manual |
| iOS Beta | TestFlight | Beta | Manual |
| Android | Google Play Console | Production | Manual |
| Android Beta | Internal Testing | Beta | Manual |

### Quality Gates

All deployments must pass:
- ✅ ESLint (code quality)
- ✅ TypeScript type checking (type safety)
- ✅ Unit tests with coverage (functionality)
- ✅ E2E tests (user flows)
- ✅ Build verification (compilation)

---

## CI/CD Architecture

### Architecture Diagram (Text-Based)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Developer Workflow                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Git Push       │
                    │   (GitHub)       │
                    └──────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
    ┌──────────────────────┐    ┌──────────────────────┐
    │   Pull Request       │    │   Push to Main       │
    │   (Feature Branch)   │    │   (Production)       │
    └──────────────────────┘    └──────────────────────┘
                │                           │
                ▼                           ▼
    ┌──────────────────────────────────────────────────┐
    │          GitHub Actions CI Workflow              │
    │  ┌──────────────────────────────────────────┐   │
    │  │  Parallel Jobs:                          │   │
    │  │  ├─ Lint (ESLint)                        │   │
    │  │  ├─ Type Check (TypeScript)              │   │
    │  │  ├─ Unit Tests (Vitest + Coverage)       │   │
    │  │  └─ E2E Tests (Playwright)               │   │
    │  └──────────────────────────────────────────┘   │
    │                    │                             │
    │                    ▼                             │
    │  ┌──────────────────────────────────────────┐   │
    │  │  Sequential Jobs:                        │   │
    │  │  ├─ Build (Production Bundle)            │   │
    │  │  └─ Deploy Check (Main Branch Only)     │   │
    │  └──────────────────────────────────────────┘   │
    └──────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
    ┌──────────────────────┐    ┌──────────────────────┐
    │  Vercel Preview      │    │  Vercel Production   │
    │  (Auto-Deploy PR)    │    │  (Auto-Deploy Main)  │
    └──────────────────────┘    └──────────────────────┘
                                            │
                              ┌─────────────┴─────────────┐
                              ▼                           ▼
                  ┌──────────────────────┐    ┌──────────────────────┐
                  │  Manual Mobile       │    │  Manual Mobile       │
                  │  Android Build       │    │  iOS Build           │
                  └──────────────────────┘    └──────────────────────┘
                              │                           │
                              ▼                           ▼
                  ┌──────────────────────┐    ┌──────────────────────┐
                  │  Google Play Store   │    │  App Store Connect   │
                  └──────────────────────┘    └──────────────────────┘
```

### CI/CD Flow Stages

#### Stage 1: Code Quality (Parallel)
- **Lint**: ESLint checks code style and best practices
- **Type Check**: TypeScript validates type safety
- **Unit Tests**: Vitest runs all unit tests with coverage
- **E2E Tests**: Playwright runs end-to-end tests

**Duration:** ~5-10 minutes (parallel execution)

#### Stage 2: Build Verification (Sequential)
- **Build**: Vite compiles production bundle
- **Deploy Check**: Validates deployment readiness (main branch only)

**Duration:** ~3-5 minutes

#### Stage 3: Deployment (Conditional)
- **Vercel Preview**: Auto-deploys all PRs to preview URLs
- **Vercel Production**: Auto-deploys main branch to prayermap.net
- **Mobile**: Manual builds and uploads to app stores

**Duration:**
- Web: ~2-3 minutes (automatic)
- Mobile: ~15-30 minutes (manual)

---

## GitHub Actions Workflows

### Main CI Workflow

**File:** `.github/workflows/ci.yml`

**Triggered On:**
- Push to `main` branch
- Pull requests targeting `main` branch

**Jobs:**

#### 1. Lint Job

```yaml
Purpose: Check code style and quality
Runtime: ubuntu-latest
Timeout: 10 minutes
Steps:
  - Checkout code
  - Setup Node.js 20
  - Install dependencies (npm ci)
  - Run ESLint
```

**When it fails:**
- Code style violations
- ESLint rule violations
- Unused variables/imports
- Console.log statements (if configured)

**How to fix:**
```bash
# Run locally
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

#### 2. Type Check Job

```yaml
Purpose: Validate TypeScript types
Runtime: ubuntu-latest
Timeout: 10 minutes
Steps:
  - Checkout code
  - Setup Node.js 20
  - Install dependencies
  - Run TypeScript compiler (tsc --noEmit)
```

**When it fails:**
- Type errors
- Missing type definitions
- Incorrect type usage
- Import/export issues

**How to fix:**
```bash
# Run locally
npx tsc --noEmit

# Fix type errors in your code
```

#### 3. Unit Tests Job

```yaml
Purpose: Run unit tests with coverage
Runtime: ubuntu-latest
Timeout: 15 minutes
Steps:
  - Checkout code
  - Setup Node.js 20
  - Install dependencies
  - Run tests with coverage (npm run test:ci)
  - Upload coverage to Codecov
  - Upload test results artifact
  - Upload coverage artifacts
```

**When it fails:**
- Test failures
- Coverage below threshold
- Test timeouts
- Setup/teardown errors

**How to fix:**
```bash
# Run locally
npm run test

# Run with coverage
npm run test:coverage

# Run specific test file
npm run test src/components/PrayerCard.test.tsx

# Debug mode
npm run test:watch
```

#### 4. E2E Tests Job

```yaml
Purpose: Run end-to-end tests with Playwright
Runtime: ubuntu-latest
Timeout: 20 minutes
Steps:
  - Checkout code
  - Setup Node.js 20
  - Install dependencies
  - Install Playwright browsers (chromium only for CI)
  - Build application
  - Run Playwright tests
  - Upload Playwright report artifact
Environment:
  - VITE_SUPABASE_URL (from secrets)
  - VITE_SUPABASE_ANON_KEY (from secrets)
```

**When it fails:**
- User flow broken
- API integration issues
- UI element not found
- Timeout waiting for elements

**How to fix:**
```bash
# Run locally
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug

# View report
npm run test:e2e:report
```

#### 5. Build Job

```yaml
Purpose: Build production bundle
Runtime: ubuntu-latest
Timeout: 15 minutes
Depends on: [lint, type-check, test]
Steps:
  - Checkout code
  - Setup Node.js 20
  - Install dependencies
  - Build application (npm run build)
  - Upload dist artifacts
Environment:
  - VITE_SUPABASE_URL (from secrets)
  - VITE_SUPABASE_ANON_KEY (from secrets)
```

**When it fails:**
- Build errors
- Missing environment variables
- Import/export issues
- Asset loading errors

**How to fix:**
```bash
# Run locally
npm run build

# Preview build
npm run preview
```

#### 6. Deploy Check Job

```yaml
Purpose: Verify deployment readiness
Runtime: ubuntu-latest
Depends on: [build, e2e]
Condition: Only on main branch
Steps:
  - Checkout code
  - Display deployment ready message
```

**When it fails:**
- Build job failed
- E2E tests failed

---

## Deployment Platforms

### Vercel (Web Deployment)

**Configuration File:** `vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

#### How Vercel Deploys

**Pull Request Deployments:**
1. PR created/updated → Vercel detects change
2. Runs `npm run build` with preview environment variables
3. Deploys to preview URL: `prayermap-<branch>-<hash>.vercel.app`
4. Posts comment on PR with preview URL
5. Auto-updates on each commit to PR

**Production Deployments:**
1. Merge to main → Vercel detects change
2. Runs `npm run build` with production environment variables
3. Deploys to production: `prayermap.net`
4. Automatic rollback if deployment fails
5. Zero-downtime deployment

#### Vercel Environment Variables

**Required for Production:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_MAPBOX_TOKEN` - MapBox access token
- `VITE_APP_ENV` - Set to "production"

**How to set:**
1. Go to Vercel dashboard
2. Select PrayerMap project
3. Settings → Environment Variables
4. Add each variable for Production environment

#### Vercel Deployment URL Structure

```
Production:     https://prayermap.net
                https://prayermap.vercel.app (alternative)

Preview:        https://prayermap-git-<branch>.vercel.app
                https://prayermap-<hash>.vercel.app

Local Preview:  http://localhost:4173 (npm run preview)
```

### iOS (App Store Connect)

**Manual Deployment Process:**

1. **Build iOS app locally** (requires macOS)
   ```bash
   npm run build -- --mode production
   npm run ios:sync
   npm run ios:open
   ```

2. **Archive in Xcode**
   - Product → Archive
   - Wait for archive to complete
   - Organizer window opens

3. **Upload to App Store Connect**
   - Click "Distribute App"
   - Select "App Store Connect"
   - Upload
   - Wait for processing (10-60 minutes)

4. **Submit for TestFlight** (Beta)
   - Open App Store Connect
   - TestFlight tab
   - Select build
   - Add to testers
   - Provide test information

5. **Submit for Production**
   - App Store Connect → App Store tab
   - Create new version
   - Select build
   - Fill in release notes
   - Submit for review
   - Wait for approval (1-3 days typical)

**Automation Note:** iOS builds can be automated with Fastlane + GitHub Actions (future enhancement).

### Android (Google Play Console)

**Manual Deployment Process:**

1. **Build Android AAB** (on any OS)
   ```bash
   npm run build -- --mode production
   npm run android:sync
   npm run android:build:aab
   ```

2. **Upload to Play Console**
   - Go to Google Play Console
   - Select PrayerMap app
   - Release → Production (or Internal Testing)
   - Create new release
   - Upload AAB from `android/app/build/outputs/bundle/release/app-release.aab`

3. **Configure Release**
   - Add release notes
   - Review app details
   - Choose rollout percentage (staged rollout recommended)
   - Submit for review

4. **Monitor Release**
   - Check for crashes (Play Console → Vitals)
   - Monitor reviews
   - Increase rollout percentage if stable

**See Also:** `ANDROID_RELEASE_CHECKLIST.md` for complete checklist.

**Automation Note:** Android builds CAN be automated with GitHub Actions (see CI/CD recommendations in `ANDROID_INTEGRATION_SUMMARY.md`).

---

## Required Secrets

### GitHub Repository Secrets

**Location:** GitHub Repository → Settings → Secrets and variables → Actions

#### Production Secrets

| Secret Name | Description | Required | Where to Get |
|-------------|-------------|----------|--------------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes | Supabase Dashboard → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes | Supabase Dashboard → Project Settings → API |
| `VITE_MAPBOX_ACCESS_TOKEN` | MapBox token | Optional | MapBox Account → Access Tokens |
| `CODECOV_TOKEN` | Codecov upload token | Optional | Codecov.io → Repository Settings |

#### How to Add Secrets

1. Go to GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: Enter secret name (e.g., `VITE_SUPABASE_URL`)
5. Value: Paste secret value
6. Click "Add secret"

**Security Notes:**
- Never commit secrets to code
- Use `.env.local` for local development (gitignored)
- Rotate secrets periodically
- Use different values for staging/production

### Vercel Environment Variables

**Location:** Vercel Dashboard → Project → Settings → Environment Variables

#### Required Variables

| Variable Name | Environment | Value Source |
|---------------|-------------|--------------|
| `VITE_SUPABASE_URL` | Production, Preview | Supabase production project |
| `VITE_SUPABASE_ANON_KEY` | Production, Preview | Supabase production anon key |
| `VITE_MAPBOX_TOKEN` | Production, Preview | MapBox production token |
| `VITE_APP_ENV` | Production | `production` |
| `VITE_APP_ENV` | Preview | `preview` |

#### How to Add Variables

1. Go to Vercel dashboard
2. Select PrayerMap project
3. Settings → Environment Variables
4. Click "Add"
5. Key: Enter variable name
6. Value: Enter variable value
7. Environment: Select Production, Preview, or both
8. Click "Save"

**Note:** Vercel automatically rebuilds when environment variables change.

### Android Signing Secrets

**Location:** Local filesystem (never commit!)

**File:** `android/keystore.properties` (gitignored)

```properties
storeFile=/absolute/path/to/android/keystore/prayermap-release.keystore
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=prayermap-release
keyPassword=YOUR_KEY_PASSWORD
```

**Critical:**
- Store keystore file in 3+ secure locations
- Use password manager for passwords
- Never commit to git
- Backup regularly
- Test keystore after creation

**See Also:** `docs/ANDROID_RELEASE_CHECKLIST.md`

---

## Monitoring Builds

### GitHub Actions Dashboard

**Access:** GitHub Repository → Actions tab

#### Viewing Workflow Runs

1. Go to Actions tab
2. See list of all workflow runs
3. Filter by:
   - Branch
   - Event (push, pull_request)
   - Status (success, failure, in_progress)
   - Workflow (CI)

#### Viewing Job Details

1. Click on workflow run
2. See all jobs (lint, type-check, test, etc.)
3. Click on job to see steps
4. Click on step to see logs
5. Download artifacts at bottom

#### Re-running Workflows

**Re-run failed jobs:**
1. Click on failed workflow run
2. Click "Re-run failed jobs"

**Re-run all jobs:**
1. Click on workflow run
2. Click "Re-run all jobs"

**Manual trigger:** (if configured)
1. Actions tab
2. Select workflow
3. Click "Run workflow"
4. Select branch
5. Click "Run workflow"

### Vercel Dashboard

**Access:** https://vercel.com/dashboard

#### Viewing Deployments

1. Select PrayerMap project
2. See list of deployments
3. Each deployment shows:
   - Status (Ready, Building, Error)
   - Branch
   - Commit message
   - Deploy time
   - Domain

#### Viewing Build Logs

1. Click on deployment
2. See build logs
3. See function logs
4. See deployment summary

#### Viewing Analytics

1. Project → Analytics
2. See metrics:
   - Page views
   - Unique visitors
   - Top pages
   - Performance metrics

### Codecov (Optional)

**Access:** https://codecov.io

**What it tracks:**
- Code coverage percentage
- Coverage diff on PRs
- Untested lines
- Coverage trends

**How to view:**
1. Go to codecov.io
2. Select PrayerMap repository
3. View coverage report
4. Click on files to see line-by-line coverage

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Workflow Not Triggering

**Symptom:** Push to main/PR doesn't trigger CI workflow

**Possible Causes:**
- Workflow file has syntax errors
- Branch name doesn't match trigger
- Workflow disabled in Actions settings

**Solutions:**
```bash
# Check workflow syntax
cat .github/workflows/ci.yml

# Verify branch name
git branch

# Check GitHub Actions settings
# Repo → Settings → Actions → General → Actions permissions
```

#### 2. ESLint Failures

**Symptom:** Lint job fails with code style errors

**Solutions:**
```bash
# Run locally
npm run lint

# Auto-fix
npm run lint -- --fix

# Check specific file
npm run lint src/components/PrayerCard.tsx
```

**Common issues:**
- Unused imports → Remove them
- Console.log statements → Remove or use proper logging
- Missing semicolons → Auto-fix or add manually
- Incorrect indentation → Auto-fix

#### 3. TypeScript Errors

**Symptom:** Type check job fails

**Solutions:**
```bash
# Run locally
npx tsc --noEmit

# Common fixes:
# - Add type annotations
# - Fix import paths
# - Update interface definitions
# - Add null checks
```

**Example fixes:**
```typescript
// Before (error: implicit any)
function greet(name) {
  return `Hello ${name}`;
}

// After (fixed)
function greet(name: string): string {
  return `Hello ${name}`;
}
```

#### 4. Test Failures

**Symptom:** Unit test job fails

**Solutions:**
```bash
# Run locally
npm run test

# Run specific test
npm run test PrayerCard.test.tsx

# Watch mode (for debugging)
npm run test:watch

# Check coverage
npm run test:coverage
```

**Common issues:**
- Mock data outdated → Update test data
- Component props changed → Update test props
- API response changed → Update mocks
- Async timing issues → Add proper waits

#### 5. E2E Test Failures

**Symptom:** Playwright tests fail in CI

**Solutions:**
```bash
# Run locally
npm run test:e2e

# Debug mode
npm run test:e2e:debug

# UI mode
npm run test:e2e:ui

# Generate report
npm run test:e2e:report
```

**Common issues:**
- Timeout waiting for element → Increase timeout or fix selector
- Element not found → Update selector
- API not responding → Check Supabase credentials in secrets
- Network issues → Add retry logic

**CI-specific issues:**
- Headless mode differences → Test in headless locally
- Font rendering → Use approximations, not pixel-perfect
- Timing differences → Use waitFor helpers

#### 6. Build Failures

**Symptom:** Build job fails

**Solutions:**
```bash
# Run locally
npm run build

# Check environment variables
cat .env.local

# Verify all imports resolve
npx tsc --noEmit

# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

**Common issues:**
- Missing environment variables → Add to GitHub secrets
- Import errors → Check file paths
- Circular dependencies → Refactor imports
- Asset loading issues → Check public directory

#### 7. Vercel Deployment Failures

**Symptom:** Vercel build fails or deployment stuck

**Solutions:**

**In Vercel Dashboard:**
1. Check build logs
2. Verify environment variables
3. Check build command is correct
4. Verify output directory is "dist"

**Common fixes:**
- Add missing environment variables
- Increase serverless function timeout
- Clear Vercel cache and redeploy
- Check for Vercel-specific build issues

**Redeploy:**
1. Vercel Dashboard → Deployments
2. Click on failed deployment
3. Click "Redeploy"

#### 8. Missing Secrets

**Symptom:** Build fails with "undefined" environment variables

**Solutions:**
1. Check GitHub secrets exist
2. Check secret names match exactly (case-sensitive)
3. Verify secrets are available to workflow
4. Check environment context in workflow

**Verify secrets:**
```yaml
# In workflow file, add debug step (temporary):
- name: Debug
  run: |
    echo "VITE_SUPABASE_URL is set: ${{ secrets.VITE_SUPABASE_URL != '' }}"
```

#### 9. Slow Build Times

**Symptom:** CI taking too long (>15 minutes)

**Solutions:**

**For CI:**
- Use npm ci instead of npm install ✅ (already done)
- Cache dependencies ✅ (already done with `cache: 'npm'`)
- Run jobs in parallel ✅ (already done)
- Install only chromium for Playwright ✅ (already done)

**To improve further:**
- Skip optional dependencies
- Use faster test runner
- Reduce test count (but maintain coverage)

#### 10. Artifact Upload Failures

**Symptom:** Test results or coverage not uploaded

**Solutions:**
- Check file paths are correct
- Verify files exist before upload
- Check artifact retention settings
- Increase timeout for large artifacts

**Debug:**
```yaml
- name: List files before upload
  run: |
    ls -la coverage/
    ls -la playwright-report/
```

---

## Deployment Runbook

### Pre-Deployment Checklist

**Before every deployment to production:**

#### Code Quality
- [ ] All tests passing locally
  ```bash
  npm run test
  npm run test:e2e
  ```
- [ ] Linting passes
  ```bash
  npm run lint
  ```
- [ ] Type check passes
  ```bash
  npx tsc --noEmit
  ```
- [ ] Build succeeds
  ```bash
  npm run build
  npm run preview
  ```

#### Code Review
- [ ] Pull request created
- [ ] Code reviewed by at least one team member
- [ ] All review comments addressed
- [ ] No merge conflicts
- [ ] Branch up to date with main

#### Documentation
- [ ] CHANGELOG.md updated
- [ ] API changes documented
- [ ] Breaking changes noted
- [ ] Migration guide written (if needed)

#### Testing
- [ ] Manual testing completed
- [ ] Mobile tested (iOS and Android if changes affect mobile)
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Accessibility tested
- [ ] Performance tested (Lighthouse)

#### Configuration
- [ ] Environment variables correct
- [ ] Feature flags set appropriately
- [ ] Database migrations ready (if needed)
- [ ] API changes backward compatible

---

### Deployment Steps

#### Web Deployment (Automatic via Vercel)

**Trigger:** Merge to main branch

**Steps:**
1. **Create and approve PR**
   ```bash
   git checkout -b feature/my-feature
   # Make changes
   git add .
   git commit -m "feat: add new feature"
   git push origin feature/my-feature
   ```
   - Create PR on GitHub
   - Wait for CI to pass
   - Get code review approval
   - Merge PR

2. **Automatic deployment**
   - Vercel detects merge to main
   - Runs build with production environment variables
   - Deploys to prayermap.net
   - Typically completes in 2-3 minutes

3. **Monitor deployment**
   - Check Vercel dashboard for status
   - Verify deployment is "Ready"
   - Check build logs for warnings

**Rollback if needed:** See "Rollback Procedures" below.

#### Android Deployment (Manual)

**See:** `docs/ANDROID_RELEASE_CHECKLIST.md` for complete checklist.

**Quick steps:**
1. Update version in `android/app/build.gradle`
2. Build production web app
   ```bash
   npm run build -- --mode production
   ```
3. Sync to Android
   ```bash
   npm run android:sync
   ```
4. Build release AAB
   ```bash
   npm run android:build:aab
   ```
5. Upload to Play Console
6. Configure release notes
7. Submit for review or internal testing

**Timeline:**
- Build: ~5 minutes
- Upload: ~2 minutes
- Review: 1-7 days (varies)

#### iOS Deployment (Manual)

**Requires:** macOS with Xcode

**Quick steps:**
1. Update version in Xcode project
2. Build production web app
   ```bash
   npm run build -- --mode production
   ```
3. Sync to iOS
   ```bash
   npm run ios:sync
   ```
4. Open in Xcode
   ```bash
   npm run ios:open
   ```
5. Archive build (Product → Archive)
6. Upload to App Store Connect
7. Submit for TestFlight or App Store review

**Timeline:**
- Build: ~10 minutes
- Upload: ~10-60 minutes (processing)
- Review: 1-3 days (typical)

---

### Post-Deployment Verification

**Immediately after deployment:**

#### Web Verification (5 minutes)
- [ ] Visit https://prayermap.net
- [ ] Verify app loads without errors
- [ ] Check browser console for errors
- [ ] Test critical user flows:
  - [ ] View prayers on map
  - [ ] Click prayer marker
  - [ ] Submit prayer (if authenticated)
  - [ ] View prayer details
- [ ] Check mobile responsiveness
- [ ] Verify environment is "production"
  ```javascript
  // In browser console
  console.log(import.meta.env.VITE_APP_ENV)
  // Should output: "production"
  ```

#### Performance Verification (10 minutes)
- [ ] Run Lighthouse audit
  - Open Chrome DevTools
  - Lighthouse tab
  - Generate report
  - Verify scores:
    - Performance: >90
    - Accessibility: >90
    - Best Practices: >90
    - SEO: >90
- [ ] Check Core Web Vitals
  - LCP (Largest Contentful Paint): <2.5s
  - FID (First Input Delay): <100ms
  - CLS (Cumulative Layout Shift): <0.1

#### API Verification (5 minutes)
- [ ] Test Supabase connection
- [ ] Verify prayers load from database
- [ ] Test authentication flow
- [ ] Verify map loads correctly
- [ ] Check image uploads work

#### Error Monitoring (30 minutes)
- [ ] Check Vercel logs for errors
- [ ] Monitor Supabase logs
- [ ] Check browser error reporting (if configured)
- [ ] Verify no 500 errors
- [ ] Check for console warnings

#### User Testing (1 hour)
- [ ] Have team members test
- [ ] Monitor user feedback channels
- [ ] Check for bug reports
- [ ] Verify no user complaints

---

### Rollback Procedures

#### Web Rollback (Vercel)

**If critical bug discovered after deployment:**

**Option 1: Instant Rollback (2 minutes)**
1. Go to Vercel Dashboard
2. Deployments tab
3. Find last known good deployment
4. Click "..." menu
5. Select "Promote to Production"
6. Confirm
7. Previous version is now live

**Option 2: Revert Commit (5 minutes)**
```bash
# Find commit hash of last good version
git log

# Revert the problematic commit
git revert <bad-commit-hash>

# Push to main
git push origin main

# Vercel auto-deploys reverted version
```

**Option 3: Deploy Previous Release (10 minutes)**
```bash
# Create hotfix branch from previous release
git checkout <last-good-commit>
git checkout -b hotfix/rollback

# Push to trigger deployment
git push origin hotfix/rollback

# Merge to main
# Create PR and merge
```

#### Android Rollback (Play Console)

**Option 1: Halt Rollout**
1. Play Console → Release → Production
2. Click "Halt rollout"
3. Stops deployment to more users
4. Currently deployed users keep current version

**Option 2: Release Previous Version**
1. Play Console → Release → Production
2. Create new release
3. Select previous APK/AAB
4. Submit for review
5. Once approved, replaces bad version

**Note:** Cannot instantly rollback Android. Users with bad version stay on it until they update.

#### iOS Rollback (App Store Connect)

**Option 1: Remove from Sale** (Extreme)
1. App Store Connect
2. App Store tab
3. Remove App from Sale
4. Users cannot download, existing users keep current version

**Option 2: Submit Previous Version**
1. Create new version
2. Use previous build
3. Submit for expedited review
4. Explain critical bug to Apple
5. Hope for fast approval (1-2 days)

**Note:** iOS rollback is difficult. Prevention is key!

---

### Emergency Procedures

#### Critical Production Bug

**Severity: High** (app crashes, data loss, security issue)

**Immediate Actions (< 5 minutes):**
1. **Assess impact**
   - How many users affected?
   - What functionality broken?
   - Is data at risk?

2. **Communicate**
   - Alert team immediately
   - Post status update (if public-facing)
   - Notify stakeholders

3. **Rollback** (if possible)
   - Web: Instant rollback via Vercel
   - Mobile: Halt rollout if just released

4. **Fix**
   - Create hotfix branch
   - Implement minimum viable fix
   - Test thoroughly
   - Deploy ASAP

**Example workflow:**
```bash
# Create hotfix branch from production
git checkout main
git pull
git checkout -b hotfix/critical-bug-fix

# Make fix
# ... edit files ...

# Test fix
npm run test
npm run build
npm run preview

# Commit and push
git add .
git commit -m "fix: critical bug causing app crash"
git push origin hotfix/critical-bug-fix

# Create PR, get emergency review, merge
# Vercel auto-deploys

# Verify fix
# Monitor for 30 minutes
```

#### Database Migration Failure

**Severity: Critical** (app cannot connect to database)

**Immediate Actions:**
1. Check Supabase status
2. Review migration logs
3. Rollback migration if possible
4. Contact Supabase support if needed

**Prevention:**
- Always test migrations on staging first
- Have rollback SQL ready
- Never run migrations during peak hours

#### API Rate Limiting

**Severity: Medium** (users experiencing slow performance)

**Immediate Actions:**
1. Check API usage in Supabase dashboard
2. Check MapBox usage
3. Verify not under DDoS attack
4. Temporarily reduce non-critical API calls
5. Contact vendor support to increase limits

**Prevention:**
- Monitor API usage trends
- Set up usage alerts
- Cache aggressively
- Implement request throttling

---

## Quick Reference

### Useful Commands

#### Local Development
```bash
# Start dev server
npm run dev

# Run tests
npm run test               # Unit tests
npm run test:e2e           # E2E tests
npm run test:coverage      # With coverage

# Code quality
npm run lint               # Check linting
npm run lint -- --fix      # Auto-fix linting
npx tsc --noEmit          # Type check

# Build
npm run build              # Production build
npm run preview            # Preview build locally
```

#### Mobile Commands
```bash
# Android
npm run android:sync       # Sync web to Android
npm run android:open       # Open Android Studio
npm run android:build:aab  # Build release AAB

# iOS
npm run ios:sync          # Sync web to iOS
npm run ios:open          # Open Xcode

# Both
npm run sync:all          # Sync both platforms
```

#### Git Workflow
```bash
# Create feature branch
git checkout -b feature/my-feature

# Commit changes
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/my-feature

# After PR merged, update local main
git checkout main
git pull origin main
```

#### Troubleshooting
```bash
# Clear everything and reinstall
rm -rf node_modules dist coverage .next
npm install

# Check for outdated packages
npm outdated

# Update packages (careful!)
npm update

# Clear cache
npm cache clean --force
```

### Important URLs

| Resource | URL |
|----------|-----|
| Production Site | https://prayermap.net |
| Vercel Dashboard | https://vercel.com/dashboard |
| GitHub Actions | https://github.com/YOUR_ORG/prayermap/actions |
| Supabase Dashboard | https://supabase.com/dashboard |
| Google Play Console | https://play.google.com/console |
| App Store Connect | https://appstoreconnect.apple.com |
| Codecov | https://codecov.io/gh/YOUR_ORG/prayermap |

### Key Files

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | CI workflow definition |
| `vercel.json` | Vercel deployment config |
| `package.json` | Scripts and dependencies |
| `capacitor.config.ts` | Mobile app config |
| `.env.example` | Environment variable template |
| `CHANGELOG.md` | Release history |
| `docs/ANDROID_RELEASE_CHECKLIST.md` | Android deployment checklist |

### Environment Variables Quick Reference

```bash
# Development (.env.local)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_MAPBOX_TOKEN=pk.your-token
VITE_APP_ENV=development

# Production (GitHub Secrets + Vercel)
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=prod-anon-key
VITE_MAPBOX_TOKEN=pk.prod-token
VITE_APP_ENV=production

# Optional
OPENAI_API_KEY=sk-your-key
PINECONE_API_KEY=your-key
CODECOV_TOKEN=your-token
```

### GitHub Actions Status Badges

Add to README.md:

```markdown
![CI Status](https://github.com/YOUR_ORG/prayermap/actions/workflows/ci.yml/badge.svg)
[![codecov](https://codecov.io/gh/YOUR_ORG/prayermap/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_ORG/prayermap)
```

---

## Best Practices

### CI/CD Best Practices

1. **Always run CI locally before pushing**
   ```bash
   npm run lint && npx tsc --noEmit && npm run test && npm run build
   ```

2. **Keep secrets secure**
   - Never commit secrets
   - Rotate secrets regularly
   - Use different secrets for staging/production

3. **Monitor deployments**
   - Check Vercel dashboard after each deploy
   - Review build logs for warnings
   - Monitor error tracking

4. **Test before merging**
   - All CI checks must pass
   - Manual testing on preview URL
   - Code review approval required

5. **Use semantic commit messages**
   ```
   feat: add new feature
   fix: resolve bug
   docs: update documentation
   refactor: improve code structure
   test: add tests
   chore: update dependencies
   ```

6. **Keep main branch stable**
   - Never push directly to main
   - Always use pull requests
   - Require CI to pass before merge
   - Squash commits if needed

7. **Version control**
   - Tag releases with semantic versioning
   - Update CHANGELOG.md
   - Keep mobile versions in sync

### Mobile Deployment Best Practices

1. **Test thoroughly before release**
   - Use internal testing track
   - Test on multiple devices
   - Verify all permissions work

2. **Staged rollouts**
   - Start at 10% of users
   - Monitor for crashes
   - Increase to 50%, then 100%

3. **Release notes**
   - Clear, user-friendly language
   - Highlight new features
   - Mention bug fixes

4. **Version synchronization**
   - Keep iOS and Android versions aligned
   - Update both platforms together when possible

5. **Backup keystore/certificates**
   - Store in 3+ secure locations
   - Test backup regularly
   - Document passwords in password manager

---

## Future Improvements

### Recommended Enhancements

#### Automated Mobile Builds
- GitHub Actions workflow for Android builds
- Fastlane for iOS builds
- Automated uploads to Play Console and App Store Connect

#### Enhanced Monitoring
- Error tracking (Sentry, Bugsnag)
- Performance monitoring (Vercel Analytics, Lighthouse CI)
- User analytics (PostHog, Mixpanel)

#### Advanced Testing
- Visual regression testing (Percy, Chromatic)
- Performance testing (Lighthouse CI)
- Load testing (k6, Artillery)

#### Deployment Improvements
- Staging environment
- Canary deployments
- Automatic rollback on errors
- Deploy previews for mobile

#### Documentation
- Architecture Decision Records (ADRs)
- Deployment history tracking
- Incident response playbook

---

## Support and Resources

### Getting Help

**CI/CD Issues:**
- Check this guide first
- Review GitHub Actions logs
- Check Vercel build logs
- Search GitHub Discussions

**Documentation:**
- This guide: `docs/CICD_GUIDE.md`
- Android deployment: `docs/ANDROID_RELEASE_CHECKLIST.md`
- Android integration: `docs/ANDROID_INTEGRATION_SUMMARY.md`
- Main project docs: `CLAUDE.md`, `ARTICLE.md`

**External Resources:**
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Documentation](https://vercel.com/docs)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Playwright Documentation](https://playwright.dev)

---

## Summary

### What's Working

✅ **Automated CI** - Every push is tested
✅ **Automated Web Deployment** - Merges to main auto-deploy
✅ **Preview Deployments** - Every PR gets preview URL
✅ **Quality Gates** - Lint, type-check, tests, build
✅ **Artifact Storage** - Test results and coverage saved
✅ **Mobile Build Scripts** - One-command builds for iOS/Android

### What's Manual

⏱️ **Mobile Deployments** - Manual upload to app stores
⏱️ **Mobile Testing** - Manual testing on devices
⏱️ **Release Notes** - Manual writing for each release

### Quick Win Checklist

For every deployment:
- [ ] CI passes ✅
- [ ] Code reviewed ✅
- [ ] Preview URL tested ✅
- [ ] Merge to main
- [ ] Vercel auto-deploys
- [ ] Verify production
- [ ] Monitor for 30 minutes
- [ ] Update CHANGELOG

---

**CI/CD is working! Follow this guide for consistent, reliable deployments.** 🚀

*Last Updated: 2025-11-29*
*PrayerMap - "See where prayer is needed. Send prayer where you are."*
