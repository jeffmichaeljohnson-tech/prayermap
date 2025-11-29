# Release Workflow Diagram

## Visual Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEVELOPER ACTIONS                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
                    ┌─────────▼──────────┐
                    │  Run Release       │
                    │  npm run release   │
                    │  (or manual tag)   │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Interactive       │
                    │  Prompts:          │
                    │  • Check status    │
                    │  • Analyze commits │
                    │  • Suggest version │
                    │  • Run tests       │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Create Git Tag    │
                    │  git tag vX.Y.Z    │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Push Tag          │
                    │  git push origin   │
                    │  vX.Y.Z            │
                    └─────────┬──────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                  GITHUB ACTIONS WORKFLOW                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Trigger Workflow  │
                    │  (on tag push)     │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Checkout Code     │
                    │  (full history)    │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Install Deps      │
                    │  npm ci            │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Run Tests         │
                    │  npm run test:ci   │
                    │  npm run lint      │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Build Web App     │
                    │  npm run build     │
                    └─────────┬──────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼──────┐  ┌────▼─────┐  ┌──────▼────────┐
    │  Build Android │  │ Generate │  │ Extract       │
    │  APK & AAB     │  │ Changelog│  │ Version Info  │
    │ (non-blocking) │  │ from Git │  │ from Tag      │
    └─────────┬──────┘  └────┬─────┘  └──────┬────────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Categorize        │
                    │  Commits:          │
                    │  • Features        │
                    │  • Bug Fixes       │
                    │  • Mobile          │
                    │  • Refactoring     │
                    │  • Documentation   │
                    │  • Maintenance     │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Format Changelog  │
                    │  with Emojis &     │
                    │  Installation      │
                    │  Instructions      │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Create GitHub     │
                    │  Release:          │
                    │  • Title           │
                    │  • Body            │
                    │  • Artifacts       │
                    │  • Prerelease?     │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Attach Artifacts: │
                    │  • dist/ folder    │
                    │  • Android APK     │
                    │  • Android AAB     │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Update            │
                    │  CHANGELOG.md      │
                    │  (prepend release) │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Commit & Push     │
                    │  CHANGELOG.md      │
                    │  to main           │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Send Slack        │
                    │  Notification      │
                    │  (if configured)   │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Update Version    │
                    │  Job Starts:       │
                    │  • Update          │
                    │    package.json    │
                    │  • Commit to main  │
                    └─────────┬──────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         RESULTS                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼─────┐  ┌──────▼─────┐  ┌─────▼──────┐
    │ GitHub        │  │ Updated    │  │ Updated    │
    │ Release with  │  │ CHANGELOG  │  │ package.json│
    │ Artifacts     │  │ .md        │  │ version    │
    └─────────┬─────┘  └──────┬─────┘  └─────┬──────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Vercel Auto-      │
                    │  Deploys Web       │
                    │  (from main)       │
                    └─────────┬──────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                   MANUAL FOLLOW-UP                               │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼─────┐  ┌──────▼─────┐  ┌─────▼──────┐
    │ iOS TestFlight│  │ Android    │  │ Team       │
    │ (manual)      │  │ Play Store │  │ Notification│
    │               │  │ (manual)   │  │            │
    └───────────────┘  └────────────┘  └────────────┘
