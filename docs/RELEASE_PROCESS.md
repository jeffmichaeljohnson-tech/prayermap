# PrayerMap Release Process

This document outlines the complete release process for PrayerMap, including web, iOS, and Android platforms.

## Table of Contents

- [Versioning Strategy](#versioning-strategy)
- [Release Types](#release-types)
- [Creating a Release](#creating-a-release)
- [Automated Workflow](#automated-workflow)
- [Manual Steps](#manual-steps)
- [Platform-Specific Releases](#platform-specific-releases)
- [Troubleshooting](#troubleshooting)

---

## Versioning Strategy

PrayerMap follows [Semantic Versioning](https://semver.org/) (SemVer):

```
MAJOR.MINOR.PATCH[-PRERELEASE]

Examples:
- 1.0.0        (Stable release)
- 1.1.0        (New features, backward compatible)
- 1.1.1        (Bug fixes)
- 2.0.0-alpha.1 (Major version prerelease)
- 1.5.0-beta.2  (Minor version beta)
- 1.4.1-rc.1    (Release candidate)
```

### Version Bump Rules

Based on [Conventional Commits](https://www.conventionalcommits.org/):

| Commit Type | Version Bump | Example |
|-------------|--------------|---------|
| `feat:` | MINOR (1.1.0 → 1.2.0) | New feature added |
| `fix:` | PATCH (1.1.0 → 1.1.1) | Bug fix |
| `BREAKING CHANGE:` | MAJOR (1.1.0 → 2.0.0) | Breaking API change |
| `mobile:`, `refactor:`, `docs:`, `chore:` | No version bump | Maintenance |

### Mobile App Versioning

Mobile apps require additional version codes:

**iOS (CFBundleVersion):**
- Format: Build number (auto-incremented)
- Example: 1, 2, 3, ...

**Android (versionCode):**
- Format: Integer (auto-incremented)
- Example: 1, 2, 3, ...

**Both platforms (versionName):**
- Format: Semantic version string
- Example: "1.2.3"

---

## Release Types

### 1. Stable Release (Production)

**When:** Major features complete, thoroughly tested
**Version:** `x.y.z` (e.g., 1.2.0)
**Tag:** `vX.Y.Z` (e.g., v1.2.0)

```bash
# Example
git tag v1.2.0
git push origin v1.2.0
```

### 2. Beta Release (Testing)

**When:** Features ready for broader testing
**Version:** `x.y.z-beta.n` (e.g., 1.2.0-beta.1)
**Tag:** `vX.Y.Z-beta.N` (e.g., v1.2.0-beta.1)

```bash
git tag v1.2.0-beta.1
git push origin v1.2.0-beta.1
```

### 3. Alpha Release (Internal)

**When:** Early testing, unstable features
**Version:** `x.y.z-alpha.n` (e.g., 1.2.0-alpha.1)
**Tag:** `vX.Y.Z-alpha.N` (e.g., v1.2.0-alpha.1)

```bash
git tag v1.2.0-alpha.1
git push origin v1.2.0-alpha.1
```

### 4. Release Candidate (Pre-Production)

**When:** Final testing before stable release
**Version:** `x.y.z-rc.n` (e.g., 1.2.0-rc.1)
**Tag:** `vX.Y.Z-rc.N` (e.g., v1.2.0-rc.1)

```bash
git tag v1.2.0-rc.1
git push origin v1.2.0-rc.1
```

---

## Creating a Release

### Prerequisites

1. **All tests passing:**
   ```bash
   npm run test:ci
   npm run lint
   npm run test:e2e
   ```

2. **Version decision made:**
   - Review commits since last release
   - Determine version bump (major/minor/patch)
   - Decide if prerelease or stable

3. **Branch is clean:**
   ```bash
   git status
   # Should show no uncommitted changes
   ```

4. **On correct branch:**
   ```bash
   git checkout main
   git pull origin main
   ```

### Step-by-Step Release Process

#### 1. Determine Next Version

```bash
# View current version
cat package.json | grep version

# View recent commits
git log $(git describe --tags --abbrev=0)..HEAD --oneline

# Count features, fixes, breaking changes
git log $(git describe --tags --abbrev=0)..HEAD --oneline | grep "feat:"
git log $(git describe --tags --abbrev=0)..HEAD --oneline | grep "fix:"
git log $(git describe --tags --abbrev=0)..HEAD --oneline | grep "BREAKING CHANGE"
```

**Decision Matrix:**
- Breaking changes → MAJOR bump
- New features → MINOR bump
- Only fixes → PATCH bump
- Testing needed → Add prerelease suffix

#### 2. Create and Push Tag

```bash
# For stable release
git tag v1.2.0 -m "Release version 1.2.0"
git push origin v1.2.0

# For beta release
git tag v1.2.0-beta.1 -m "Beta release 1.2.0-beta.1"
git push origin v1.2.0-beta.1
```

#### 3. Automated Workflow Triggers

Once the tag is pushed, GitHub Actions automatically:

1. ✅ Checks out code with full history
2. ✅ Installs dependencies
3. ✅ Runs tests and linting
4. ✅ Builds web application
5. ✅ Builds Android APK and AAB (if possible)
6. ✅ Generates changelog from commits
7. ✅ Creates GitHub Release with artifacts
8. ✅ Updates CHANGELOG.md
9. ✅ Updates package.json version
10. ✅ Notifies Slack (if configured)

#### 4. Monitor Workflow

```bash
# View workflow status
# Visit: https://github.com/jeffmichaeljohnson-tech/prayermap/actions
```

Wait for all checks to pass (green checkmarks).

#### 5. Verify Release

1. **GitHub Release:**
   - Visit: `https://github.com/YOUR_ORG/prayermap/releases`
   - Verify release notes are accurate
   - Check artifacts are attached

2. **CHANGELOG.md:**
   ```bash
   git pull origin main
   cat CHANGELOG.md | head -50
   ```

3. **package.json:**
   ```bash
   cat package.json | grep version
   # Should match your release version
   ```

---

## Automated Workflow

### What the Workflow Does

The `.github/workflows/release.yml` workflow automates:

1. **Build & Test:**
   - Runs full test suite
   - Lints code
   - Builds production bundle

2. **Changelog Generation:**
   - Analyzes commits since last tag
   - Categorizes by type (feat, fix, mobile, etc.)
   - Formats with emojis and sections
   - Includes installation instructions

3. **GitHub Release:**
   - Creates release (draft or published)
   - Marks prereleases appropriately
   - Attaches build artifacts:
     - `dist/` folder (web build)
     - Android APK (if built)
     - Android AAB (if built)

4. **Documentation:**
   - Updates CHANGELOG.md
   - Commits back to main branch
   - Includes version and date

5. **Notifications:**
   - Posts to Slack (if webhook configured)
   - Includes release link and version

### Changelog Format

The automated changelog follows this structure:

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
* mobile: Optimize Android build size (u6v7w8x)

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

---

## Manual Steps

Some steps must be performed manually:

### iOS Release (TestFlight / App Store)

1. **Sync iOS project:**
   ```bash
   npm run ios:sync
   npx cap open ios
   ```

2. **In Xcode:**
   - Update version: `MARKETING_VERSION` = 1.2.0
   - Update build number: `CURRENT_PROJECT_VERSION` (increment)
   - Select "Any iOS Device" as target
   - Product → Archive
   - Wait for archive to complete

3. **Upload to App Store Connect:**
   - Click "Distribute App"
   - Select "App Store Connect"
   - Upload
   - Wait for processing (~10-30 minutes)

4. **TestFlight:**
   - Go to App Store Connect
   - Select your app → TestFlight
   - Add build to testers
   - Add "What to Test" notes

5. **App Store Submission (if stable release):**
   - Create new version
   - Fill out metadata
   - Submit for review

### Android Release (Google Play)

1. **Sync Android project:**
   ```bash
   npm run android:sync
   npx cap open android
   ```

2. **In Android Studio:**
   - Update `versionName` in `build.gradle`: "1.2.0"
   - Update `versionCode` (increment integer)
   - Build → Generate Signed Bundle / APK
   - Select "Android App Bundle"
   - Choose release keystore
   - Build

3. **Upload to Google Play Console:**
   - Go to Google Play Console
   - Select app → Release → Production (or Testing)
   - Create new release
   - Upload AAB file
   - Add release notes
   - Review and rollout

---

## Platform-Specific Releases

### Web Deployment (Vercel)

**Automatic:** Vercel auto-deploys from `main` branch.

**Manual trigger:**
```bash
# Push to main
git push origin main

# Or use Vercel CLI
npx vercel --prod
```

**Verify:**
- Visit: https://prayermap.net
- Check version in footer or console
- Test critical features

### iOS Beta (TestFlight)

1. Follow iOS manual steps above
2. Distribute to internal testers first
3. After validation, distribute to external testers
4. Monitor crash reports in App Store Connect

### Android Beta (Internal Testing)

1. Follow Android manual steps above
2. Upload to Internal Testing track
3. Share link with testers
4. Monitor crashes in Play Console

---

## Commit Message Guidelines

To ensure proper changelog generation, follow these conventions:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Description | Changelog Section |
|------|-------------|-------------------|
| `feat` | New feature | ✨ Features |
| `fix` | Bug fix | 🐛 Bug Fixes |
| `mobile` | Mobile-specific change | 📱 Mobile |
| `refactor` | Code refactoring | ♻️ Refactoring |
| `docs` | Documentation | 📚 Documentation |
| `style` | Code style (formatting) | 🔧 Maintenance |
| `test` | Tests | 🔧 Maintenance |
| `chore` | Maintenance | 🔧 Maintenance |

### Examples

**Good:**
```bash
git commit -m "feat: add video prayer responses

Implemented video recording and playback for prayer responses.
Users can now respond with video messages up to 60 seconds.

Closes #123"
```

```bash
git commit -m "fix: resolve map marker clustering on iOS

Fixed issue where markers would not cluster properly on iOS Safari.
Updated MapBox GL version and adjusted clustering parameters.

Fixes #456"
```

```bash
git commit -m "mobile: add haptic feedback to prayer submission

Added tactile feedback when users submit prayers on mobile devices.
Uses Capacitor Haptics plugin for iOS and Android.

Enhances #789"
```

**Bad:**
```bash
git commit -m "updates"
git commit -m "fixed stuff"
git commit -m "wip"
```

### Breaking Changes

For breaking changes, include `BREAKING CHANGE:` in commit body:

```bash
git commit -m "feat!: redesign prayer API

BREAKING CHANGE: The prayer API now requires authentication.
All endpoints under /api/prayers/* now require a valid JWT token.

Migration guide: docs/migrations/v2-auth.md
```

---

## Troubleshooting

### Workflow Fails

**Problem:** GitHub Actions workflow fails

**Solutions:**

1. **Tests failing:**
   ```bash
   # Run tests locally first
   npm run test:ci
   npm run lint
   ```

2. **Build failing:**
   ```bash
   # Test build locally
   npm run build
   ```

3. **Android build failing:**
   - This is marked as `continue-on-error`
   - Release will still be created
   - Build manually if needed

4. **Permission denied:**
   - Check repository settings
   - Ensure Actions have write permissions
   - Go to: Settings → Actions → General → Workflow permissions

### Tag Already Exists

**Problem:** `tag 'v1.2.0' already exists`

**Solutions:**

1. **Delete local tag:**
   ```bash
   git tag -d v1.2.0
   ```

2. **Delete remote tag:**
   ```bash
   git push origin :refs/tags/v1.2.0
   ```

3. **Create new tag:**
   ```bash
   git tag v1.2.1
   git push origin v1.2.1
   ```

### Changelog is Empty

**Problem:** Generated changelog has no commits

**Causes:**
- No commits since last tag
- Commits don't follow conventional format

**Solutions:**

1. **Check commits:**
   ```bash
   git log $(git describe --tags --abbrev=0)..HEAD --oneline
   ```

2. **Use conventional commits:**
   - Start commits with `feat:`, `fix:`, etc.
   - See commit guidelines above

### Package Version Not Updated

**Problem:** `package.json` version doesn't match release

**Solution:**
- The workflow automatically updates this
- Wait for the second job to complete
- Pull latest changes: `git pull origin main`

### Android Build Artifacts Missing

**Problem:** APK/AAB not attached to release

**Causes:**
- Android build failed
- Gradle not configured
- Signing keys missing

**Solutions:**

1. **Build manually:**
   ```bash
   npm run android:sync
   npx cap open android
   # Build in Android Studio
   ```

2. **Check workflow logs:**
   - Go to Actions tab
   - Click on failed workflow
   - Check Android build step

3. **Skip Android builds:**
   - Workflow continues even if Android build fails
   - This is intentional for rapid web releases

---

## Release Checklist

Use this checklist for every release:

### Pre-Release

- [ ] All tests passing locally
- [ ] All features documented
- [ ] Breaking changes noted in commits
- [ ] Version number decided
- [ ] Branch is clean (no uncommitted changes)
- [ ] On main branch with latest changes

### Release

- [ ] Tag created with correct version
- [ ] Tag pushed to GitHub
- [ ] Workflow triggered successfully
- [ ] All workflow jobs passed
- [ ] GitHub Release created
- [ ] Artifacts attached to release
- [ ] CHANGELOG.md updated
- [ ] package.json version updated

### Post-Release

- [ ] Web deployment verified (prayermap.net)
- [ ] Release notes reviewed for accuracy
- [ ] Team notified (Slack/Discord)
- [ ] iOS TestFlight updated (if applicable)
- [ ] Android Play Console updated (if applicable)
- [ ] Monitor error tracking (Sentry, etc.)
- [ ] Monitor user feedback

### iOS Specific

- [ ] Version updated in Xcode
- [ ] Build number incremented
- [ ] Archive created successfully
- [ ] Uploaded to App Store Connect
- [ ] TestFlight build available
- [ ] "What to Test" notes added
- [ ] Testers notified

### Android Specific

- [ ] versionName updated in build.gradle
- [ ] versionCode incremented
- [ ] Signed AAB generated
- [ ] Uploaded to Play Console
- [ ] Release notes added
- [ ] Testers notified (if beta)

---

## Best Practices

1. **Release Often:**
   - Small, frequent releases are better than large, infrequent ones
   - Easier to debug issues
   - Faster feedback from users

2. **Test Prereleases:**
   - Use alpha/beta/rc versions for testing
   - Don't skip testing phases
   - Get user feedback before stable release

3. **Document Everything:**
   - Write clear commit messages
   - Update docs with new features
   - Explain breaking changes thoroughly

4. **Communicate:**
   - Announce releases to team
   - Notify users of major changes
   - Provide migration guides for breaking changes

5. **Monitor:**
   - Watch error tracking after release
   - Monitor user feedback
   - Be ready to hotfix critical issues

6. **Follow SemVer:**
   - Major: Breaking changes
   - Minor: New features (backward compatible)
   - Patch: Bug fixes (backward compatible)

---

## Quick Reference

### Create a Stable Release

```bash
# Ensure you're on main with latest changes
git checkout main
git pull origin main

# Run tests
npm run test:ci && npm run lint

# Create and push tag
git tag v1.2.0 -m "Release 1.2.0"
git push origin v1.2.0

# Monitor workflow
# https://github.com/YOUR_ORG/prayermap/actions
```

### Create a Beta Release

```bash
git tag v1.2.0-beta.1 -m "Beta release 1.2.0-beta.1"
git push origin v1.2.0-beta.1
```

### View Recent Releases

```bash
git tag -l --sort=-v:refname | head -10
```

### Compare Versions

```bash
git log v1.1.0..v1.2.0 --oneline
```

---

## Resources

- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [GitHub Releases Documentation](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [Capacitor iOS Deployment](https://capacitorjs.com/docs/ios/deploying-to-app-store)
- [Capacitor Android Deployment](https://capacitorjs.com/docs/android/deploying-to-google-play)

---

**Last Updated:** 2025-11-29
**Maintained By:** PrayerMap Team
**Questions?** Check the troubleshooting section or ask in #dev-releases
