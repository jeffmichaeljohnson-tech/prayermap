# GitHub Repository Settings Guide

> **Quick Reference**: Step-by-step guide to configure GitHub repository settings for PrayerMap

---

## Branch Protection Rules Configuration

### Navigate to Settings

1. Go to: **Repository** → **Settings** → **Branches**
2. Click: **Add branch protection rule**

---

## Main Branch Protection Settings

### Branch Name Pattern
```
main
```

### Configuration Checklist

Copy this checklist when configuring:

#### ✅ Protect matching branches

**Require a pull request before merging**
- [x] Require a pull request before merging
  - [x] Require approvals: **1** (minimum)
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [ ] Require review from Code Owners *(enable when CODEOWNERS file added)*
  - [ ] Restrict who can dismiss pull request reviews *(optional)*
  - [ ] Allow specified actors to bypass required pull requests *(leave unchecked)*

**Require status checks to pass before merging**
- [x] Require status checks to pass before merging
  - [x] Require branches to be up to date before merging
  - **Status checks that are required** (add these when CI/CD configured):
    - `build` - Vercel build must succeed
    - `lint` - ESLint must pass
    - `type-check` - TypeScript strict mode
    - `test` - Unit/integration tests must pass

**Require conversation resolution before merging**
- [x] Require conversation resolution before merging

**Require signed commits** *(optional)*
- [ ] Require signed commits
  - *Enable for enhanced security (optional)*

**Require linear history** *(recommended)*
- [x] Require linear history
  - *Creates cleaner git history*

**Require deployments to succeed before merging** *(optional)*
- [ ] Require deployments to succeed before merging
  - *Configure when deployment checks needed*

**Lock branch** *(emergency use only)*
- [ ] Lock branch
  - *Only use during emergency freeze*

**Do not allow bypassing the above settings** *(critical)*
- [x] Do not allow bypassing the above settings
  - [x] **Include administrators** *(HIGHLY RECOMMENDED)*
    - *Even admins should follow the process*

**Restrict who can push to matching branches**
- [x] Restrict who can push to matching branches
  - **Restrict pushes that create matching branches**
    - Add: Repository administrators
    - OR: Leave empty (all changes via PR - RECOMMENDED)

**Rules applied to everyone including administrators**
- [x] Allow force pushes: **NO** *(unchecked)*
- [x] Allow deletions: **NO** *(unchecked)*

### Save Changes

Click: **Create** or **Save changes**

---

## Status Checks Setup (CI/CD)

### Required Status Checks (To Configure)

When setting up CI/CD pipeline (GitHub Actions, Vercel, etc.), ensure these checks are created:

#### 1. Build Check
```yaml
# .github/workflows/build.yml
name: Build
on: [pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm run build
```

#### 2. Type Check
```yaml
# .github/workflows/type-check.yml
name: Type Check
on: [pull_request]
jobs:
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npx tsc --noEmit
```

#### 3. Lint Check
```yaml
# .github/workflows/lint.yml
name: Lint
on: [pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm run lint
```

#### 4. Test Check
```yaml
# .github/workflows/test.yml
name: Test
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm test
```

---

## Additional Repository Settings

### General Settings

**Navigate to**: Settings → General

#### Default Branch
```
Default branch: main
```

#### Pull Requests
- [x] Allow squash merging
  - Default message: Pull request title
- [x] Allow merge commits *(optional)*
- [ ] Allow rebase merging *(optional)*
- [x] Automatically delete head branches *(recommended)*

#### Issues
- [x] Issues enabled

#### Wikis
- [ ] Wikis *(optional)*

#### Discussions
- [x] Discussions *(recommended for community)*

---

## Security Settings

**Navigate to**: Settings → Security → Code security and analysis

### Recommended Security Features

- [x] **Dependency graph**: Enabled
- [x] **Dependabot alerts**: Enabled
- [x] **Dependabot security updates**: Enabled
- [x] **Dependabot version updates**: Enabled (create `dependabot.yml`)
- [x] **Code scanning**: Enabled (CodeQL)
- [x] **Secret scanning**: Enabled
- [x] **Push protection**: Enabled (prevents committing secrets)

### Dependabot Configuration

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  # npm dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "your-team-name"
    labels:
      - "dependencies"
      - "automated"

  # Admin npm dependencies
  - package-ecosystem: "npm"
    directory: "/admin"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    labels:
      - "dependencies"
      - "admin"

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"
      - "ci"
