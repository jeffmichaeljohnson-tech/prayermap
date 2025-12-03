# AI-AGENTS.md - Multi-Agent Coordination Protocol

> **PURPOSE:** Define how AI agents coordinate, hand off work, and verify each other's output. Following these protocols ensures 9.5+ quality scores.

---

## Core Principles

1. **Context is King** - Agents fail without full context. Always provide SESSION-CONTEXT.
2. **Verify Before Done** - Every agent must prove their work, not just claim it.
3. **Commit Immediately** - Don't leave work uncommitted between agents.
4. **Document Deviations** - If you can't follow the spec, explain why.
5. **Fail Fast, Fail Loud** - If blocked, report immediately with specifics.

---

## Agent Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                     AGENT LIFECYCLE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. RECEIVE      2. VERIFY        3. EXECUTE    4. VERIFY   │
│  ─────────────  ─────────────   ─────────────  ─────────────│
│  - Task spec    - Have tools?   - Do work      - Did it     │
│  - Context      - Have auth?    - Log actions    work?      │
│  - Acceptance   - Understand    - Handle        - Evidence   │
│    criteria       scope?          errors        - Commit     │
│                                                             │
│  5. HANDOFF                                                 │
│  ─────────────                                              │
│  - Document what was done                                   │
│  - Document what was NOT done                               │
│  - Provide verification evidence                            │
│  - Note any blockers for next agent                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Agent Assignment Template

When assigning work to an agent, provide:

```markdown
## Agent Assignment: [AGENT NAME/NUMBER]

### Role
[One-line description of this agent's specialty]

### Context
- Project: PrayerMap at /Users/computer/jeffmichaeljohnson-tech/projects/prayermap
- Supabase Project ID: oomrmfhvsxtxgqqthisz
- Current branch: [branch-name]
- Previous agent's work: [summary or "first agent"]

### Task
[Specific task description - be explicit about what to do]

### Acceptance Criteria
- [ ] [Specific, verifiable criterion 1]
- [ ] [Specific, verifiable criterion 2]
- [ ] [Verification query or test]
- [ ] Committed to git
- [ ] Pushed to remote (if possible)

### Tools Available
- [List specific tools/commands agent should use]

### Constraints
- Do NOT: [explicit prohibitions]
- Must: [explicit requirements]

### If Blocked
1. Document the blocker specifically
2. Document what you tried
3. Suggest remediation
4. Do NOT mark task as complete

### Handoff Requirements
Return a report with:
1. What was done (with evidence)
2. What was NOT done (if anything)
3. Verification results
4. Commit hash (if committed)
5. Blockers for next agent (if any)
```

---

## Agent Handoff Protocol

### Before Declaring Complete

Every agent MUST:

1. **Run verification queries** - Don't assume it worked
2. **Commit changes** - `git add`, `git commit` with descriptive message
3. **Attempt push** - `git push` (document if fails)
4. **Document evidence** - Include query results, test output

### Handoff Report Format

```markdown
## Agent [X] Handoff Report

### Task Completed: [YES/PARTIAL/NO]

### What Was Done
- [Action 1] - Verified: [how]
- [Action 2] - Verified: [how]

### What Was NOT Done
- [Incomplete item] - Reason: [why]
- [Skipped item] - Reason: [why]

### Verification Evidence
```sql
-- Query run:
SELECT * FROM pg_policies WHERE tablename = 'x';

-- Result:
[paste result]
```

### Git Status
- Committed: [YES/NO]
- Commit hash: [hash]
- Pushed: [YES/NO]
- Push error (if any): [error message]

### Blockers for Next Agent
- [Blocker 1]: [details]
- [Blocker 2]: [details]

### Recommendations
- [Suggestion for next agent or follow-up work]
```

---

## Agent Types and Responsibilities

### Implementation Agents

| Agent Type | Responsibility | Must Verify |
|------------|----------------|-------------|
| **Git Agent** | Commits, pushes, branch management | `git status`, `git log`, push success |
| **Migration Agent** | Database schema changes | `migration list`, table exists, columns correct |
| **RLS Agent** | Security policies | `pg_policies` query, access tests |
| **Performance Agent** | Optimization | Before/after metrics, no regressions |
| **Config Agent** | Environment setup | Config loads, service connects |
| **Branch Agent** | Supabase/Vercel branches | Branch status ACTIVE_HEALTHY |

