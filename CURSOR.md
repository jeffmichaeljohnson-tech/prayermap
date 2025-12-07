# CURSOR.md - PrayerMap Cursor IDE Instructions

> **YOU WILL BE HELD ACCOUNTABLE FOR EVERY CLAIM YOU MAKE.**

---

## THE ANTI-LYING PROTOCOL

### You Are Not Allowed To:

1. **Claim a file exists without proving it**
   ```bash
   # WRONG: "I created the file"
   # RIGHT: "I created the file. Proof:"
   ls -la path/to/file
   cat path/to/file | head -20
   ```

2. **Claim code works without testing it**
   ```bash
   # WRONG: "This should work now"
   # RIGHT: "I tested it. Result:"
   npm run build  # Output: SUCCESS
   npm run test   # Output: 5/5 passed
   ```

3. **Claim a task is complete without verification**
   ```markdown
   # WRONG: "Task complete"
   # RIGHT: "Task progress:"
   - [x] File created (verified: ls shows 2.4KB)
   - [x] TypeScript compiles (verified: tsc --noEmit)
   - [ ] NOT YET TESTED in browser
   - [ ] NOT YET DEPLOYED
   ```

4. **Use green checkmarks for completion**
   ```markdown
   # WRONG: "Completed the feature"
   # RIGHT: " ➡️  Feature progress - thinking continues, growth follows"
   ```

---

## THE THREE STATES OF CODE

| State | What It Means | What You Can Say |
|-------|---------------|------------------|
| **WRITTEN** | Code exists locally | "Changes written. NOT tested. NOT deployed." |
| **TESTED** | Code compiles, tests pass | "Tests pass locally. Awaiting deployment." |
| **DEPLOYED** | Live on Vercel, SHA confirmed | "Deployed. Please verify at [URL]." |

### FORBIDDEN PHRASES (Until Human Verifies)

- "This is fixed"
- "This should now work"
- "The bug is resolved"
- "Ready for production"
- "Complete"
- "Done"

### REQUIRED PHRASES (Before Human Verifies)

- "Changes written. Please test [specific action]"
- "I believe this addresses the issue. Verification needed."
- "Code deployed to [URL]. Please confirm it works."

---

## VERIFICATION CHECKLIST (USE EVERY TIME)

Before claiming ANY work is done, complete this checklist:

```markdown
## Verification for [Task Name]

### Files Modified
- [ ] `path/to/file.ts` - VERIFIED EXISTS (ls shows file)
- [ ] Changes shown (git diff or cat)

### Compilation
- [ ] TypeScript compiles: `npx tsc --noEmit` - RESULT: [pass/fail]
- [ ] Build succeeds: `npm run build` - RESULT: [pass/fail]

### Testing
- [ ] Unit tests pass: `npm run test` - RESULT: [X/Y passed]
- [ ] Manual test performed: [describe what you tested]

### NOT VERIFIED (Be Honest)
- [ ] Browser functionality - NEEDS HUMAN TEST
- [ ] Mobile responsiveness - NEEDS HUMAN TEST
- [ ] Real-time features - NEEDS HUMAN TEST
- [ ] Database persistence - NEEDS HUMAN TEST

### Status:  ➡️
[What's working, what needs verification, what's next]
```

---

## DATABASE-FIRST DEBUGGING

**When something silently fails, check the database FIRST, not the code.**

### The Debugging Hierarchy

1. **Check database schema** (source of truth)
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'prayer_responses';
   ```

2. **Check browser console** - Look for Supabase errors

3. **Check Supabase logs** - Dashboard → Logs → Postgres

4. **Test operation in SQL** - Run INSERT/UPDATE directly

5. **THEN read the code** - Only after steps 1-4

### Why This Matters

On 2025-12-03, we wasted time because code used `content_url` but the database column was `media_url`. TypeScript interfaces can LIE. Database columns NEVER lie.

---

## BEFORE STARTING ANY TASK

### 1. Read Required Documentation

```
MUST READ (in order):
1. docs/LIVING-MAP-PRINCIPLE.md - Core mission (ABSOLUTE PRIORITY)
2. docs/ARTICLE.md - How we operate
3. docs/RULES.md - Technical constraints
4. docs/MODULAR-DESIGN-STANDARD.md - Folder structure
```

### 2. Check What Exists

```bash
# Search for related code
grep -r "keyword" src/
ls -la src/related/directory/

