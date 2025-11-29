# Android Release Checklist

**Use this checklist for every Android release to ensure quality and completeness**

---

## Pre-Release Preparation

### Version Management
- [ ] **Update version code** in `android/app/build.gradle`
  - Current: `versionCode X`
  - New: `versionCode X+1` (increment by 1)
  - Must always increase
- [ ] **Update version name** in `android/app/build.gradle`
  - Current: `versionName "X.Y.Z"`
  - New: `versionName "X.Y.Z"` (semantic versioning)
  - Format: MAJOR.MINOR.PATCH (e.g., 1.0.0, 1.0.1, 1.1.0)
- [ ] **Sync iOS version** (keep platforms in sync)
  - iOS CFBundleShortVersionString matches Android versionName
  - iOS CFBundleVersion matches Android versionCode

### Configuration
- [ ] **Remove dev server config** from `capacitor.config.ts`
  - Comment out or remove `server` block
  - Keep `androidScheme: 'https'` only
- [ ] **Verify environment variables** in `.env.production`
  - [ ] `VITE_SUPABASE_URL` correct
  - [ ] `VITE_SUPABASE_ANON_KEY` correct
  - [ ] `VITE_MAPBOX_ACCESS_TOKEN` correct
  - [ ] `VITE_APP_ENV=production`
- [ ] **Review AndroidManifest.xml**
  - [ ] All required permissions present
  - [ ] App name correct
  - [ ] Package name: `net.prayermap.app`
- [ ] **Review build.gradle**
  - [ ] Signing config present
  - [ ] ProGuard enabled (minifyEnabled true)
  - [ ] Resource shrinking enabled

### Code Quality
- [ ] **Run linter**
  ```bash
  npm run lint
  ```
  - Fix all errors
  - Fix critical warnings
- [ ] **Run tests**
  ```bash
  npm run test
  npm run test:e2e
  ```
  - All tests pass
  - No new test failures
- [ ] **Type check**
  ```bash
  npx tsc --noEmit
  ```
  - No TypeScript errors

---

## Build Process

### Web App Build
- [ ] **Build production web app**
  ```bash
  npm run build -- --mode production
  ```
- [ ] **Verify build output**
  ```bash
  ls -lh dist/
  ```
  - [ ] `index.html` exists
  - [ ] `assets/` directory exists
  - [ ] No unexpected files
  - [ ] Total size reasonable (< 5MB)

### Sync to Android
- [ ] **Sync Capacitor**
  ```bash
  npm run android:sync
  ```
- [ ] **Verify sync success**
  - No errors in terminal
  - Files copied to `android/app/src/main/assets/public/`

### Release Build
- [ ] **Clean previous builds**
  ```bash
  npm run android:clean
  ```
- [ ] **Build release AAB** (for Play Store)
  ```bash
  npm run android:build:aab
  ```
- [ ] **Verify AAB created**
  ```bash
  ls -lh android/app/build/outputs/bundle/release/
  ```
  - [ ] `app-release.aab` exists
  - [ ] File size reasonable (< 50MB)
- [ ] **Optional: Build release APK** (for testing)
  ```bash
  npm run android:build
  ```

---

## Testing

### Device Testing
- [ ] **Install on test device**
  ```bash
  # For APK testing:
  npm run android:install

  # For AAB testing:
  # Use Play Console Internal Testing or
  # Extract APK using bundletool
  ```

### Functional Testing
- [ ] **App launches successfully**
  - No crashes on startup
  - Splash screen displays correctly
  - Loads within 3 seconds
- [ ] **Authentication**
  - [ ] Sign up works
  - [ ] Sign in works
  - [ ] Sign out works
  - [ ] Social login works (if implemented)
- [ ] **Core Features**
  - [ ] Map loads and displays
  - [ ] Prayer markers appear
  - [ ] Can tap markers to view prayers
  - [ ] Can post new prayer
  - [ ] Can respond to prayer
  - [ ] Images upload successfully
- [ ] **Permissions**
  - [ ] Camera permission prompt appears
  - [ ] Camera permission works when granted
  - [ ] Location permission prompt appears
  - [ ] Location permission works when granted
  - [ ] Handles permission denial gracefully
- [ ] **Navigation**
  - [ ] All screens accessible
  - [ ] Back button works correctly
  - [ ] Deep links work (if implemented)
- [ ] **UI/UX**
  - [ ] No layout issues
  - [ ] Text readable on all screens
  - [ ] Touch targets large enough (44x44dp minimum)
  - [ ] Animations smooth (60fps)
  - [ ] No visual glitches

