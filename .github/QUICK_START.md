# GitHub Actions CI - Quick Start

## 🚀 Setup in 5 Minutes

### Step 1: Add GitHub Secrets (2 min)

1. Go to your repository on GitHub
2. Click **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Add these secrets:

```
Name: VITE_SUPABASE_URL
Value: https://your-project.supabase.co

Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-key-here
```

5. **(Optional)** Add Codecov token for coverage reporting:
```
Name: CODECOV_TOKEN
Value: your-codecov-token
```

### Step 2: Push to GitHub (1 min)

```bash
git add .github/
git commit -m "ci: Add GitHub Actions CI/CD pipeline"
git push origin main
```

### Step 3: Verify CI Run (2 min)

1. Go to **Actions** tab in GitHub
2. You should see a "CI" workflow running
3. Click on it to see progress
4. All jobs should pass ✅

## ✅ Expected Results

After setup, every push and PR will automatically:

- ✅ Lint code with ESLint
- ✅ Type check with TypeScript
- ✅ Run unit tests with coverage
- ✅ Build production bundle
- ✅ Upload coverage to Codecov (if configured)

**Plus** (in separate workflows):
- ✅ E2E tests across 5 browsers (via `e2e.yml`)
- ✅ Security scanning (via `security.yml`)
- ✅ Android builds (via `android-build.yml`)

## 📊 Add Status Badges

Add this to your `README.md` (near the top):

```markdown
## Status

![CI](https://github.com/YOUR_USERNAME/prayermap/workflows/CI/badge.svg)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/prayermap/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/prayermap)
```

Replace `YOUR_USERNAME` with your GitHub username.

## 🔍 Troubleshooting

### CI Fails Immediately

**Problem**: Missing secrets
**Solution**: Verify secrets are added correctly (Settings > Secrets)

### Tests Pass Locally But Fail in CI

**Problem**: Environment differences
**Solution**: Check the CI logs to see exact error. Common causes:
- Missing environment variables
- Different Node.js version
- Race conditions in tests

### Build Takes Too Long

**Problem**: No caching or slow tests
**Solution**: The workflow already uses caching. If still slow:
- Review which tests are taking longest
- Consider running E2E tests only on main branch

### E2E Tests Issues

**Note**: E2E tests run in a separate workflow (`e2e.yml`)

**Problem**: E2E tests failing
**Solution**:
- Check the E2E workflow runs (separate from CI)
- Review artifacts: screenshots, videos, traces
- See `.github/workflows/e2e.yml` for details

## 📚 Full Documentation

- **CI Setup Guide**: `.github/CI_SETUP.md` - Complete pipeline documentation
- **Status Badges**: `.github/STATUS_BADGES.md` - Badge options
- **Workflow File**: `.github/workflows/ci.yml` - The actual pipeline

## 🎯 Next Steps

1. ✅ Set up secrets (Step 1 above)
2. ✅ Push workflow to GitHub (Step 2 above)
3. ✅ Verify first CI run passes
4. ✅ Add status badges to README
5. ✅ Configure branch protection rules (optional but recommended)

### Branch Protection Rules (Recommended)

1. Go to **Settings** > **Branches**
2. Click **Add branch protection rule**
3. Branch name pattern: `main`
4. Check these options:
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Status checks: Select "lint", "type-check", "test", "build"
   - ✅ (Optional) Also require "E2E Tests - chromium" from e2e.yml workflow
   - ✅ Require linear history
5. Click **Create**

Now, PRs cannot be merged unless CI passes! 🎉

## 💡 Pro Tips

**Run checks locally before pushing:**
```bash
npm run lint
npx tsc --noEmit
npm run test:ci
npm run build
```

**Create a pre-push git hook:**
```bash
# .git/hooks/pre-push
#!/bin/bash
npm run lint && npm run test:ci && npm run build
```

**Watch the Actions tab:**
- First few runs might take longer (building cache)
- Subsequent runs will be faster (~5-8 min total)

---

**Need help?** Check the full documentation in `.github/CI_SETUP.md`
