# Auto-Merge Rules for Dependabot

This document outlines the recommended auto-merge strategy for PrayerMap dependency updates, aligned with ARTICLE.md quality standards.

## 🎯 Auto-Merge Philosophy

**Principle:** Automate the safe, minimize review burden on critical updates.

From ARTICLE.md: *"Speed without sacrificing quality"* — we automate patch updates while maintaining rigorous review for breaking changes.

## ✅ Auto-Merge Approved (Green Light)

These updates can be automatically merged after CI passes:

### Patch Updates (All Dependencies)
- **Rule:** All patch version updates (x.y.**Z**)
- **Rationale:** Patch updates are bug fixes only, backward compatible
- **Requirement:** All tests must pass
- **Examples:**
  - `react@19.2.0` → `react@19.2.1` ✅
  - `@supabase/supabase-js@2.83.0` → `@supabase/supabase-js@2.83.1` ✅
  - `mapbox-gl@3.16.0` → `mapbox-gl@3.16.1` ✅

### Security Patches (Any Severity)
- **Rule:** Any version update that fixes a security vulnerability
- **Rationale:** Security is non-negotiable
- **Requirement:** All tests must pass
- **Alert Level:** Critical and High severity MUST be merged immediately

## ⚠️ Auto-Merge with Caution (Yellow Light)

These updates can be auto-merged IF additional checks pass:

### Minor Updates - Development Dependencies
- **Rule:** Minor version updates (x.**Y**.z) for devDependencies only
- **Requirements:**
  - All tests pass (unit + E2E)
  - Build completes successfully
  - No TypeScript errors
  - Bundle size increase < 5%
- **Examples:**
  - `@playwright/test@1.48.0` → `@playwright/test@1.49.0` ✅
  - `vitest@4.0.14` → `vitest@4.1.0` ✅
  - `eslint@9.39.1` → `eslint@9.40.0` ✅

### Grouped Minor Updates (Same Ecosystem)
- **Rule:** Minor updates for packages in the same ecosystem
- **Ecosystems:**
  - Radix UI (`@radix-ui/*`)
  - Testing tools (`@testing-library/*`, `@vitest/*`)
  - Build tools (`@vitejs/*`, `@tailwindcss/*`)
- **Requirements:**
  - All packages in group update together
  - Comprehensive test suite passes
  - Visual regression tests pass (for UI libraries)

## 🛑 Manual Review Required (Red Light)

These updates MUST be manually reviewed:

### Major Version Updates (Breaking Changes)
- **Rule:** Any major version update (**X**.y.z)
- **Rationale:** Breaking changes require code modifications
- **Review Checklist:**
  - [ ] Read migration guide
  - [ ] Check breaking changes list
  - [ ] Update code for new APIs
  - [ ] Test on iOS device
  - [ ] Test on Android device
  - [ ] Test web browser compatibility
  - [ ] Update documentation
- **Examples:**
  - `react@19.x.x` → `react@20.x.x` 🛑
  - `typescript@5.x.x` → `typescript@6.x.x` 🛑
  - `vite@7.x.x` → `vite@8.x.x` 🛑

### Production Dependencies - Minor Updates
- **Rule:** Minor updates for critical production dependencies
- **Critical Dependencies:**
  - `react`, `react-dom` (UI framework)
  - `@supabase/supabase-js` (backend)
  - `@capacitor/*` (mobile)
  - `mapbox-gl` (core feature)
  - `framer-motion` (animations)
- **Rationale:** Core features require thorough testing
- **Review Checklist:**
  - [ ] Run full test suite
  - [ ] Manual QA on mobile devices
  - [ ] Performance benchmarks (Lighthouse)
  - [ ] Check for deprecation warnings
  - [ ] Verify mobile build works (`npm run sync:all`)

