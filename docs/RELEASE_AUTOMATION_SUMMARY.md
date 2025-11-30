# Release Automation Summary

## Overview

PrayerMap now has a fully automated release workflow that handles versioning, changelog generation, and artifact distribution. The system follows semantic versioning and uses conventional commits to automatically generate meaningful changelogs.

## What Was Created

### 1. GitHub Actions Workflow (`.github/workflows/release.yml`)

**Triggers:** Push of version tags (v*.*.*)

**What it does:**
1. ✅ Runs full test suite and linting
2. ✅ Builds production web application
3. ✅ Attempts Android APK/AAB builds (non-blocking)
4. ✅ Generates categorized changelog from commits
5. ✅ Creates GitHub Release with artifacts
6. ✅ Updates CHANGELOG.md and commits back to main
7. ✅ Updates package.json version
8. ✅ Sends Slack notification (if webhook configured)

**Artifacts attached:**
- `dist/` folder (web build)
- Android APK (if build succeeds)
- Android AAB (if build succeeds)

### 2. CHANGELOG.md

Initial changelog file following [Keep a Changelog](https://keepachangelog.com/) format.

**Auto-updated on every release** with:
- Version number and date
- Categorized changes (Features, Bug Fixes, Mobile, etc.)
- Commit references for traceability
- Links to compare changes between versions

### 3. Release Documentation

**`docs/RELEASE_PROCESS.md`** - Comprehensive guide covering:
- Versioning strategy (Semantic Versioning)
- Release types (stable, beta, alpha, RC)
- Step-by-step release process
- Automated workflow details
- Platform-specific releases (iOS, Android)
- Commit message guidelines
- Troubleshooting guide
- Complete checklists

**`docs/RELEASE_QUICK_START.md`** - TL;DR version for quick reference

### 4. Interactive Release Script (`scripts/create-release.sh`)

A bash script that guides you through the release process:

**Features:**
- ✅ Checks git status and branch
- ✅ Analyzes commits since last release
- ✅ Counts features, fixes, and breaking changes
- ✅ Suggests next version based on conventional commits
- ✅ Runs tests before creating release
- ✅ Creates and pushes tag
- ✅ Provides feedback and next steps

**Usage:**
```bash
npm run release
# or
./scripts/create-release.sh
```

### 5. Pull Request Template (`.github/pull_request_template.md`)

Reminds contributors to:
- Use conventional commit format in PR titles
- Categorize changes properly
- Run tests before submitting
- Document breaking changes

### 6. Updated package.json

- Version bumped from "0.0.0" to "1.0.0"
- Added `release` script for easy release creation
- Added `release:check` script to view unreleased commits

## Versioning Strategy

### Semantic Versioning (SemVer)

Format: `MAJOR.MINOR.PATCH[-PRERELEASE]`

**Examples:**
- `1.0.0` - Stable release
- `1.1.0` - New features (backward compatible)
- `1.1.1` - Bug fixes
- `2.0.0-alpha.1` - Major version prerelease
- `1.5.0-beta.2` - Minor version beta
- `1.4.1-rc.1` - Release candidate

### Version Bump Rules

Based on [Conventional Commits](https://www.conventionalcommits.org/):

| Commit Type | Version Bump | Example |
|-------------|--------------|---------|
| `feat:` | MINOR (1.1.0 → 1.2.0) | New feature |
| `fix:` | PATCH (1.1.0 → 1.1.1) | Bug fix |
| `BREAKING CHANGE:` | MAJOR (1.1.0 → 2.0.0) | Breaking API change |
| `mobile:`, `refactor:`, `docs:`, `chore:` | No bump | Maintenance |

## How to Create a Release

### Option 1: Interactive Script (Recommended)

```bash
npm run release
```

The script will:
1. Check prerequisites (clean git status, on main branch)
2. Analyze recent commits
3. Suggest next version
4. Run tests
5. Create and push tag
6. Trigger automated workflow

### Option 2: Manual

```bash
# 1. Ensure on main with latest changes
git checkout main
git pull origin main

# 2. Run tests
npm run test:ci && npm run lint

# 3. Create and push tag
git tag v1.2.0 -m "Release 1.2.0"
git push origin v1.2.0

# 4. Monitor workflow
# Visit: https://github.com/YOUR_ORG/prayermap/actions
```

## Changelog Generation

The automated workflow generates changelogs with this structure:

```markdown
## What's Changed

### ✨ Features
* feat: Add video prayer responses (a1b2c3d)
* feat: Implement real-time notifications (e4f5g6h)

### 🐛 Bug Fixes
* fix: Resolve map marker clustering issue (i7j8k9l)
* fix: Fix iOS geolocation permission prompt (m0n1o2p)

### 📱 Mobile
* mobile: Add haptic feedback to prayer submission (q3r4s5t)

### ♻️ Refactoring
* refactor: Extract prayer validation logic (y9z0a1b)

### 📚 Documentation
* docs: Update API documentation (c2d3e4f)

### 🔧 Maintenance
* chore: Update dependencies (g5h6i7j)
* test: Add e2e tests for prayer flow (k8l9m0n)

## 📦 Installation

### Web
Visit [https://prayermap.net](https://prayermap.net)

### Android
Download the APK from the assets below.

### iOS
Available on TestFlight (contact team for access).

**Full Changelog**: https://github.com/ORG/prayermap/compare/v1.1.0...v1.2.0
```

## Commit Message Format

To ensure proper changelog generation, use conventional commits:

```bash
# Features (MINOR bump)
git commit -m "feat: add video prayer responses"

# Bug fixes (PATCH bump)
git commit -m "fix: resolve map marker clustering on iOS"

# Mobile-specific changes
git commit -m "mobile: add haptic feedback to prayer submission"

# Breaking changes (MAJOR bump)
git commit -m "feat!: redesign prayer API

BREAKING CHANGE: The prayer API now requires authentication.
All endpoints under /api/prayers/* now require a valid JWT token."

# Refactoring (no version bump)
git commit -m "refactor: extract prayer validation logic"

# Documentation (no version bump)
git commit -m "docs: update API documentation"

# Maintenance (no version bump)
git commit -m "chore: update dependencies"
```

## Workflow Details

### Jobs

1. **`release`** - Main release job
   - Runs tests and builds
   - Generates changelog
   - Creates GitHub Release
   - Updates CHANGELOG.md
   - Sends notifications

2. **`update-version`** - Version update job
   - Updates package.json version
   - Commits back to main
   - Runs after release job completes

### Permissions Required

The workflow needs these GitHub permissions:
- `contents: write` - To create releases and commit CHANGELOG.md
- `pull-requests: write` - For future PR automation

### Secrets

**Optional:**
- `SLACK_WEBHOOK_URL` - For Slack notifications on releases

## Platform-Specific Releases

### Web (Automatic)

Vercel auto-deploys from main branch. No manual steps required.

### iOS (Manual)

```bash
npm run ios:sync
npx cap open ios
# Build in Xcode → Archive → Upload to App Store Connect
```

### Android (Manual)

```bash
npm run android:sync
npx cap open android
# Build signed AAB → Upload to Google Play Console
```

## Next Steps

1. **Configure Slack notifications (optional):**
   - Create a Slack webhook
   - Add to repository secrets as `SLACK_WEBHOOK_URL`

2. **Create your first release:**
   ```bash
   npm run release
   ```

3. **Set up mobile release automation:**
   - Configure Fastlane for iOS/Android
   - Add mobile build secrets to GitHub

4. **Configure release-please (optional):**
   - Automate version bumps based on commits
   - Auto-create release PRs

## Resources

- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [Full Release Process Documentation](./RELEASE_PROCESS.md)
- [Quick Start Guide](./RELEASE_QUICK_START.md)

## Support

For questions or issues:
1. Check [RELEASE_PROCESS.md](./RELEASE_PROCESS.md) for detailed docs
2. Check [RELEASE_QUICK_START.md](./RELEASE_QUICK_START.md) for quick reference
3. Review workflow logs in GitHub Actions
4. Check troubleshooting section in docs

---

**Created:** 2025-11-29
**Version:** 1.0.0
**Status:** ✅ Production Ready
