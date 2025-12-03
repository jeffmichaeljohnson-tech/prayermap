# ACCEPTANCE-CRITERIA.md - Definition of Done Standards

> **PURPOSE:** Define clear, verifiable completion criteria for all development tasks. Agents MUST NOT mark work as complete until ALL criteria are met.

---

## Core Principle

**"Done" means DONE** - not "mostly done" or "works on my machine."

Every task has three phases:
1. **Implementation** - Write the code/config
2. **Verification** - Prove it works
3. **Persistence** - Commit, push, document

All three phases must complete before marking done.

---

## Universal Acceptance Criteria

These apply to EVERY task, regardless of type:

### ✅ Code Changes
- [ ] Code compiles without errors (`npm run build`)
- [ ] TypeScript passes (`npx tsc --noEmit`)
- [ ] Linting passes (`npm run lint`)
- [ ] No console errors in browser
- [ ] Works on mobile viewport (375px width minimum)

### ✅ Git Hygiene
- [ ] Changes committed with descriptive message
- [ ] Commit follows conventional commits format (`feat:`, `fix:`, `chore:`)
- [ ] Changes pushed to remote (`git push` succeeds)
- [ ] No secrets or .env files committed

### ✅ Documentation
- [ ] FEATURE.md updated if module structure changed
- [ ] README updated if setup steps changed
- [ ] Comments added for non-obvious logic only

---

## Task-Specific Criteria

### Database Migrations

```markdown
## Migration Acceptance Criteria

### Implementation
- [ ] Migration file created in supabase/migrations/
- [ ] Filename follows pattern: YYYYMMDD_description.sql
- [ ] SQL is syntactically correct
- [ ] Includes rollback comments (how to undo if needed)

### Verification
- [ ] Migration applies cleanly to fresh database
- [ ] Migration works on existing database (tested on branch)
- [ ] No data loss on existing records
- [ ] Indexes created for foreign keys
- [ ] RLS policies added for new tables

### Persistence
- [ ] Migration tracked in Supabase (`supabase migration list` shows it)
- [ ] Committed to git
- [ ] Pushed to remote

### For Destructive Migrations (DROP, DELETE, TRUNCATE)
- [ ] ADDITIONAL: Explicit approval from JJ before applying
- [ ] ADDITIONAL: Backup verification or rollback plan documented
- [ ] ADDITIONAL: Migration tested on dev branch first
```

---

### RLS Policy Changes

```markdown
## RLS Policy Acceptance Criteria

### Implementation
- [ ] Policy created with descriptive name
- [ ] Policy uses optimized pattern: `(select auth.uid())` not `auth.uid()`
- [ ] Policy targets correct role (anon, authenticated, service_role)
- [ ] USING clause defines read access correctly
- [ ] WITH CHECK clause defines write access correctly

### Verification
- [ ] Query pg_policies to confirm policy exists:
      SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'X';
- [ ] Test: unauthorized role CANNOT access (returns 0 rows)
- [ ] Test: authorized role CAN access (returns expected data)
- [ ] Test: write operations respect WITH CHECK clause

### Security Verification
- [ ] No overly permissive policies (avoid `USING (true)` for authenticated)
- [ ] Admin access requires admin_roles check, not just authenticated
- [ ] Service role policies use `TO service_role`, not JWT checks

### Persistence
- [ ] Policy created via migration file (not manual SQL)
- [ ] Migration committed and pushed
```

---

### Supabase Branch Creation

```markdown
## Branch Creation Acceptance Criteria

### Pre-Requisites
- [ ] All local migrations can run on fresh database (tested)
- [ ] No migrations reference data that won't exist
- [ ] Supabase CLI authenticated (`supabase projects list` works)
- [ ] Cost confirmation obtained

### Implementation
- [ ] Branch created via `create_branch` API
- [ ] Branch name is descriptive (e.g., "develop", "feature-x")

### Verification
- [ ] Branch status is ACTIVE_HEALTHY (not MIGRATIONS_FAILED)
- [ ] Branch project_ref is accessible via API
- [ ] All migrations applied successfully (list_migrations returns expected count)
- [ ] Can connect to branch database and query tables

### Post-Creation
- [ ] Branch credentials documented (URL, anon key)
- [ ] Vercel preview environment configured (or manual steps documented)
- [ ] Branch ID recorded for future operations

### If Branch Creation Fails
- [ ] Delete failed branch immediately (stop billing)
- [ ] Identify which migration failed
- [ ] Fix migration and retry
```

---

### Environment Variable Changes

```markdown
## Environment Variable Acceptance Criteria

### Classification
- [ ] Variable correctly classified: client-side (VITE_) vs server-side
- [ ] Sensitive variables do NOT have VITE_ prefix
- [ ] Variable name is descriptive and follows convention

### Implementation
- [ ] Added to .env.local for local development
- [ ] Added to .env.example with placeholder value
- [ ] Added to Vercel dashboard (or documented for manual add)
- [ ] Environment-specific values defined (dev, preview, prod)

### Verification
- [ ] Local dev works with new variable (`npm run dev`)
- [ ] Build succeeds with new variable (`npm run build`)
- [ ] Variable accessible in code where needed
- [ ] Client-side vars visible in browser (if VITE_ prefix)
- [ ] Server-side vars NOT visible in browser bundle

### Security Verification
- [ ] API keys are NOT exposed to client (unless intentionally public)
- [ ] Sensitive variables marked as "Sensitive" in Vercel
- [ ] No duplicate variable definitions

### Documentation
- [ ] ENVIRONMENT-STRATEGY.md updated with new variable
- [ ] Purpose and expected value format documented
```