### Mobile-Specific Dependencies
- **Rule:** ANY update to Capacitor plugins or mobile-related packages
- **Rationale:** Mobile testing is time-consuming and critical
- **Review Checklist:**
  - [ ] Test on real iOS device
  - [ ] Test on real Android device
  - [ ] Verify permissions still work
  - [ ] Check App Store / Play Store compliance
  - [ ] Test offline functionality
  - [ ] Verify push notifications work
- **Examples:**
  - `@capacitor/android` 🛑
  - `@capacitor/ios` 🛑
  - `@capacitor/camera` 🛑
  - `@capacitor/geolocation` 🛑

## 🤖 GitHub Actions Auto-Merge Setup

To enable auto-merge for Dependabot PRs, create this workflow:

**File:** `.github/workflows/dependabot-auto-merge.yml`

```yaml
name: Dependabot Auto-Merge

on: pull_request_target

permissions:
  pull-requests: write
  contents: write

jobs:
  auto-merge:
    runs-on: ubuntu-latest
    if: github.actor == 'dependabot[bot]'
    steps:
      - name: Dependabot metadata
        id: metadata
        uses: dependabot/fetch-metadata@v2
        with:
          github-token: "${{ secrets.GITHUB_TOKEN }}"

      - name: Auto-merge patch updates
        if: steps.metadata.outputs.update-type == 'version-update:semver-patch'
        run: gh pr merge --auto --squash "$PR_URL"
        env:
          PR_URL: ${{ github.event.pull_request.html_url }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Auto-merge devDependency minor updates
        if: |
          steps.metadata.outputs.update-type == 'version-update:semver-minor' &&
          steps.metadata.outputs.dependency-type == 'direct:development'
        run: gh pr merge --auto --squash "$PR_URL"
        env:
          PR_URL: ${{ github.event.pull_request.html_url }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 📊 Quality Gates (ARTICLE.md Alignment)

All auto-merged updates must meet these quality gates:

| Gate | Target | Enforcement |
|------|--------|-------------|
| Test Coverage | 85%+ | Required for merge |
| Code Quality (CodeQL) | 90%+ | Required for merge |
| Security Vulnerabilities | 0 critical | Required for merge |
| Build Success | 100% | Required for merge |
| TypeScript Errors | 0 | Required for merge |
| Bundle Size Increase | < 5% | Warning only |
| Performance (Lighthouse) | > 90 | Warning only |

## 🔍 Monitoring & Review Schedule

### Weekly Review (Mondays 9 AM)
- Review all open Dependabot PRs
- Merge approved auto-merge PRs
- Prioritize security updates
- Schedule time for major update reviews

### Monthly Audit (First Monday)
- Review ignored major updates
- Plan major version migrations
- Update auto-merge rules if needed
- Review dependency health dashboard

## 🚨 Emergency Override

**When to manually merge immediately:**
1. **Critical security vulnerability** (CVSS score ≥ 9.0)
2. **Zero-day exploit** actively being used
3. **Production outage** caused by dependency bug
4. **App store rejection** due to deprecated dependency

**Process:**
1. Create emergency branch
2. Update dependency
3. Run minimal smoke tests
4. Deploy to production
5. Full testing post-deployment

## 🎓 Learning from Auto-Merge

**Log to memory when:**
- Auto-merge causes an issue
- Manual review catches a problem
- Rules need adjustment

**Memory Log Template:**
```
MEMORY LOG:
Topic: Auto-merge [issue/success]
Dependency: [package-name@version]
Context: [What happened?]
Decision: [How was it resolved?]
Rule Update: [Should auto-merge rules change?]
Prevention: [How to prevent in future?]
Date: [YYYY-MM-DD]
```

## 📞 Questions?

**Before changing auto-merge rules, ask:**
1. Will this maintain our security posture?
2. Will this reduce review burden without reducing quality?
3. Is this aligned with ARTICLE.md quality gates?
4. Have we tested this approach?

---

**Last Updated:** 2025-11-29
**Aligned with:** ARTICLE.md (Autonomous Excellence Manifesto)
**Review Schedule:** Monthly or when issues arise
