# CI/CD Pipeline Setup Guide

## Overview

This document describes the GitHub Actions CI/CD pipeline for PrayerMap web application.

## Pipeline Architecture

The CI pipeline runs on:
- **Push to main branch**: Full CI + deployment check
- **Pull requests to main**: Full CI (lint, type-check, test, build, e2e)

### Job Flow

```
┌─────────────────────────────────────────────┐
│          Triggered on Push/PR               │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │  Parallel Jobs    │
        │  (Independent)    │
        └─────────┬─────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼───┐   ┌────▼────┐   ┌───▼────┐
│ Lint  │   │  Type   │   │  Unit  │
│       │   │  Check  │   │  Tests │
└───┬───┘   └────┬────┘   └───┬────┘
    │             │            │
    └─────────────┼────────────┘
                  │
            ┌─────▼─────┐
            │   Build   │
            └─────┬─────┘
                  │
            ┌─────▼─────┐
            │  Deploy   │
            │   Check   │
            │ (main only)│
            └───────────┘
```

**Note**: E2E tests run in parallel in a separate workflow (`e2e.yml`)

### Parallelization

The following jobs run in parallel to optimize CI time:
- **Lint**: ESLint checks (~2-3 min)
- **Type Check**: TypeScript validation (~2-3 min)
- **Unit Tests**: Vitest with coverage (~3-5 min)

**Total CI Time**: ~5-8 minutes (vs ~12-15 min if sequential)
**E2E Time**: ~30-60 minutes (runs in parallel in separate workflow)

## Jobs Breakdown

### 1. Lint Job
- **Purpose**: Code quality and style enforcement
- **Runs**: `npm run lint`
- **Timeout**: 10 minutes
- **Fails on**: ESLint errors or warnings

### 2. Type Check Job
- **Purpose**: TypeScript type safety validation
- **Runs**: `npx tsc --noEmit`
- **Timeout**: 10 minutes
- **Fails on**: Type errors

### 3. Unit Tests Job
- **Purpose**: Run Vitest unit tests with coverage
- **Runs**: `npm run test:ci`
- **Timeout**: 15 minutes
- **Outputs**:
  - JUnit test results (`test-results.xml`)
  - Coverage reports (JSON, HTML, LCOV)
- **Uploads to**: Codecov (if token configured)
- **Artifacts**: Retained for 30 days

### 4. Build Job
- **Purpose**: Verify production build succeeds
- **Runs**: `npm run build`
- **Depends on**: Lint, Type Check, and Unit Tests passing
- **Timeout**: 15 minutes
- **Artifacts**: `dist/` folder (7 days retention)

### 5. Deploy Check Job
- **Purpose**: Confirm readiness for Vercel deployment
- **Runs on**: Main branch only
- **Depends on**: Build passing
- **Purpose**: Final gate before Vercel auto-deploy

## E2E Tests

**Note**: E2E (End-to-End) tests run in a separate workflow: `.github/workflows/e2e.yml`

The E2E workflow:
- Runs on push to main/develop and PRs
- Tests across multiple browsers (Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari)
- Runs nightly at 2 AM UTC
- Provides comprehensive visual regression testing
- See `e2e.yml` for full details

## Required Secrets

Configure these in GitHub Settings > Secrets and variables > Actions:

### Required for Build & E2E Tests

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**How to add:**
1. Go to repository Settings
2. Secrets and variables > Actions
3. Click "New repository secret"
4. Add each secret with exact name

### Optional for Coverage Reporting

```bash
CODECOV_TOKEN=your-codecov-token-here
```