### Audit Agents

| Agent Type | Responsibility | Must Check |
|------------|----------------|------------|
| **Security Auditor** | RLS, permissions, secrets | All tables have RLS, no exposed keys |
| **Completion Auditor** | Work vs spec comparison | Acceptance criteria met |
| **Quality Auditor** | Code/config quality | Best practices followed |
| **Integration Auditor** | Cross-system consistency | All systems in sync |

---

## Common Agent Failures and Prevention

### Failure: Authentication Expired

**Symptoms:** 403 errors, "permission denied", "token expired"

**Prevention:**
```markdown
In SESSION-CONTEXT, include:
- GitHub: [auth status] - Last verified: [date]
- Supabase CLI: [auth status] - Test: `supabase projects list`
```

**Agent Response:** If auth fails, immediately report:
```markdown
### BLOCKER: Authentication Failed
- Service: [GitHub/Supabase/Vercel]
- Error: [exact error message]
- Tried: [what you attempted]
- Fix: Run `[command]` to refresh auth
```

### Failure: Incomplete Implementation

**Symptoms:** "I created the policy" but policy doesn't exist

**Prevention:**
```markdown
Acceptance Criteria MUST include:
- [ ] Verification query that proves implementation exists
- [ ] Test that proves implementation works
```

**Agent Response:** Always include verification evidence:
```markdown
### Verification
Query: `SELECT * FROM pg_policies WHERE tablename = 'x'`
Result: [paste actual result, not "success"]
```

### Failure: Uncommitted Work

**Symptoms:** Agent claims done, but `git status` shows changes

**Prevention:**
```markdown
Acceptance Criteria MUST include:
- [ ] Committed to git (hash: [include hash])
- [ ] Pushed to remote (or document why not)
```

**Agent Response:** Never finish without attempting commit:
```bash
git add .
git commit -m "type(scope): description"
git push
# If push fails, document error and still commit locally
```

### Failure: Scope Creep

**Symptoms:** Agent does extra work but misses primary task

**Prevention:**
```markdown
Constraints:
- ONLY do [specific task]
- Do NOT [related but out-of-scope work]
```

**Agent Response:** If you see related issues:
```markdown
### Out of Scope Issues Noted
- [Issue 1]: [description] - Recommend addressing in future task
- [Issue 2]: [description] - Recommend addressing in future task

(Did NOT fix these - outside my assignment scope)
```

### Failure: Silent Failure

**Symptoms:** Agent reports success but didn't actually succeed

**Prevention:**
```markdown
Acceptance Criteria:
- [ ] [Positive check] - must return [expected result]
- [ ] [Negative check] - must NOT return [bad result]
```

**Agent Response:** Always test both positive and negative cases:
```markdown
### Test Results
✅ Positive test: Admin CAN read table (returned 5 rows)
✅ Negative test: Anon CANNOT read table (returned 0 rows)
```

---

## Parallel vs Sequential Agents

### When to Run Parallel
- Tasks are independent (no shared state)
- Tasks don't modify same files
- Tasks don't depend on each other's output

**Example:** Analysis agents that only read and report

### When to Run Sequential
- Task B needs Task A's output
- Tasks modify the same database/files
- Tasks require specific order (schema before data)

**Example:** Migration agent before branch agent

### Dependency Graph Template

```markdown
## Agent Dependencies

Agent 1 (Git) ──────────────────────────┐
                                        ├──► Agent 6 (Commit Safety Work)
Agent 2 (CLI Setup) ────────────────────┘

Agent 3 (Migration Analysis) ───────────┐
                                        ├──► Agent 8 (Apply Migrations)
Agent 4 (RLS Audit) ────────────────────┘

Agent 5 (RLS Performance Analysis) ─────► Agent 8 (Apply Performance Fix)

Agent 8 (Apply Migrations) ─────────────► Agent 9 (Create Branch)

Agent 9 (Create Branch) ────────────────► Agent 10 (Configure Vercel)
```

---

## Audit Agent Protocol

### Audit Agent Assignment

