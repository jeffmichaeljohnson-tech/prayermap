# Deployment Runbook - PrayerMap

**Quick reference guide for deploying PrayerMap to production**

**Last Updated:** 2025-11-29

---

## Quick Navigation

- [Web Deployment](#web-deployment) (5 minutes)
- [Android Deployment](#android-deployment) (30 minutes)
- [iOS Deployment](#ios-deployment) (45 minutes)
- [Emergency Rollback](#emergency-rollback) (2 minutes)

---

## Web Deployment

### Pre-Deployment (5 minutes)

```bash
# 1. Run all checks locally
npm run lint
npx tsc --noEmit
npm run test
npm run test:e2e
npm run build
npm run preview

# 2. Verify preview works
# Open http://localhost:4173 and test
```

**Checklist:**
- [ ] All tests passing
- [ ] Linting clean
- [ ] Type check clean
- [ ] Build successful
- [ ] Manual testing complete
- [ ] Code reviewed and approved

### Deployment Steps (Automatic)

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add new feature"

# 3. Push and create PR
git push origin feature/my-feature
```

**GitHub:**
1. Create pull request
2. Wait for CI to pass (5-10 minutes)
3. Get code review approval
4. Merge pull request

**Vercel (automatic):**
1. Detects merge to main
2. Builds production bundle
3. Deploys to https://prayermap.net
4. Completes in ~2-3 minutes

### Post-Deployment Verification (5 minutes)

```bash
# Visit production
https://prayermap.net
```

**Check:**
- [ ] Site loads without errors
- [ ] Map displays correctly
- [ ] Prayers load from database
- [ ] Authentication works
- [ ] No console errors
- [ ] Mobile responsive

**Run Lighthouse:**
- Open Chrome DevTools
- Lighthouse tab
- Generate report
- Verify scores >90

**Monitor for 30 minutes:**
- Check Vercel logs
- Monitor user feedback
- Watch for error reports

---

## Android Deployment

### Prerequisites

```bash
# Ensure you have:
- Android Studio installed
- Keystore file accessible
- keystore.properties configured
- Play Console access
```

### Pre-Deployment (10 minutes)

**1. Update version:**

Edit `android/app/build.gradle`:
```gradle
defaultConfig {
    versionCode 2        // Increment by 1
    versionName "1.0.1"  // Update version
}
```

**2. Run checks:**
```bash
npm run lint
npx tsc --noEmit
npm run test
```

**3. Test build:**
```bash
npm run build -- --mode production
npm run android:sync
npm run android:build
```

**Checklist:**
- [ ] Version numbers updated
- [ ] All tests passing
- [ ] Build successful
- [ ] Release notes written
- [ ] Screenshots updated (if UI changed)

### Build Steps (15 minutes)

```bash
# 1. Clean previous builds
npm run android:clean

# 2. Build production web app
npm run build -- --mode production

# 3. Sync to Android
npm run android:sync

# 4. Build release AAB
npm run android:build:aab

# 5. Verify AAB created
ls -lh android/app/build/outputs/bundle/release/
# Should see: app-release.aab
```

### Upload to Play Console (5 minutes)

1. Go to https://play.google.com/console
2. Select PrayerMap
3. Release → Production (or Internal Testing)
4. Create new release
5. Upload AAB: `android/app/build/outputs/bundle/release/app-release.aab`
6. Add release notes
7. Review and submit

**Release notes template:**
```
Version 1.0.1:
• [New feature 1]
• [New feature 2]
• [Bug fix 1]
• [Bug fix 2]
• Performance improvements and bug fixes
```

### Post-Deployment Verification (varies)

**Internal Testing (1-2 days):**
- [ ] Upload to Internal Testing track
- [ ] Add internal testers
- [ ] Test on multiple devices
- [ ] Verify all features work
- [ ] Check for crashes
- [ ] Monitor feedback

**Production (1-7 days review):**
- [ ] Submit for review
- [ ] Monitor review status
- [ ] Respond to reviewer questions (if any)
- [ ] Once approved, monitor:
  - [ ] Crash rate (<0.5%)
  - [ ] ANR rate (<0.5%)
  - [ ] User reviews
  - [ ] Install/uninstall rate

**See also:** `docs/ANDROID_RELEASE_CHECKLIST.md` for complete checklist.

---

## iOS Deployment

**Requirements:**
- macOS with Xcode
- Apple Developer account
- App Store Connect access
- Signing certificates configured

### Pre-Deployment (10 minutes)

**1. Update version:**

Open Xcode:
```bash
npm run ios:open
```

Select project → General:
- Version: 1.0.1
- Build: 2

**2. Run checks:**
```bash
npm run lint
npx tsc --noEmit
npm run test
```

**Checklist:**
- [ ] Version numbers updated
- [ ] All tests passing
- [ ] Certificates valid
- [ ] Release notes written
- [ ] Screenshots updated (if UI changed)

### Build Steps (20 minutes)

```bash
# 1. Build production web app
npm run build -- --mode production

# 2. Sync to iOS
npm run ios:sync

# 3. Open in Xcode
npm run ios:open
```

**In Xcode:**
1. Select "Any iOS Device (arm64)" as destination
2. Product → Clean Build Folder
3. Product → Archive
4. Wait for archive to complete (~10 minutes)

### Upload to App Store Connect (15 minutes)

**In Xcode Organizer:**
1. Select archive
2. Click "Distribute App"
3. Select "App Store Connect"
4. Click "Upload"
5. Follow prompts
6. Wait for processing (10-60 minutes)

**In App Store Connect:**

**For TestFlight:**
1. Go to https://appstoreconnect.apple.com
2. Select PrayerMap
3. TestFlight tab
4. Wait for build to process
5. Add to test group
6. Provide test information
7. Submit for TestFlight review

**For Production:**
1. App Store tab
2. Create new version (e.g., 1.0.1)
3. Select build
4. Fill in:
   - What's New (release notes)
   - Keywords (if changed)
   - Screenshots (if changed)
5. Submit for review

**Release notes template:**
```
What's New in Version 1.0.1:
• [New feature 1]
• [New feature 2]
• [Bug fix 1]
• [Bug fix 2]
• Performance improvements
```

### Post-Deployment Verification

**TestFlight (1-2 days):**
- [ ] Build processes successfully
- [ ] Add internal testers
- [ ] Test on multiple devices
- [ ] Verify all features work
- [ ] Monitor TestFlight feedback

**Production (1-3 days review):**
- [ ] Submit for review
- [ ] Monitor review status
- [ ] Respond to reviewer questions
- [ ] Once approved:
  - [ ] Monitor crash reports
  - [ ] Check user reviews
  - [ ] Verify app launches correctly

---

## Emergency Rollback

### Web Rollback (2 minutes)

**Option 1: Instant rollback (Vercel)**

1. Go to https://vercel.com/dashboard
2. Select PrayerMap project
3. Deployments tab
4. Find last known good deployment
5. Click "..." → "Promote to Production"
6. Confirm
7. **Done!** Previous version is live

**Option 2: Revert commit (5 minutes)**

```bash
# Find the bad commit
git log

# Revert it
git revert <bad-commit-hash>

# Push to main
git push origin main

# Vercel auto-deploys the revert
```

### Android Rollback

**Option 1: Halt rollout**
1. Play Console → Release → Production
2. Click "Halt rollout"
3. Stops further deployments
4. Users with new version keep it

**Option 2: Release previous version**
1. Create new release
2. Select previous AAB
3. Submit for review
4. Wait for approval
5. Release to production

**Note:** Cannot instantly rollback. Prevention is key!

### iOS Rollback

**Option 1: Remove from sale** (extreme)
1. App Store Connect
2. Select PrayerMap
3. Remove App from Sale
4. Users cannot download
5. Existing users keep current version

**Option 2: Expedited review**
1. Create new version with previous build
2. Submit for review
3. Request expedited review
4. Explain critical issue
5. Hope for 1-2 day approval

**Note:** iOS rollback is very difficult!

---

## Environment Variables

### Local Development

**File:** `.env.local` (create from `.env.example`)

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_MAPBOX_TOKEN=pk.your-token
VITE_APP_ENV=development
```

### GitHub Secrets

**Location:** Repository → Settings → Secrets and variables → Actions

Required:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MAPBOX_ACCESS_TOKEN` (optional)
- `CODECOV_TOKEN` (optional)

### Vercel Environment Variables

**Location:** Vercel Dashboard → Project → Settings → Environment Variables

Required for Production:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MAPBOX_TOKEN`
- `VITE_APP_ENV` = `production`

Required for Preview:
- Same as production (or use preview/staging values)

---

## Monitoring

### Web (Vercel)

**Dashboard:** https://vercel.com/dashboard

**Check:**
- Deployment status
- Build logs
- Function logs
- Analytics

**Alerts:**
- Failed deployments
- Build errors
- High error rate

### Android (Play Console)

**Dashboard:** https://play.google.com/console

**Monitor:**
- Vitals → Crashes (<0.5%)
- Vitals → ANRs (<0.5%)
- User reviews
- Install/uninstall rate

**Set up:**
- Email alerts for crashes
- Review notifications

### iOS (App Store Connect)

**Dashboard:** https://appstoreconnect.apple.com

**Monitor:**
- TestFlight crashes
- App Store reviews
- Xcode Organizer crashes

**Set up:**
- Email notifications
- Crash report alerts

---

## Common Issues

### CI Failing

**Lint errors:**
```bash
npm run lint -- --fix
```

**Type errors:**
```bash
npx tsc --noEmit
# Fix errors in code
```

**Test failures:**
```bash
npm run test:watch
# Debug and fix failing tests
```

### Build Failing

**Missing environment variables:**
1. Check GitHub secrets
2. Check Vercel environment variables
3. Verify names match exactly

**Import errors:**
```bash
npx tsc --noEmit
# Fix import paths
```

**Cache issues:**
```bash
rm -rf node_modules dist
npm install
npm run build
```

### Mobile Build Issues

**Android Gradle errors:**
```bash
npm run android:clean
npm run android:sync
```

**iOS Archive errors:**
1. Clean build folder (Product → Clean)
2. Delete derived data
3. Restart Xcode
4. Try archive again

### Deployment Issues

**Vercel stuck:**
1. Check build logs
2. Clear Vercel cache
3. Redeploy manually

**App Store rejected:**
1. Read rejection reason
2. Fix issue
3. Submit new build
4. Explain changes in review notes

---

## Quick Commands

### Development
```bash
npm run dev                    # Start dev server
npm run lint                   # Check linting
npx tsc --noEmit              # Type check
npm run test                   # Run tests
npm run build                  # Build production
```

### Mobile
```bash
# Android
npm run android:sync          # Sync to Android
npm run android:build:aab     # Build release AAB

# iOS
npm run ios:sync             # Sync to iOS
npm run ios:open             # Open Xcode

# Both
npm run sync:all             # Sync both platforms
```

### Git
```bash
# Feature workflow
git checkout -b feature/name
git add .
git commit -m "feat: description"
git push origin feature/name

# After PR merged
git checkout main
git pull origin main
```

---

## Deployment Checklist

### Before Every Deployment

- [ ] All tests passing locally
- [ ] Linting clean
- [ ] Type check clean
- [ ] Build successful
- [ ] Manual testing complete
- [ ] Code reviewed
- [ ] Release notes written
- [ ] Version numbers updated (mobile)
- [ ] CHANGELOG.md updated

### After Every Deployment

- [ ] Site/app loads correctly
- [ ] Critical features work
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Monitor for 30 minutes
- [ ] Check error logs
- [ ] Verify user feedback

---

## Contact Information

### In Case of Emergency

**Critical production issue:**
1. Assess severity
2. Rollback if possible
3. Alert team
4. Create hotfix
5. Deploy ASAP
6. Monitor closely

**Escalation:**
- Team Lead: [Contact info]
- DevOps: [Contact info]
- On-call: [Contact info]

**Support:**
- Vercel: https://vercel.com/support
- Supabase: https://supabase.com/support
- Google Play: https://support.google.com/googleplay/android-developer
- Apple Developer: https://developer.apple.com/support

---

## Resources

**Documentation:**
- Full CI/CD Guide: `docs/CICD_GUIDE.md`
- Android Checklist: `docs/ANDROID_RELEASE_CHECKLIST.md`
- Android Integration: `docs/ANDROID_INTEGRATION_SUMMARY.md`
- Main Project Guide: `CLAUDE.md`

**External:**
- [Vercel Docs](https://vercel.com/docs)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Capacitor Docs](https://capacitorjs.com/docs)

---

## Success Criteria

**Every deployment should:**
- ✅ Pass all CI checks
- ✅ Have code review approval
- ✅ Be tested on preview URL
- ✅ Deploy without errors
- ✅ Be verified post-deployment
- ✅ Be monitored for 30 minutes
- ✅ Have no critical issues

**If any step fails, stop and fix before proceeding!**

---

**Keep this runbook handy during deployments!** 🚀

*Last Updated: 2025-11-29*
*PrayerMap Deployment Runbook*