### Performance Testing
- [ ] **App performance**
  - [ ] Scrolling smooth
  - [ ] No lag or jank
  - [ ] Memory usage reasonable (< 200MB)
  - [ ] Battery usage reasonable
- [ ] **Network handling**
  - [ ] Works on WiFi
  - [ ] Works on mobile data
  - [ ] Handles poor connection gracefully
  - [ ] Offline mode works (if implemented)
- [ ] **Error handling**
  - [ ] Network errors shown to user
  - [ ] API errors handled gracefully
  - [ ] No silent failures

### Device Matrix Testing
- [ ] **Google Pixel** (pure Android)
  - Emulator or real device
  - Latest Android version
- [ ] **Samsung Galaxy** (manufacturer UI)
  - Real device preferred
  - Android 10+
- [ ] **Minimum supported version** (Android 8.0 / API 26)
  - Emulator acceptable
  - Verify all features work

### Regression Testing
- [ ] **Previous bug fixes**
  - [ ] Verify old bugs don't reappear
  - [ ] Check issues marked as "fixed" in past releases
- [ ] **Edge cases**
  - [ ] Test with no internet connection
  - [ ] Test with slow internet
  - [ ] Test with GPS disabled
  - [ ] Test with camera disabled
  - [ ] Test with storage full (edge case)

### Security Testing
- [ ] **API keys not exposed**
  - Inspect APK (unzip and check)
  - Anon keys OK, service keys NOT OK
- [ ] **HTTPS enforced**
  - All network requests use HTTPS
  - Mixed content warnings resolved
- [ ] **Sensitive data encrypted**
  - No plain text passwords
  - No unencrypted personal data

---

## Play Console Preparation

### Store Listing Review
- [ ] **App title** correct
  - "PrayerMap"
- [ ] **Short description** up to date
  - "See where prayer is needed. Send prayer where you are."
  - 80 characters maximum
- [ ] **Full description** complete and compelling
  - Highlights features
  - 4000 characters maximum
- [ ] **Screenshots** current
  - [ ] At least 2 phone screenshots
  - [ ] Up to 8 screenshots
  - [ ] 1080x1920 or similar
  - [ ] Show key features
  - [ ] No outdated UI
- [ ] **Feature graphic** present
  - 1024x500 pixels
  - PNG or JPEG
- [ ] **App icon** correct
  - 512x512 pixels
  - 32-bit PNG
  - No transparency

### App Content
- [ ] **Privacy policy** accessible
  - URL: https://prayermap.net/privacy
  - Updated to reflect current data practices
- [ ] **Content rating** current
  - Questionnaire completed
  - Rating appropriate (13+)
- [ ] **Target audience** correct
  - Age group: 13 and over
- [ ] **Data safety** section complete
  - Data collection disclosed
  - Data sharing disclosed
  - Security practices noted
- [ ] **App category** correct
  - Category: Lifestyle or Social
  - Tags: Prayer, Spiritual, Community

### Release Notes
- [ ] **What's new** written
  - Clear, concise bullet points
  - Highlight new features
  - Mention bug fixes
  - 500 characters maximum
  - Example:
    ```
    Version 1.0.1:
    • Improved map loading performance
    • Fixed camera permission issue on Samsung devices
    • Enhanced prayer notification system
    • Bug fixes and stability improvements
    ```

---

## Upload and Release

### Internal Testing (Recommended First)
- [ ] **Create internal test release**
  - Play Console → Testing → Internal testing
  - Click "Create new release"
- [ ] **Upload AAB**
  - Select `app-release.aab`
  - Wait for upload to complete
  - Wait for analysis (APK size, permissions)
- [ ] **Add release notes**
  - Copy from preparation section
- [ ] **Add testers**
  - Email list of internal testers
  - Share opt-in URL
- [ ] **Start rollout to internal testing**
- [ ] **Internal team tests thoroughly**
  - At least 3 team members
  - At least 24 hours of testing
  - All critical flows tested
  - No major bugs found

### Production Release
- [ ] **Create production release**
  - Play Console → Production → Create new release
- [ ] **Upload AAB**
  - Use same AAB as internal testing (if successful)
  - Or build new AAB if changes made
- [ ] **Review release details**
  - Version name correct
  - Version code correct
  - Release notes complete
- [ ] **Choose rollout strategy**
  - [ ] Staged rollout (recommended for major updates)
    - Start at 10%
    - Increase to 50% after 24 hours (if no issues)
    - Increase to 100% after 48 hours (if stable)
  - [ ] Full rollout (for minor updates)
    - 100% immediately
