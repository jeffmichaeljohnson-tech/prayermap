# CI/CD Quick Reference - PrayerMap

**One-page reference for common CI/CD operations**

---

## Deployment Commands

### Web (Automatic)
```bash
# Create and push feature branch
git checkout -b feature/my-feature
git add .
git commit -m "feat: my feature"
git push origin feature/my-feature

# Create PR on GitHub → CI runs → Merge → Auto-deploys to prayermap.net
```

### Android
```bash
# Update version in android/app/build.gradle first!
npm run build -- --mode production
npm run android:sync
npm run android:build:aab
# Upload android/app/build/outputs/bundle/release/app-release.aab to Play Console
```

### iOS (macOS only)
```bash
# Update version in Xcode first!
npm run build -- --mode production
npm run ios:sync
npm run ios:open
# Product → Archive → Distribute
```

---

## Pre-Deployment Checks

```bash
# Run all checks (5 minutes)
npm run lint && npx tsc --noEmit && npm run test && npm run build
```

**Checklist:**
- [ ] Tests pass
- [ ] Linting clean
- [ ] Types valid
- [ ] Build successful
- [ ] Code reviewed

---

## CI Workflow Jobs

| Job | Duration | Fails When |
|-----|----------|------------|
| **Lint** | ~2 min | Code style issues |
| **Type Check** | ~2 min | TypeScript errors |
| **Unit Tests** | ~3 min | Test failures |
| **E2E Tests** | ~5 min | User flow broken |
| **Build** | ~3 min | Build errors |

**Total:** ~10-15 minutes (parallel execution)

---

## Troubleshooting

### Lint Fails
```bash
npm run lint -- --fix
```

### Type Check Fails
```bash
npx tsc --noEmit
# Fix errors in code
```

### Tests Fail
```bash
npm run test:watch
# Debug failing tests
```

### Build Fails
```bash
rm -rf node_modules dist
npm install
npm run build
```

### CI Still Failing
```bash
# Clear cache and try again
git commit --allow-empty -m "chore: trigger CI"
git push
```

---

## Emergency Rollback

### Web (2 minutes)
1. Vercel Dashboard → Deployments
2. Find last good deployment
3. "..." → "Promote to Production"
4. Done!

### Mobile
- **Android:** Play Console → Halt rollout
- **iOS:** No instant rollback (submit new version)

---

## Environment Variables

### Local (.env.local)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_MAPBOX_TOKEN=pk.your-token
VITE_APP_ENV=development
```

### GitHub Secrets
Settings → Secrets → Actions:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Vercel
Dashboard → Settings → Environment Variables:
- `VITE_SUPABASE_URL` (Production)
- `VITE_SUPABASE_ANON_KEY` (Production)
- `VITE_MAPBOX_TOKEN` (Production)
- `VITE_APP_ENV=production` (Production)

---

## Monitoring

### Web
- **Vercel:** https://vercel.com/dashboard
- **GitHub Actions:** Repository → Actions tab

### Mobile
- **Android:** https://play.google.com/console
- **iOS:** https://appstoreconnect.apple.com

**Check:**
- Deployment status
- Error logs
- Crash reports
- User reviews

---

## Common Git Workflows

### Feature Development
```bash
git checkout -b feature/name
# Make changes
git add .
git commit -m "feat: description"
git push origin feature/name
# Create PR → Review → Merge
```

### Hotfix
```bash
git checkout main
git pull
git checkout -b hotfix/critical-bug
# Fix bug
git add .
git commit -m "fix: critical bug"
git push origin hotfix/critical-bug
# Create PR → Emergency review → Merge → Auto-deploy
```

### After PR Merged
```bash
git checkout main
git pull origin main
git branch -d feature/name  # Delete local branch
```

---

## Testing Commands

```bash
# Unit tests
npm run test                  # Run once
npm run test:watch           # Watch mode
npm run test:coverage        # With coverage

# E2E tests
npm run test:e2e             # Run all
npm run test:e2e:ui          # UI mode
npm run test:e2e:debug       # Debug mode

# Linting
npm run lint                 # Check
npm run lint -- --fix        # Auto-fix

# Type checking
npx tsc --noEmit            # Check types
```

---

## Build Commands

```bash
# Development
npm run dev                  # Start dev server (localhost:5173)

# Production
npm run build               # Build for production
npm run preview             # Preview build (localhost:4173)

# Mobile
npm run android:sync        # Sync to Android
npm run ios:sync           # Sync to iOS
npm run sync:all           # Sync both
```

---

## File Locations

| File | Path |
|------|------|
| CI Workflow | `.github/workflows/ci.yml` |
| Vercel Config | `vercel.json` |
| Package Scripts | `package.json` |
| Mobile Config | `capacitor.config.ts` |
| Env Template | `.env.example` |
| Android Build | `android/app/build.gradle` |
| iOS Project | `ios/App.xcodeproj` |

---

## Important URLs

| Service | URL |
|---------|-----|
| Production | https://prayermap.net |
| Vercel | https://vercel.com/dashboard |
| Actions | https://github.com/YOUR_ORG/prayermap/actions |
| Play Console | https://play.google.com/console |
| App Store | https://appstoreconnect.apple.com |

---

## Version Management

### Web
- Automatic (based on git commits)
- No manual version updates needed

### Android
```gradle
// android/app/build.gradle
defaultConfig {
    versionCode 2        // Integer, increment by 1
    versionName "1.0.1"  // String, semantic versioning
}
```

### iOS
```
Xcode → General tab:
- Version: 1.0.1 (matches Android versionName)
- Build: 2 (matches Android versionCode)
```

**Keep mobile versions synchronized!**

---

## Performance Targets

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 2s |
| Lighthouse Performance | > 90 |
| Test Coverage | > 80% |
| Build Time | < 3 min |
| CI Total Time | < 15 min |

---

## Deployment Frequency

| Platform | Typical Frequency |
|----------|-------------------|
| Web (Preview) | Every PR |
| Web (Production) | Daily to weekly |
| Android | Weekly to monthly |
| iOS | Weekly to monthly |

**Mobile deployments require more planning due to app store reviews.**

---

## Post-Deployment Checklist

- [ ] Site/app loads
- [ ] No console errors
- [ ] Critical features work
- [ ] Performance acceptable
- [ ] Monitor for 30 min
- [ ] Check error logs
- [ ] Update CHANGELOG

---

## When Things Go Wrong

1. **Stay calm**
2. **Assess severity**
3. **Rollback if critical**
4. **Alert team**
5. **Create hotfix**
6. **Deploy fix**
7. **Monitor closely**
8. **Post-mortem**

---

## Need More Info?

- **Full Guide:** `docs/CICD_GUIDE.md`
- **Runbook:** `docs/DEPLOYMENT_RUNBOOK.md`
- **Android:** `docs/ANDROID_RELEASE_CHECKLIST.md`
- **Project:** `CLAUDE.md`, `ARTICLE.md`

---

**Print this page and keep it nearby during deployments!** 📋

*Last Updated: 2025-11-29*