---

### Git Operations (Commit/Push)

```markdown
## Git Operations Acceptance Criteria

### Pre-Commit
- [ ] All tests pass
- [ ] No unintended files staged (`git status` reviewed)
- [ ] No secrets in staged files
- [ ] Commit message prepared following conventional commits

### Commit
- [ ] Commit message format: `type(scope): description`
- [ ] Types: feat, fix, chore, docs, refactor, test, style
- [ ] Description is specific and actionable
- [ ] Body explains WHY if not obvious from description

### Push
- [ ] `git push` succeeds (no auth errors)
- [ ] Remote branch updated (verify with `git log origin/branch`)
- [ ] CI/CD triggered if applicable

### If Push Fails
- [ ] Check auth: `gh auth status` or `ssh -T git@github.com`
- [ ] Refresh auth if needed: `gh auth login`
- [ ] Retry push
- [ ] Document failure if persists
```

---

### Multi-Agent Workflow

```markdown
## Multi-Agent Workflow Acceptance Criteria

### Per-Agent Requirements
- [ ] Agent understands full context (SESSION-CONTEXT provided)
- [ ] Agent has clear, specific task assignment
- [ ] Agent has definition of done for their task
- [ ] Agent has access to required tools/credentials

### Handoff Requirements
- [ ] Agent documents what was done
- [ ] Agent documents what was NOT done (if incomplete)
- [ ] Agent commits their work to git (don't leave uncommitted)
- [ ] Agent provides verification evidence (query results, test output)

### Audit Requirements
- [ ] Audit agent verifies claimed work was done
- [ ] Audit agent checks for gaps in implementation
- [ ] Audit agent grades work quality
- [ ] Audit agent documents remediation needed

### Workflow Completion
- [ ] All agents completed their tasks
- [ ] All work committed and pushed
- [ ] Audit completed with grades assigned
- [ ] Remediation items tracked in todo or issue tracker
```

---

## Verification Query Templates

### RLS Verification
```sql
-- Check RLS is enabled on table
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'YOUR_TABLE';

-- List all policies on table
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'YOUR_TABLE';

-- Check for unoptimized policies (should return 0)
SELECT policyname, tablename
FROM pg_policies
WHERE schemaname = 'public'
AND ((qual LIKE '%auth.uid()%' AND qual NOT LIKE '%SELECT auth.uid()%')
  OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%SELECT auth.uid()%'));
```

### Migration Verification
```sql
-- Check migration history
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC LIMIT 10;

-- Verify table exists
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'YOUR_TABLE';

-- Verify column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'YOUR_TABLE';
```

### User Access Verification
```sql
-- Test as anon (should fail for protected tables)
SET ROLE anon;
SELECT * FROM protected_table LIMIT 1;

-- Test as authenticated
SET ROLE authenticated;
SELECT * FROM protected_table LIMIT 1;

-- Test as service_role (full access)
SET ROLE service_role;
SELECT * FROM protected_table LIMIT 1;

-- Reset role
RESET ROLE;
```

---

## Anti-Patterns (What NOT to Do)

### ❌ Partial Implementation
```
BAD: "I enabled RLS on the table"
GOOD: "I enabled RLS and created both required policies. Verified with pg_policies query. Test shows anon blocked, admin can read."
```

### ❌ Uncommitted Work
```
BAD: "Files are ready in the migrations folder"
GOOD: "Migration committed (hash: abc123) and pushed to remote"
```

### ❌ Untested Changes
```
BAD: "The policy should work correctly"
GOOD: "Tested with 3 queries: anon returns 0 rows, authenticated returns user's rows, service_role returns all rows"
```

### ❌ Vague Completion
```
BAD: "Security has been improved"
GOOD: "moderation_results now has RLS enabled with 2 policies: service_role full access, admin read-only. Verified via pg_policies."
```

### ❌ Missing Documentation
```
BAD: "Branch created successfully"
GOOD: "Branch 'develop' created. ID: abc123, project_ref: xyz789, status: ACTIVE_HEALTHY. Credentials in SESSION-CONTEXT."
```

---

## Quick Reference Checklist

Copy this for any task:

```markdown
## Task: [DESCRIPTION]

### Implementation
- [ ] [Specific implementation step 1]
- [ ] [Specific implementation step 2]

### Verification
- [ ] [How to verify step 1]
- [ ] [How to verify step 2]
- [ ] [Test that proves it works]

### Persistence
- [ ] Committed to git
- [ ] Pushed to remote
- [ ] Documentation updated (if needed)

### Evidence
- Query result: [paste here]
- Test output: [paste here]
- Commit hash: [paste here]
```

---

## Related Documentation

- **[SESSION-CONTEXT.md](./SESSION-CONTEXT.md)** - Pre-session information template
- **[AI-AGENTS.md](./AI-AGENTS.md)** - Multi-agent coordination
- **[SECURITY-SPEC.md](./SECURITY-SPEC.md)** - RLS policy design intent
- **[SEATBELT.md](./SEATBELT.md)** - Configuration audit

---

**Last Updated:** 2025-12-03
**Version:** 1.0
**Principle:** "Done means DONE"