**How to get Codecov token:**
1. Sign up at [codecov.io](https://codecov.io)
2. Link your GitHub repository
3. Copy the upload token
4. Add as `CODECOV_TOKEN` secret in GitHub

## Artifacts

The CI pipeline produces the following artifacts:

| Artifact | Job | Retention | Purpose |
|----------|-----|-----------|---------|
| `test-results` | Unit Tests | 30 days | JUnit XML for test reporting |
| `coverage` | Unit Tests | 30 days | Coverage reports (HTML, JSON, LCOV) |
| `dist` | Build | 7 days | Production build artifacts |

**Note**: E2E test artifacts (Playwright reports, screenshots, videos, traces) are available in the `e2e.yml` workflow runs.

**Access artifacts:**
1. Go to Actions tab
2. Click on a workflow run
3. Scroll to "Artifacts" section
4. Download ZIP files

## Performance Optimizations

### Caching Strategy

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'  # ← Caches node_modules based on package-lock.json
```

**Cache hit rate**: ~90% on repeated runs
**Time saved**: 1-2 minutes per job

### Concurrency Control

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

**Benefit**: Cancels old runs when new commits pushed to same PR
**Saves**: GitHub Actions minutes and reduces queue time

### Parallel Execution

Independent jobs run simultaneously:
- Lint + Type Check + Unit Tests = **Parallel**
- Build waits for all three = **Sequential**

## Troubleshooting

### Common Issues

#### 1. Lint Failures
```bash
# Run locally to see exact errors
npm run lint

# Auto-fix many issues
npm run lint -- --fix
```

#### 2. Type Check Failures
```bash
# Run locally
npx tsc --noEmit

# Common fixes:
# - Add missing type imports
# - Fix any type usage
# - Update TypeScript version if needed
```

#### 3. Test Failures
```bash
# Run tests locally with same config
npm run test:ci

# Debug specific test
npm run test -- <test-file-path>
```

#### 4. Build Failures
```bash
# Ensure environment variables are set locally
cp .env.example .env
# Fill in values

# Run build locally
npm run build
```

### Viewing Logs

**In GitHub Actions UI:**
1. Click on failed job
2. Expand the failed step
3. Review error messages
4. Download logs if needed (top-right corner)

## Local Validation

Before pushing, run these commands locally to catch issues:

```bash
# Install dependencies (if not done)
npm ci

# Run all checks that CI runs
npm run lint
npx tsc --noEmit
npm run test:ci
npm run build
```

**Optional E2E tests** (runs in separate workflow):
```bash
npm run test:e2e
```

**Pro tip**: Create a git pre-push hook to run these automatically:
```bash
#!/bin/bash
# .git/hooks/pre-push
set -e
npm run lint
npx tsc --noEmit
npm run test:ci
npm run build
echo "✅ All CI checks passed locally!"
```

## CI Badge Status

Once the workflow runs successfully, add badges to README.md:

```markdown
![CI](https://github.com/YOUR_USERNAME/prayermap/workflows/CI/badge.svg)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/prayermap/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/prayermap)
```

See `.github/STATUS_BADGES.md` for more badge options.

## Integration with Vercel

While Vercel handles actual deployment, this CI pipeline:

1. ✅ Validates code quality before merge
2. ✅ Ensures tests pass
3. ✅ Verifies build succeeds
4. ✅ Runs E2E tests
5. ✅ Provides deployment confidence

**Vercel will still:**
- Deploy preview builds on PRs
- Deploy production on main branch merges
- Run its own build step

**Best practice**: Only merge PRs when CI is green ✅

## Monitoring & Maintenance

### Weekly Checklist
- [ ] Review failed builds and fix root causes
- [ ] Check artifact storage usage
- [ ] Review test coverage trends
- [ ] Update dependencies if needed

### Monthly Checklist
- [ ] Review GitHub Actions usage (minutes consumed)
- [ ] Optimize slow jobs if needed
- [ ] Update Node.js version if new LTS available
- [ ] Review and update workflow as project evolves

## Future Enhancements

Possible additions to the CI pipeline:

- [ ] **Lighthouse CI**: Performance budgets for web vitals
- [ ] **Bundle size tracking**: Alert on significant increases
- [ ] **Visual regression testing**: Percy or Chromatic integration
- [ ] **Security scanning**: Snyk or Dependabot for vulnerabilities
- [ ] **Automated dependency updates**: Dependabot PRs
- [ ] **Slack notifications**: On build failures
- [ ] **Deploy previews comments**: Bot commenting on PRs

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vitest CI Documentation](https://vitest.dev/guide/ci.html)
- [Playwright CI Documentation](https://playwright.dev/docs/ci)
- [Codecov Documentation](https://docs.codecov.com/docs)
- [Vercel + GitHub Integration](https://vercel.com/docs/concepts/git/vercel-for-github)

---

**Questions or issues?** Open a GitHub issue or contact the development team.