```

---

## Collaboration Settings

**Navigate to**: Settings → Collaborators and teams

### Team Permissions (if using teams)

| Team | Permission | Purpose |
|------|-----------|---------|
| Admins | Admin | Full access |
| Maintainers | Maintain | Merge PRs, manage issues |
| Contributors | Write | Create PRs, push to branches |
| Reviewers | Triage | Review PRs, label issues |

---

## Webhooks & Integrations

**Navigate to**: Settings → Webhooks

### Recommended Integrations

1. **Vercel** - Automatic deployments
   - Events: `push`, `pull_request`

2. **Slack/Discord** - Team notifications
   - Events: `pull_request`, `issues`, `push`

3. **CodeCov** - Test coverage reports
   - Events: `push`, `pull_request`

---

## Labels Configuration

**Navigate to**: Issues → Labels

### Recommended Labels

Create these labels for better organization:

| Label | Color | Description |
|-------|-------|-------------|
| `bug` | #d73a4a | Something isn't working |
| `enhancement` | #a2eeef | New feature or request |
| `documentation` | #0075ca | Documentation improvements |
| `mobile` | #e99695 | Mobile-specific (iOS/Android) |
| `performance` | #f9d0c4 | Performance optimization |
| `security` | #b60205 | Security-related |
| `breaking-change` | #d93f0b | Breaking changes |
| `good-first-issue` | #7057ff | Good for newcomers |
| `help-wanted` | #008672 | Extra attention needed |
| `hotfix` | #b60205 | Critical production fix |
| `dependencies` | #0366d6 | Dependency updates |
| `automated` | #ededed | Automated PR (Dependabot, etc.) |

---

## Actions Permissions

**Navigate to**: Settings → Actions → General

### Actions Permissions
- [x] Allow all actions and reusable workflows *(or restrict as needed)*

### Workflow Permissions
- [x] Read and write permissions
- [x] Allow GitHub Actions to create and approve pull requests *(for Dependabot)*

---

## Environment Configuration

**Navigate to**: Settings → Environments

### Create Environments

#### 1. Production
```yaml
Environment name: production
Deployment branches: main only
Required reviewers: 1-2 maintainers
Wait timer: 0 minutes
Environment secrets:
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
  - MAPBOX_TOKEN
```

#### 2. Staging (Optional)
```yaml
Environment name: staging
Deployment branches: develop, release/*
Required reviewers: 0
Environment secrets: (same as production)
```

---

## Repository Visibility

**Navigate to**: Settings → General → Danger Zone

### Current Setting
- [x] **Public** *(if open source)*
- [ ] **Private** *(if closed source)*

---

## Verification Checklist

After configuration, verify:

- [ ] Branch protection active on `main`
- [ ] At least 1 PR approval required
- [ ] Status checks configured (when CI/CD ready)
- [ ] Force push disabled on `main`
- [ ] Branch auto-delete enabled
- [ ] Dependabot enabled
- [ ] Secret scanning enabled
- [ ] Labels created
- [ ] Team permissions set (if applicable)
- [ ] Environments configured

---

## Testing Branch Protection

Test that branch protection works:

```bash
# Try to push directly to main (should fail)
git checkout main
echo "test" >> test.txt
git add test.txt
git commit -m "test: Direct push"
git push origin main
# Expected: ! [remote rejected] main -> main (protected branch hook declined)

# Correct workflow (should work)
git checkout -b test/branch-protection
git push -u origin test/branch-protection
# Create PR on GitHub → Get approval → Merge
```

---

## Troubleshooting

### Common Issues

**Issue**: "Required status checks are not passing"
- **Solution**: Ensure all CI/CD checks are configured and passing

**Issue**: "Branch is out of date"
- **Solution**: Update branch with main before merging
  ```bash
  git checkout feature-branch
  git merge main
  git push
  ```

**Issue**: "Administrator bypass not working"
- **Solution**: Ensure "Include administrators" is unchecked if bypass needed

**Issue**: "Can't push to branch"
- **Solution**: Verify push restrictions aren't blocking your user/team

---

## Next Steps

1. **Configure branch protection** using this guide
2. **Set up CI/CD** (GitHub Actions or Vercel checks)
3. **Create team structure** (if using teams)
4. **Test workflow** with a dummy PR
5. **Document custom rules** specific to your team

---

## Related Documentation

- **[BRANCH_PROTECTION.md](./BRANCH_PROTECTION.md)** - Detailed branch protection guide
- **[CONTRIBUTING.md](../../CONTRIBUTING.md)** - Contributing guidelines
- **[CLAUDE.md](../../CLAUDE.md)** - Core project principles

---

**Last Updated**: 2025-11-29
**Maintained For**: PrayerMap Repository Administrators
**Version**: 1.0

---

*Protect the sacred codebase with proper configuration.*