- [ ] **Review and start rollout**
  - Final review of all details
  - Click "Review release"
  - Click "Start rollout to Production"

### Post-Release Monitoring
- [ ] **Monitor for crashes**
  - Play Console → Vitals → Crashes
  - First 24 hours: Check every 2-4 hours
  - Target: < 0.5% crash rate
- [ ] **Monitor for ANRs** (App Not Responding)
  - Play Console → Vitals → ANRs
  - Target: < 0.5% ANR rate
- [ ] **Monitor reviews**
  - First 24 hours: Check every 4 hours
  - Respond to negative reviews quickly
  - Thank positive reviews
- [ ] **Monitor metrics**
  - Installs
  - Uninstalls
  - Retention (Day 1, Day 7, Day 30)
  - User engagement

---

## Post-Release Tasks

### Documentation
- [ ] **Update changelog**
  - Add release notes to `CHANGELOG.md`
  - Document breaking changes (if any)
- [ ] **Tag release in Git**
  ```bash
  git tag -a v1.0.0 -m "Release version 1.0.0"
  git push origin v1.0.0
  ```
- [ ] **Create GitHub release**
  - Create release on GitHub
  - Attach release notes
  - Link to Play Store listing

### Communication
- [ ] **Notify team**
  - Release completed successfully
  - Key metrics from first 24 hours
- [ ] **Notify users** (if major update)
  - Blog post (if applicable)
  - Social media announcement
  - Email newsletter (if applicable)

### Backup
- [ ] **Backup release AAB**
  - Store in secure location
  - Tag with version number
  - Keep for future reference
- [ ] **Backup keystore** (periodic check)
  - Verify keystore backed up securely
  - Test keystore password
  - Verify backup is accessible

### Planning
- [ ] **Review release process**
  - What went well?
  - What could be improved?
  - Update this checklist if needed
- [ ] **Plan next release**
  - Gather feedback from users
  - Prioritize bugs and features
  - Set target date for next release

---

## Rollback Plan (If Issues Found)

### Minor Issues
- [ ] **Monitor and document**
  - Track issues in issue tracker
  - Determine severity
  - Plan fix for next release

### Critical Issues (Crashes, Data Loss, Security)
- [ ] **Halt rollout** (if staged)
  - Play Console → Release → Halt rollout
- [ ] **Assess impact**
  - How many users affected?
  - Severity of issue?
- [ ] **Fix immediately**
  - Create hotfix branch
  - Fix critical issue
  - Test thoroughly
  - Increment version code
  - Build new AAB
  - Upload as new release
- [ ] **Communicate**
  - Notify affected users (if possible)
  - Update store description with fix
  - Apologize for inconvenience

---

## Version History Template

**Copy this for each release:**

```markdown
## Version X.Y.Z (Build N) - YYYY-MM-DD

### What's New
- Feature 1
- Feature 2
- Improvement 1

### Bug Fixes
- Fixed issue 1
- Fixed issue 2

### Technical Changes
- Updated dependency X to version Y
- Performance improvements

### Testing Notes
- Tested on devices: Pixel 5, Samsung Galaxy S21, Android 8.0 emulator
- No known issues

### Rollout Strategy
- Staged rollout: 10% → 50% → 100% over 3 days

### Metrics (Post-Release)
- Install rate: X%
- Crash rate: Y%
- User rating: Z stars
```

---

## Emergency Contacts

**In case of critical issues:**
- **Play Console:** https://play.google.com/console
- **Google Play Support:** https://support.google.com/googleplay/android-developer
- **Team Lead:** [Contact info]
- **Dev Team Slack:** [Channel]

---

## Quick Reference

### Commands
```bash
# Build and release
npm run build -- --mode production
npm run android:sync
npm run android:build:aab

# Testing
npm run android:install
npm run android:devices
npm run android:logcat

# Troubleshooting
npm run android:clean
npx cap sync android
```

### Files to Update
- [ ] `android/app/build.gradle` - Version numbers
- [ ] `capacitor.config.ts` - Remove dev server
- [ ] `.env.production` - Environment variables
- [ ] `CHANGELOG.md` - Release notes

### Review Times
- **First review:** Up to 7 days
- **Subsequent reviews:** 1-3 days (typically)
- **Expedited review:** Not available for Android

---

**Use this checklist for every Android release to ensure quality and consistency!**

*Last Updated: 2025-11-29*
*PrayerMap Android Documentation*
