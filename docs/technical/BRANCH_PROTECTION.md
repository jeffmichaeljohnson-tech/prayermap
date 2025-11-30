# Branch Protection & Git Workflow

> **Sacred Code Stewardship**: PrayerMap's codebase serves a spiritual mission. Our branch protection rules ensure code quality, security, and reliability for users seeking divine connection.

---

## Table of Contents

1. [Branch Strategy](#branch-strategy)
2. [Branch Protection Rules](#branch-protection-rules)
3. [Branch Naming Conventions](#branch-naming-conventions)
4. [Pull Request Workflow](#pull-request-workflow)
5. [Required Status Checks](#required-status-checks)
6. [Code Review Standards](#code-review-standards)
7. [Emergency Procedures](#emergency-procedures)

---

## Branch Strategy

### Primary Branches

#### `main` (Production Branch)
- **Purpose**: Production-ready code deployed to prayermap.net
- **Protection Level**: Maximum
- **Deploy Target**: Vercel Production
- **Who Can Merge**: Repository administrators with required approvals

#### `develop` (Integration Branch) - *Optional*
- **Purpose**: Integration branch for testing before production
- **Protection Level**: High
- **Deploy Target**: Vercel Preview
- **Who Can Merge**: Maintainers with required approvals

### Supporting Branches

#### Feature Branches
- **Pattern**: `feature/[description]` or `[type]/[description]`
- **Purpose**: New features and enhancements
- **Lifespan**: Short-lived, deleted after merge
- **Branch From**: `main` (or `develop` if using)
- **Merge To**: `main` (or `develop` if using)

#### Bugfix Branches
- **Pattern**: `fix/[description]`
- **Purpose**: Non-critical bug fixes
- **Lifespan**: Short-lived, deleted after merge

#### Hotfix Branches
- **Pattern**: `hotfix/[critical-issue]`
- **Purpose**: Critical production fixes
- **Lifespan**: Very short, deleted after merge
- **Branch From**: `main`
- **Merge To**: `main` (and `develop` if using)

#### Mobile Branches
- **Pattern**: `mobile/[platform]-[description]`
- **Purpose**: Platform-specific mobile work
- **Examples**: `mobile/ios-permissions`, `mobile/android-deep-links`

---

## Branch Protection Rules

### Main Branch Protection (REQUIRED)

Configure these settings in GitHub Settings → Branches → Branch protection rules → `main`:

#### ✅ Require Pull Request Reviews
```yaml
Required approving reviews: 1 (minimum)
Dismiss stale PR approvals: true
Require review from Code Owners: true (if CODEOWNERS file exists)
```

**Reasoning**:
- Prevents unreviewed code from reaching production
- Ensures adherence to 5 Critical Principles (CLAUDE.md)
- Catches mobile compatibility issues before deployment

#### ✅ Require Status Checks to Pass
```yaml
Require branches to be up to date: true
Required status checks:
  - build (Vercel build must succeed)
  - lint (TypeScript/ESLint must pass)
  - type-check (TypeScript strict mode)
  - test (Unit/Integration tests)
  - mobile-compat-check (optional, when implemented)
```

**Reasoning**:
- Prevents broken builds from reaching production
- Enforces TypeScript strict mode (no `any` types)
- Ensures tests pass before merge

#### ✅ Require Conversation Resolution
```yaml
Require conversation resolution before merging: true
```

**Reasoning**: Ensures all review comments are addressed

#### ✅ Require Signed Commits (Optional)
```yaml
Require signed commits: false (optional, enable for enhanced security)
```

**Reasoning**: Verifies commit authenticity

#### ✅ Require Linear History (Recommended)
```yaml
Require linear history: true
```

**Reasoning**: Cleaner git history, easier to debug

#### ✅ Restrictions

```yaml
Restrict pushes: true
Who can push:
  - Repository administrators only
  - Or: Nobody (all changes via PR)
```

**Reasoning**: Enforces PR workflow, prevents accidental direct pushes

#### ✅ Force Push Protection
```yaml
Do not allow force pushes: true
Allow force pushes to matching branches: false
```

**Reasoning**: Prevents history rewriting on production branch

#### ✅ Deletion Protection
```yaml
Do not allow deletions: true
```

**Reasoning**: Prevents accidental branch deletion

#### ⚠️ Include Administrators
```yaml
Include administrators: true (RECOMMENDED)
```

**Reasoning**: Even admins should follow the process for code quality

---

### GitHub Settings Configuration

To configure branch protection rules:

1. **Navigate to Settings**
   ```
   Repository → Settings → Branches → Add branch protection rule
   ```

2. **Branch Name Pattern**
   ```
   main
   ```

3. **Apply These Rules** (in order):

   **Protect matching branches:**
   - [x] Require a pull request before merging
     - [x] Require approvals: 1
     - [x] Dismiss stale pull request approvals when new commits are pushed
     - [ ] Require review from Code Owners (if CODEOWNERS exists)
     - [ ] Restrict who can dismiss pull request reviews (optional)

   - [x] Require status checks to pass before merging
     - [x] Require branches to be up to date before merging
     - Status checks (add when CI/CD configured):
       - `build`
       - `lint`
       - `type-check`
       - `test`

   - [x] Require conversation resolution before merging

   - [x] Require signed commits (optional)

   - [x] Require linear history

   - [x] Require deployments to succeed before merging (optional)

   - [x] Lock branch (optional, for emergency freeze)

   - [x] Do not allow bypassing the above settings
     - [x] Include administrators

   - [x] Restrict who can push to matching branches
     - Specify: Repository administrators
     - OR: Leave empty to require PRs from everyone

   - [x] Allow force pushes: NO

   - [x] Allow deletions: NO

4. **Save Changes**

---

## Branch Naming Conventions

### Standard Format

```
<type>/<description>
```

### Types (aligned with commit message types)

| Type | Purpose | Example |
|------|---------|---------|
| `feat` | New feature | `feat/audio-prayer-recording` |
| `fix` | Bug fix | `fix/map-marker-clustering` |
| `mobile` | Mobile-specific | `mobile/ios-permissions` |
| `refactor` | Code refactoring | `refactor/prayer-validation` |
| `docs` | Documentation | `docs/api-documentation` |
| `style` | Code style | `style/eslint-config` |
| `test` | Testing | `test/e2e-prayer-flow` |
| `chore` | Maintenance | `chore/dependency-updates` |
| `hotfix` | Critical production fix | `hotfix/auth-token-expiry` |

### Naming Best Practices

**DO:**
- ✅ Use lowercase with hyphens: `feat/user-authentication`
- ✅ Be descriptive but concise: `fix/ios-geolocation-permissions`
- ✅ Reference issue if relevant: `feat/123-video-responses`
- ✅ Use platform prefix for mobile: `mobile/android-deep-links`

**DON'T:**
- ❌ Use spaces: `feat/user authentication`
- ❌ Be too vague: `fix/bug`
- ❌ Use special characters: `feat/user_auth!`
- ❌ Make too long: `feat/implement-user-authentication-with-social-login-and-magic-links`

### Examples

```bash
# Good branch names
feat/prayer-response-system
fix/marker-clustering-ios
mobile/android-notification-setup
refactor/supabase-client-initialization
docs/branch-protection-guide
test/playwright-mobile-tests
hotfix/rls-policy-bypass

# Bad branch names
new-feature          # Too vague
fix                  # No description
user_authentication  # Underscores instead of hyphens
feat/this-is-a-very-long-branch-name-that-describes-everything  # Too long
```

---

## Pull Request Workflow

### Step-by-Step Process

#### 1. Create Feature Branch

```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Create feature branch
git checkout -b feat/your-feature-name
```

#### 2. Develop & Commit

```bash
# Make changes
# Follow commit message conventions (see CLAUDE.md)

git add .
git commit -m "feat: Add prayer response system"

# Make more commits as needed
git commit -m "test: Add e2e tests for prayer responses"
```

**Commit Message Format** (from CLAUDE.md):
```
<type>: <description>

Types: feat, fix, refactor, docs, style, test, chore, mobile

Examples:
✅ feat: Add audio prayer recording
✅ fix: Resolve map marker clustering on iOS
✅ mobile: Add haptic feedback to prayer submission
✅ refactor: Extract prayer validation logic
```

#### 3. Push Branch

```bash
# First push
git push -u origin feat/your-feature-name

# Subsequent pushes
git push
```

#### 4. Create Pull Request

1. **Go to GitHub**: Repository → Pull requests → New pull request
2. **Select branches**: `base: main` ← `compare: feat/your-feature-name`
3. **Fill out PR template**: (auto-populated from `.github/PULL_REQUEST_TEMPLATE.md`)
   - Summary of changes
   - Type of change
   - Critical Principles Checklist (ALL items)
   - Quality Gates verification
   - Testing details
   - Mobile considerations
   - Security review

4. **Add reviewers**: Assign at least 1 reviewer
5. **Add labels**: `feature`, `mobile`, `needs-testing`, etc.
6. **Link issues**: Reference related issues

#### 5. Address Review Comments

```bash
# Make requested changes
git add .
git commit -m "fix: Address review comments - improve error handling"
git push

# If significant changes, update PR description
```

#### 6. Ensure Status Checks Pass

Monitor these required checks:
- ✅ Build (Vercel)
- ✅ TypeScript type check
- ✅ ESLint
- ✅ Tests
- ✅ Mobile compatibility (when implemented)

#### 7. Merge Pull Request

Once approved and checks pass:

1. **Update branch** (if behind main):
   ```bash
   git checkout feat/your-feature-name
   git merge main
   # Resolve conflicts if any
   git push
   ```

2. **Merge method** (choose one):
   - **Squash and merge** (RECOMMENDED for feature branches)
     - Combines all commits into one
     - Cleaner history
     - Single revert point

   - **Rebase and merge** (for clean, logical commits)
     - Maintains individual commits
     - Linear history
     - Use if commits are well-structured

   - **Create merge commit** (for important branches)
     - Preserves full history
     - Shows branch context

3. **Delete branch** (after merge):
   ```bash
   git branch -d feat/your-feature-name
   git push origin --delete feat/your-feature-name
   ```

---

## Required Status Checks

### Current Status Checks

Configure these in GitHub Settings → Branches → Status checks:

#### 1. Build Check
```yaml
Name: build
Description: Vercel build must succeed
Required: true
```

**Verifies**:
- TypeScript compiles without errors
- Vite build succeeds
- No runtime errors during build

#### 2. Type Check
```yaml
Name: type-check
Description: TypeScript strict mode compliance
Required: true
Command: npx tsc --noEmit
```

**Verifies**:
- No `any` types used
- Strict mode compliance
- Type definitions correct

#### 3. Lint Check
```yaml
Name: lint
Description: ESLint passes
Required: true
Command: npm run lint
```

**Verifies**:
- Code style consistency
- No ESLint errors
- Best practices followed

#### 4. Test Check
```yaml
Name: test
Description: All tests pass
Required: true
Command: npm test
```

**Verifies**:
- Unit tests pass
- Integration tests pass
- No regression

### Future Status Checks (To Implement)

#### 5. Mobile Compatibility Check
```yaml
Name: mobile-compat-check
Description: Mobile build verification
Required: true (when implemented)
Commands:
  - npm run build
  - npx cap sync
  - iOS build check
  - Android build check
```

#### 6. E2E Tests
```yaml
Name: e2e
Description: End-to-end tests
Required: false (initially)
Command: npx playwright test
```

#### 7. Performance Budget
```yaml
Name: performance
Description: Bundle size and Lighthouse checks
Required: true (when implemented)
Thresholds:
  - Bundle size < 500kb
  - FCP < 1.5s
  - TTI < 2s
```

---

## Code Review Standards

### Reviewer Responsibilities

Every reviewer must verify:

#### ✅ Critical Principles (from CLAUDE.md)

1. **Research-Driven Development**
   - [ ] Implementation based on official documentation?
   - [ ] Sources credible and current?
   - [ ] Version compatibility verified?

2. **iOS & Android Deployment**
   - [ ] Works on iOS Safari?
   - [ ] Works on Android Chrome?
   - [ ] Native permissions handled?
   - [ ] Capacitor sync performed?

3. **Living, Breathing App**
   - [ ] Animations at 60fps?
   - [ ] Fast and responsive?
   - [ ] Tasteful motion?
   - [ ] Proper loading states?

4. **Minimal Steps UX**
   - [ ] User steps minimized?
   - [ ] Friction points addressed?
   - [ ] Forms simplified?

5. **Query Memory**
   - [ ] Past decisions consulted?
   - [ ] Memory logged for future?

#### ✅ Code Quality

- [ ] TypeScript strict mode (no `any`)
- [ ] Proper error handling
- [ ] Accessibility (ARIA, keyboard nav)
- [ ] Security (no RLS bypass, no secrets)
- [ ] Tests comprehensive
- [ ] Documentation updated

#### ✅ Performance

- [ ] Bundle size impact acceptable
- [ ] No performance regression
- [ ] Lazy loading where appropriate
- [ ] Image optimization

#### ✅ Mobile Compatibility

- [ ] Tested on iOS (if mobile-related)
- [ ] Tested on Android (if mobile-related)
- [ ] Touch targets minimum 44x44
- [ ] Safe areas respected

### Review Process

1. **Read PR Description Thoroughly**
   - Understand what and why
   - Check all checklist items completed

2. **Review Code Changes**
   - Check for adherence to standards
   - Look for edge cases
   - Verify error handling

3. **Test Locally** (for significant changes)
   ```bash
   git fetch origin
   git checkout -b review-branch origin/feat/feature-name
   npm install
   npm run dev
   # Test the feature
   ```

4. **Provide Constructive Feedback**
   - Be specific: "On line 42, consider..."
   - Be kind: "Great work on X, but..."
   - Suggest alternatives: "Instead of Y, try Z because..."
   - Reference docs: "According to React docs..."

5. **Approve or Request Changes**
   - Approve: If all checks pass
   - Comment: For minor suggestions
   - Request Changes: For blocking issues

### Review Response Time

- **Critical hotfixes**: < 2 hours
- **Standard PRs**: < 24 hours
- **Large features**: < 48 hours

---

## Emergency Procedures

### Hotfix Workflow (Critical Production Issues)

When a critical bug is discovered in production:

#### 1. Create Hotfix Branch

```bash
# Branch from main (current production)
git checkout main
git pull origin main
git checkout -b hotfix/critical-issue-description
```

#### 2. Implement Fix

```bash
# Make minimal changes to fix issue
git add .
git commit -m "hotfix: Fix critical auth token expiry issue"
```

#### 3. Test Thoroughly

```bash
# Run all tests
npm test

# Test mobile if applicable
npm run build && npx cap sync
```

#### 4. Create PR with HOTFIX Label

- **Title**: `HOTFIX: [Brief description]`
- **Label**: `hotfix`, `critical`
- **Reviewers**: All available maintainers
- **Description**: Clear explanation of issue and fix

#### 5. Expedited Review

- Request immediate review from 1+ maintainers
- Review within 1 hour
- Merge as soon as approved

#### 6. Deploy Immediately

```bash
# Merge to main triggers production deploy
# Monitor deployment closely
```

#### 7. Post-Mortem

Within 24 hours, document:
- What went wrong?
- Why did it reach production?
- How do we prevent this?
- What tests/checks should we add?

### Rollback Procedure

If a deployment causes critical issues:

#### Option 1: Revert Commit

```bash
# On main branch
git revert <commit-hash>
git push origin main
# Production deploys automatically
```

#### Option 2: Redeploy Previous Version (Vercel)

1. Go to Vercel dashboard
2. Find last known good deployment
3. Click "Promote to Production"

### Branch Lock (Emergency Freeze)

To freeze all changes during critical incident:

1. **GitHub Settings** → Branches → `main` protection rule
2. **Check**: "Lock branch"
3. Only administrators can push
4. **Uncheck** when incident resolved

---

## Additional Resources

### Related Documentation

- **CLAUDE.md** - Core project principles
- **ARTICLE.md** - Autonomous Excellence Manifesto (REQUIRED READING)
- **AGENTS.md** - Agent guidelines and conventions
- **docs/technical/API-SPEC.md** - API documentation
- **PRD.md** - Product requirements

### External Resources

- [GitHub Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Git Branching Best Practices](https://git-scm.com/book/en/v2/Git-Branching-Branching-Workflows)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

## Quick Reference

### Common Commands

```bash
# Create feature branch
git checkout -b feat/feature-name

# Update branch with main
git checkout feat/feature-name
git merge main

# Push branch
git push -u origin feat/feature-name

# Delete local branch
git branch -d feat/feature-name

# Delete remote branch
git push origin --delete feat/feature-name

# Check branch protection status
gh api repos/:owner/:repo/branches/main/protection
```

### GitHub CLI Commands

```bash
# Create PR
gh pr create --title "feat: Feature name" --body "Description"

# List PRs
gh pr list

# Check PR status
gh pr status

# Review PR
gh pr review <number> --approve
gh pr review <number> --request-changes --body "Comments"

# Merge PR
gh pr merge <number> --squash
```

---

## Enforcement

This document defines **mandatory** procedures for PrayerMap development. Violation of branch protection rules or workflow standards jeopardizes:

- Code quality
- User trust
- Production stability
- Team collaboration
- Our spiritual mission

**All contributors must read and follow these guidelines.**

---

**Last Updated**: 2025-11-29
**Maintained For**: Claude Code (Anthropic CLI)
**Version**: 1.0

---

*This is a sacred project. Protect the codebase accordingly.*

**Remember**: Read [ARTICLE.md](./ARTICLE.md) daily. It is the source of truth.