```

## Workflow Stages

### Stage 1: Preparation (Developer)

**Actions:**
1. Write code following conventional commits
2. Ensure all tests pass
3. Merge to main branch
4. Run release script or create tag manually

**Duration:** Varies (depends on development)

### Stage 2: Pre-Release (Interactive Script)

**Actions:**
1. Check git status is clean
2. Analyze commits since last release
3. Count features, fixes, breaking changes
4. Suggest version based on commit types
5. Run tests locally
6. Create git tag
7. Push tag to remote

**Duration:** 1-2 minutes

### Stage 3: Automated Release (GitHub Actions)

**Actions:**
1. Install dependencies
2. Run tests and linting
3. Build production application
4. Attempt mobile builds
5. Generate and format changelog
6. Create GitHub Release
7. Update documentation
8. Send notifications

**Duration:** 5-10 minutes

### Stage 4: Post-Release (Automatic)

**Actions:**
1. Vercel deploys web app from main
2. CHANGELOG.md updated in repo
3. package.json version updated
4. Team notified via Slack

**Duration:** 2-5 minutes

### Stage 5: Mobile Distribution (Manual)

**Actions:**
1. iOS: Build in Xcode, upload to TestFlight
2. Android: Build AAB, upload to Play Console
3. Distribute to testers
4. Submit for review (if production release)

**Duration:** 30-60 minutes

## Parallel Processes

The workflow runs several tasks in parallel:

```
                    Build Web App
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   Build Android     Generate          Extract
        APK          Changelog         Version
        │                 │                 │
   Build Android          │                 │
        AAB               │                 │
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                    Combine Results
```

## Error Handling

```
   Test Failed?
        │
        ├─ Yes ──► Stop Workflow ──► Notify Developer
        │
        └─ No ──► Continue

   Android Build Failed?
        │
        ├─ Yes ──► Continue (non-blocking)
        │
        └─ No ──► Continue

   Changelog Empty?
        │
        ├─ Yes ──► Create minimal changelog
        │
        └─ No ──► Continue
```

## Success Criteria

✅ All tests pass
✅ Web build succeeds
✅ Changelog generated
✅ GitHub Release created
✅ Artifacts attached
✅ CHANGELOG.md updated
✅ package.json version updated
✅ Web app deployed to production

## Failure Points

### Common Failures and Recovery

| Failure Point | Cause | Recovery |
|---------------|-------|----------|
| Tests fail | Breaking changes | Fix tests, create new tag |
| Build fails | Dependencies issue | Fix deps, create new tag |
| Tag exists | Version collision | Delete tag, increment version |
| Push rejected | Outdated local branch | Pull latest, create new tag |
| Android build fails | Gradle/SDK issue | Release continues (web only) |
| Changelog empty | No conventional commits | Release continues (manual notes) |

## Changelog Categorization Logic

```
For each commit since last tag:
    │
    ├─ Starts with "feat:" ──► ✨ Features
    │
    ├─ Starts with "fix:" ──► 🐛 Bug Fixes
    │
    ├─ Starts with "mobile:" ──► 📱 Mobile
    │
    ├─ Starts with "refactor:" ──► ♻️ Refactoring
    │
    ├─ Starts with "docs:" ──► 📚 Documentation
    │
    └─ Starts with "chore:", "style:", "test:" ──► 🔧 Maintenance
```

## Version Bump Logic

```
Analyze commits:
    │
    ├─ Has "BREAKING CHANGE:" ──► MAJOR bump (1.0.0 → 2.0.0)
    │
    ├─ Has "feat:" ──► MINOR bump (1.0.0 → 1.1.0)
    │
    ├─ Has "fix:" ──► PATCH bump (1.0.0 → 1.0.1)
    │
    └─ Other ──► PATCH bump (default)
```

## Prerelease Handling

```
Tag format: vX.Y.Z-TYPE.N
    │
    ├─ Contains "alpha" ──► Marked as prerelease
    │
    ├─ Contains "beta" ──► Marked as prerelease
    │
    ├─ Contains "rc" ──► Marked as prerelease
    │
    └─ No suffix ──► Marked as stable release
```

## Timeline Example

### Creating a Release

```
T+0:00   Developer runs: npm run release
T+0:01   Script analyzes commits
T+0:02   Script suggests version: 1.2.0
T+0:03   Developer confirms
T+0:04   Tests run locally
T+0:05   Tag created: v1.2.0
T+0:06   Tag pushed to GitHub
T+0:07   GitHub Actions workflow triggered
T+0:08   Dependencies installed
T+0:10   Tests and linting complete
T+0:12   Web app built
T+0:14   Android builds attempted
T+0:15   Changelog generated
T+0:16   GitHub Release created
T+0:17   CHANGELOG.md updated
T+0:18   package.json version updated
T+0:19   Slack notification sent
T+0:20   Vercel deployment triggered
T+0:25   Web app live at prayermap.net
```

**Total automated time:** ~25 minutes from tag push to production

---

**Note:** This diagram represents the ideal happy path. Actual timings may vary based on test suite size, build complexity, and GitHub Actions queue times.
