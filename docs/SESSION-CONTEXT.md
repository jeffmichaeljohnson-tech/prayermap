# SESSION-CONTEXT.md - Pre-Session Information Template

> **PURPOSE:** Complete this template before starting any multi-agent workflow or complex development session. This context enables AI agents to operate at 9.5+ efficiency by eliminating guesswork and preventing common failures.

---

## Quick Copy Template

```markdown
## Session Context for [DATE]

### Authentication Status
- GitHub: [SSH ✅ | Token ✅ | Needs Refresh ❌] - Last verified: [date]
- Supabase CLI: [Logged in ✅ | Expired ❌] - `supabase projects list` works: [yes/no]
- Vercel CLI: [Logged in ✅ | Expired ❌] - `vercel whoami` works: [yes/no]
- AWS CLI: [Configured ✅ | Not configured ❌]

### Git State
- Current branch: [branch-name]
- Commits ahead of main: [X]
- Uncommitted changes: [none | list files]
- Push status: [up to date | behind | ahead]
- Last successful push: [date/time]

### Database State
- Production project: oomrmfhvsxtxgqqthisz
- Migrations tracked remotely: [X] migrations
- Known untracked migrations: [list or "none"]
- Dev branch exists: [yes/no] - Status: [ACTIVE_HEALTHY | MIGRATIONS_FAILED | none]

### Environment Variables
- .env.local last updated: [date]
- Known issues: [list or "none"]
- Vercel env vars synced: [yes/no]

### Today's Goals
1. [Primary goal]
2. [Secondary goal]
3. [Stretch goal]

### Constraints & Blockers
- Must not: [list any hard constraints]
- Known blockers: [list or "none"]
- Dependencies on other work: [list or "none"]

### Definition of Done
- [ ] [Specific completion criteria 1]
- [ ] [Specific completion criteria 2]
- [ ] [Verification step]
- [ ] [Committed to git]
- [ ] [Pushed to remote]
```

---

## Section Details

### 1. Authentication Status

**Why it matters:** Authentication failures cause 30%+ of agent failures. Knowing auth state upfront prevents wasted cycles.

**How to check:**

```bash
# GitHub - Check if token is valid
gh auth status

# GitHub - Test SSH
ssh -T git@github.com

# Supabase - Check if logged in
supabase projects list

# Vercel - Check if logged in
vercel whoami

# AWS - Check credentials
aws sts get-caller-identity
```

**If expired, refresh with:**
```bash
gh auth login           # GitHub
supabase login          # Supabase
vercel login            # Vercel
```

---

### 2. Git State

**Why it matters:** Agents need to know if they can push, if there's uncommitted work from previous sessions, and what branch context they're operating in.

**How to check:**

```bash
# Full status
git status

# Commits ahead/behind
git log --oneline origin/main..HEAD  # Commits ahead
git log --oneline HEAD..origin/main  # Commits behind

# Check remote connection
git remote -v
git fetch --dry-run
```

**Critical info to provide:**
- Branch name and its relationship to main/production
- Any uncommitted work that needs to be committed first
- Whether git push will succeed (test with `git push --dry-run`)

---

### 3. Database State

**Why it matters:** Migration tracking mismatches cause branch creation failures and potential data loss.

**How to check:**

```bash
# List remote migrations
supabase migration list

# Compare with local
ls -la supabase/migrations/

# Check for dangerous migrations
grep -l "DROP TABLE" supabase/migrations/*.sql
```

**Provide:**
- Which migrations exist locally vs remotely
- Any migrations that were manually applied (not tracked)
- Known dangerous migrations (schema resets, etc.)

---

### 4. Environment Variables

**Why it matters:** Missing or misconfigured env vars cause silent failures in production.

**Key concerns:**
- Are VITE_ prefixed vars actually safe for client exposure?
- Are there duplicate definitions?
- Is Vercel dashboard in sync with local?

---

### 5. Today's Goals

**Why it matters:** Clear goals enable agents to prioritize and make autonomous decisions.

**Good goal:** "Enable RLS on moderation_results with both service_role and admin policies"

**Bad goal:** "Fix security stuff"

---

### 6. Constraints & Blockers

**Why it matters:** Prevents agents from attempting impossible tasks or breaking important invariants.

