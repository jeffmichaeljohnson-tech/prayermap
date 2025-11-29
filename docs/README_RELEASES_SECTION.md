# Releases Section for README.md

Add this section to your main README.md file:

---

## 🚀 Releases

PrayerMap uses automated release workflows with semantic versioning and conventional commits.

### Quick Release

```bash
# Interactive release (recommended)
npm run release

# Or manually
git tag v1.2.0 -m "Release 1.2.0"
git push origin v1.2.0
```

### Versioning

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features (backward compatible)
- **PATCH** (1.0.0 → 1.0.1): Bug fixes

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) for automatic changelog generation:

```bash
feat: add video prayer responses       # New feature
fix: resolve map marker clustering     # Bug fix
mobile: add haptic feedback            # Mobile change
refactor: extract validation logic     # Code refactoring
docs: update API documentation         # Documentation
chore: update dependencies             # Maintenance
```

### What Happens Automatically

When you push a version tag, GitHub Actions will:

1. ✅ Run tests and build the app
2. ✅ Generate a changelog from commits
3. ✅ Create a GitHub Release with artifacts
4. ✅ Update CHANGELOG.md
5. ✅ Update package.json version
6. ✅ Deploy to production (Vercel)

### Documentation

- [Full Release Process](./docs/RELEASE_PROCESS.md) - Complete guide
- [Quick Start Guide](./docs/RELEASE_QUICK_START.md) - TL;DR version
- [Workflow Diagram](./docs/RELEASE_WORKFLOW_DIAGRAM.md) - Visual flow
- [CHANGELOG.md](./CHANGELOG.md) - Release history

### Platform-Specific Releases

**Web:** Automatically deployed via Vercel
**iOS:** Manual upload to TestFlight ([guide](./docs/RELEASE_PROCESS.md#ios-release-testflight--app-store))
**Android:** Manual upload to Play Console ([guide](./docs/RELEASE_PROCESS.md#android-release-google-play))

---

## Alternative: Badge-Based Section

Add release badges to the top of your README.md:

```markdown
# PrayerMap

[![Version](https://img.shields.io/github/v/release/YOUR_ORG/prayermap)](https://github.com/YOUR_ORG/prayermap/releases)
[![Latest Release](https://img.shields.io/github/release-date/YOUR_ORG/prayermap)](https://github.com/YOUR_ORG/prayermap/releases/latest)
[![License](https://img.shields.io/github/license/YOUR_ORG/prayermap)](./LICENSE)

> See where prayer is needed. Send prayer where you are.

[Live Site](https://prayermap.net) | [Releases](https://github.com/YOUR_ORG/prayermap/releases) | [Documentation](./docs/)
```

## Alternative: Minimal Section

For a more minimal README, just add this:

---

## Releases

See [CHANGELOG.md](./CHANGELOG.md) for release history.

To create a new release:
```bash
npm run release
```

Full documentation: [Release Process](./docs/RELEASE_PROCESS.md)

---