```markdown
## Audit Agent Assignment

### Scope
Review work from Agents [X, Y, Z]

### Verification Checklist
For each agent reviewed:
- [ ] Claimed work actually exists (verify in system)
- [ ] Acceptance criteria met (check each item)
- [ ] No regressions introduced (test functionality)
- [ ] Work committed to git (check commit history)
- [ ] Documentation accurate (matches reality)

### Grading Criteria
- **10/10**: All criteria met, work exceeds expectations
- **9/10**: All criteria met, minor improvements possible
- **8/10**: Core criteria met, some gaps
- **7/10**: Most criteria met, notable gaps
- **6/10**: Partial completion, significant gaps
- **5/10**: Half completed, major issues
- **<5/10**: Failed to meet requirements

### Report Format
For each agent:
1. Grade: X/10
2. What went well
3. What went wrong
4. Remediation required
5. Evidence supporting grade
```

### Audit Report Template

```markdown
## Audit Report: Agent [X]

### Grade: [X/10]

### Summary
[2-3 sentence summary of agent's work]

### Criteria Assessment

| Criterion | Met? | Evidence |
|-----------|------|----------|
| [Criterion 1] | ✅/❌ | [evidence] |
| [Criterion 2] | ✅/❌ | [evidence] |

### Strengths
- [What agent did well]
- [What agent did well]

### Issues Found
- [Issue 1]: [details]
- [Issue 2]: [details]

### Remediation Required
- [ ] [Action needed to fix Issue 1]
- [ ] [Action needed to fix Issue 2]

### Evidence
[Query results, file contents, test output that supports findings]
```

---

## Communication Standards

### Status Update Format

```markdown
Agent: [name/number]
Status: [working|blocked|complete]
Progress: [X%]
Current Action: [what you're doing right now]
Next Action: [what you'll do next]
Blockers: [none or description]
```

### Blocker Report Format

```markdown
### BLOCKER REPORT

Agent: [name/number]
Task: [what you were trying to do]
Error: [exact error message]
Attempts:
1. [What you tried first]
2. [What you tried second]
Hypothesis: [why you think it's failing]
Suggested Fix: [how to unblock]
Can Continue: [yes/no] - [what parts of task can proceed]
```

### Completion Report Format

```markdown
### COMPLETION REPORT

Agent: [name/number]
Task: [original assignment]
Status: [COMPLETE/PARTIAL]
Duration: [time spent]

#### Completed
- [x] [Task item 1] - Evidence: [verification]
- [x] [Task item 2] - Evidence: [verification]

#### Not Completed
- [ ] [Task item 3] - Reason: [why]

#### Artifacts Created
- [File/migration/policy name]: [location]

#### Git Status
- Committed: [yes/no]
- Hash: [commit hash]
- Pushed: [yes/no]

#### Handoff Notes
[Important context for next agent or human review]
```

---

## Quick Reference

### Agent Checklist (Copy for each agent)

```markdown
## Agent [X] Checklist

### Before Starting
- [ ] Read and understand task assignment
- [ ] Verify required tools are available
- [ ] Verify authentication works
- [ ] Understand acceptance criteria

### During Execution
- [ ] Log significant actions
- [ ] Handle errors gracefully
- [ ] Stay within scope
- [ ] Document deviations from plan

### Before Declaring Done
- [ ] Run verification queries/tests
- [ ] Commit changes to git
- [ ] Attempt push to remote
- [ ] Prepare handoff report

### Handoff
- [ ] Document what was done
- [ ] Document what was NOT done
- [ ] Include verification evidence
- [ ] Note blockers for next agent
```

---

## Related Documentation

- **[SESSION-CONTEXT.md](./SESSION-CONTEXT.md)** - Pre-session information template
- **[ACCEPTANCE-CRITERIA.md](./ACCEPTANCE-CRITERIA.md)** - Definition of done standards
- **[SECURITY-SPEC.md](./SECURITY-SPEC.md)** - RLS policy design intent
- **[ARTICLE.md](./ARTICLE.md)** - Autonomous excellence philosophy

---

**Last Updated:** 2025-12-03
**Version:** 1.0
**Principle:** "Verify, Commit, Handoff"