**Examples:**
- "Do NOT merge to main - we're still stabilizing the refactor"
- "moderation_results needs admin READ access for oversight, not just service_role"
- "Migration 000 is intentionally archived - don't restore it"

---

### 7. Definition of Done

**Why it matters:** Prevents partial implementations. Agents know exactly when to stop.

**Good definition of done:**
```markdown
- [ ] RLS enabled on moderation_results (verified via pg_tables)
- [ ] Service role policy created (verified via pg_policies)
- [ ] Admin read policy created (verified via pg_policies)
- [ ] Test: regular user CANNOT access table
- [ ] Test: admin CAN read table
- [ ] Migration file created in supabase/migrations/
- [ ] Committed to git with descriptive message
- [ ] Pushed to remote
```

**Bad definition of done:**
```markdown
- [ ] Security is improved
```

---

## Example: Completed Session Context

```markdown
## Session Context for 2025-12-03

### Authentication Status
- GitHub: SSH ✅ - Last verified: today
- Supabase CLI: Logged in ✅ - `supabase projects list` works: yes
- Vercel CLI: Logged in ✅ - `vercel whoami` works: yes
- AWS CLI: Configured ✅

### Git State
- Current branch: refactor/modular-architecture
- Commits ahead of main: 10
- Uncommitted changes:
  - supabase/migrations/_archived/000_reset_schema.sql (moved)
  - supabase/migrations/20241126_admin_tables.sql (renamed)
- Push status: ahead (10 commits not pushed)
- Last successful push: 2025-12-01

### Database State
- Production project: oomrmfhvsxtxgqqthisz
- Migrations tracked remotely: 1 (20251203_fix_rls_performance)
- Known untracked migrations: 001-007, 20241126 (applied manually before CLI tracking)
- Dev branch exists: no

### Environment Variables
- .env.local last updated: 2025-11-30
- Known issues:
  - VITE_HIVE_API_KEY should not have VITE_ prefix (server-side only)
  - Duplicate VITE_MAPBOX_TOKEN definitions (lines 15 and 37)
- Vercel env vars synced: no (need to configure preview environment)

### Today's Goals
1. Fix RLS security on moderation_results (COMPLETE implementation)
2. Create Supabase dev branch successfully
3. Configure Vercel environment variables for dev/prod isolation

### Constraints & Blockers
- Must not: Run migration 000 (archived - would drop all tables)
- Must not: Merge to main yet (still stabilizing refactor)
- Known blockers:
  - Git push may fail if token expired
  - Supabase branch creation requires all migrations to work on fresh DB

### Definition of Done for RLS Security
- [ ] moderation_results has RLS enabled (query pg_tables)
- [ ] "Service role full access" policy exists (FOR ALL TO service_role)
- [ ] "Admins can view moderation results" policy exists (FOR SELECT with admin check)
- [ ] Verified: anon role CANNOT access table
- [ ] Verified: admin role CAN read table
- [ ] Migration committed to supabase/migrations/
- [ ] Changes pushed to remote
```

---

## Integration with SEATBELT

Run SEATBELT first, then complete Session Context:

```bash
# 1. Run SEATBELT audit
npm run seatbelt

# 2. Check auth status
gh auth status && supabase projects list && vercel whoami

# 3. Check git status
git status && git log --oneline -5

# 4. Check migrations
supabase migration list

# 5. Complete SESSION-CONTEXT template above
```

---

## When to Use This Template

| Scenario | Required? |
|----------|-----------|
| Multi-agent workflow (3+ agents) | **YES** |
| Complex infrastructure changes | **YES** |
| Database migrations | **YES** |
| First session of the day | Recommended |
| Simple bug fix | Optional |
| Documentation updates | Optional |

---

## Related Documentation

- **[SEATBELT.md](./SEATBELT.md)** - Configuration audit (run first)
- **[ACCEPTANCE-CRITERIA.md](./ACCEPTANCE-CRITERIA.md)** - Definition of done standards
- **[AI-AGENTS.md](./AI-AGENTS.md)** - Multi-agent coordination
- **[SECURITY-SPEC.md](./SECURITY-SPEC.md)** - RLS policy design intent

---

**Last Updated:** 2025-12-03
**Version:** 1.0
**Purpose:** Eliminate context gaps that cause agent failures
