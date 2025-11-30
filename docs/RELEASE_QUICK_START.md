# Release Quick Start Guide

This is a TL;DR version of the full [Release Process](./RELEASE_PROCESS.md) documentation.

## Prerequisites

✅ On main branch with latest changes
✅ All tests passing
✅ Working directory clean (no uncommitted changes)

## Option 1: Interactive Script (Recommended)

```bash
./scripts/create-release.sh
```

The script will:
1. ✅ Check git status and branch
2. ✅ Analyze commits since last release
3. ✅ Suggest next version based on conventional commits
4. ✅ Run tests
5. ✅ Create and push tag
6. ✅ Trigger automated release workflow

**That's it!** The GitHub Actions workflow handles everything else.

## Option 2: Manual Release

### Step 1: Determine Version

```bash
# View recent commits
git log $(git describe --tags --abbrev=0)..HEAD --oneline

# Decide version based on changes:
# - Breaking changes → MAJOR bump (1.0.0 → 2.0.0)
# - New features → MINOR bump (1.0.0 → 1.1.0)
# - Bug fixes → PATCH bump (1.0.0 → 1.0.1)
```

### Step 2: Run Tests

```bash
npm run test:ci && npm run lint
```

### Step 3: Create & Push Tag

```bash
# For stable release
git tag v1.2.0 -m "Release 1.2.0"
git push origin v1.2.0

# For beta release
git tag v1.2.0-beta.1 -m "Beta release 1.2.0-beta.1"
git push origin v1.2.0-beta.1

# For alpha release
git tag v1.2.0-alpha.1 -m "Alpha release 1.2.0-alpha.1"
git push origin v1.2.0-alpha.1
```

### Step 4: Monitor Workflow

Visit: https://github.com/YOUR_ORG/prayermap/actions

Wait for all checks to pass ✅

## What Happens Automatically

When you push a tag, GitHub Actions will:

1. ✅ Run tests and linting
2. ✅ Build web application
3. ✅ Build Android APK/AAB (if possible)
4. ✅ Generate changelog from commits
5. ✅ Create GitHub Release with artifacts
6. ✅ Update CHANGELOG.md
7. ✅ Update package.json version
8. ✅ Notify Slack (if configured)

## After Release

### Web (Automatic)
- Vercel auto-deploys from main
- Verify at: https://prayermap.net

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

## Commit Message Format

Use conventional commits for automatic changelog generation:

```bash
# Features (MINOR bump)
git commit -m "feat: add video prayer responses"

# Bug fixes (PATCH bump)
git commit -m "fix: resolve map marker clustering on iOS"

# Mobile changes
git commit -m "mobile: add haptic feedback"

# Breaking changes (MAJOR bump)
git commit -m "feat!: redesign prayer API

BREAKING CHANGE: The prayer API now requires authentication."
```

## Quick Reference

| Type | Version Bump | Example |
|------|--------------|---------|
| `feat:` | MINOR (1.1.0 → 1.2.0) | New feature |
| `fix:` | PATCH (1.1.0 → 1.1.1) | Bug fix |
| `BREAKING CHANGE:` | MAJOR (1.1.0 → 2.0.0) | Breaking change |
| `mobile:`, `refactor:`, `docs:`, `chore:` | No bump | Maintenance |

## Troubleshooting

### Tag already exists
```bash
git tag -d v1.2.0              # Delete local
git push origin :refs/tags/v1.2.0  # Delete remote
git tag v1.2.1                 # Create new tag
git push origin v1.2.1         # Push new tag
```

### Workflow fails
1. Check Actions tab for error details
2. Fix issue locally
3. Create new tag with incremented patch version
4. Push new tag

### Tests failing locally
```bash
npm run test:ci  # Run tests
npm run lint     # Check linting
# Fix issues, commit, then retry release
```

## Need More Details?

See the full [Release Process Documentation](./RELEASE_PROCESS.md) for:
- Detailed step-by-step instructions
- Platform-specific release guides (iOS, Android)
- Commit message guidelines
- Changelog format details
- Advanced troubleshooting

## Support

Questions? Check:
- [Full Release Process](./RELEASE_PROCESS.md)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