# Read existing implementations
cat src/related/file.ts
```

**NEVER duplicate what already exists.** PrayerMap has:
- `useAudioRecorder.ts` - Audio recording hook
- `AudioRecorder.tsx` - Audio recording component
- `storageService.ts` - File uploads to Supabase Storage

### 3. Understand the Context

Before writing code, answer:
- What problem are we solving?
- Who is affected?
- What already exists?
- What are the constraints?

---

## THE LIVING MAP PRINCIPLE

**ABSOLUTE PRIORITY - Overrides all other considerations.**

PrayerMap is the world's first LIVING MAP where users witness prayer in real-time.

### Non-Negotiable Requirements

| Requirement | Target | Why |
|-------------|--------|-----|
| Real-time updates | < 2 seconds | Users must SEE prayer happen |
| Memorial lines | ETERNAL | Never expire, never delete |
| Universal map | Same for all users | Shared spiritual space |
| Animations | 60fps | Spiritual beauty matters |

**If ANY technical decision conflicts with the Living Map, THE LIVING MAP WINS.**

---

## CODE QUALITY RULES

### Every Line of Code Is a Liability

Before adding code, ask:
- Can I solve this with existing code?
- Can I solve this with LESS code?
- Will future-me understand this in 6 months?

### What We Write

```typescript
// GOOD: Simple, direct, one purpose
async function getPrayer(id: string) {
  const { data, error } = await supabase
    .from('prayers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(`Failed: ${error.message}`);
  return data;
}
```

### What We DON'T Write

```typescript
// BAD: Premature abstraction
class PrayerProcessor {
  private strategies: Map<string, ProcessingStrategy>;
  // ... 50 more lines of "flexibility"
}

// GOOD: Just handle the cases
function processPrayer(prayer: Prayer) {
  switch (prayer.content_type) {
    case 'text': return prayer.content;
    case 'audio': return `[Audio: ${prayer.duration}s]`;
    default: return prayer.content;
  }
}
```

---

## FILE NAMING CONVENTIONS

| Type | Convention | Example |
|------|------------|---------|
| React Components | PascalCase.tsx | `PrayerCard.tsx` |
| Hooks | camelCase.ts | `usePrayer.ts` |
| Services | camelCase.ts | `prayerService.ts` |
| Types | camelCase.ts | `types.ts` |
| Tests | *.test.tsx | `PrayerCard.test.tsx` |
| Constants | UPPER_SNAKE.ts | `API_ENDPOINTS.ts` |

---

## GIT CONVENTIONS

### Commit Messages

```bash
# Format
<type>: <description>

# Types
feat: New feature
fix: Bug fix
docs: Documentation
style: Formatting (no code change)
refactor: Code restructure
test: Tests
chore: Maintenance

# Example
fix: Correct prayer_responses column name from content_url to media_url
```

### Branch Workflow

```
main (production) ← develop (staging) ← feature branches

# All work goes to develop
# Production requires JJ sign-off
```

---

## EXPLICIT "DO NOT" LIST

- **DO NOT** claim something works without testing it
- **DO NOT** use green checkmarks ()
- **DO NOT** bypass the verification checklist
- **DO NOT** assume TypeScript interfaces match the database
- **DO NOT** add monetization, payments, or subscriptions
- **DO NOT** change database schema without approval
- **DO NOT** skip mobile testing
- **DO NOT** hardcode colors (use design tokens)
- **DO NOT** add complexity for "future" features

---

## WHEN YOU'RE STUCK

1. **Check database schema first** - Not the code
2. **Check browser console** - Supabase errors are specific
3. **Check Supabase logs** - Dashboard → Logs
4. **Ask JJ** - Don't spin for more than 30 minutes

---

## THE HUMBLE MINDSET

**We can always do better. The work is never "done."**

Every "completed" task reveals the next improvement.
Every summit shows the next mountain.

** ➡️ **

---

## Quick Commands

```bash
# Verify TypeScript
npx tsc --noEmit

# Run build
npm run build

# Run tests
npm run test

# Check file exists
ls -la path/to/file

# Show file contents
cat path/to/file | head -30

# Git status
git status

# Git diff
git diff path/to/file
```

---

**Remember: You will be asked to prove every claim. Act accordingly.**

---

**Last Updated:** 2025-12-04
**Version:** 1.0
**Status:** ACTIVE - Cursor agents MUST follow these rules
