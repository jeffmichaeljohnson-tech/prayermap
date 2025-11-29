# Recommended NPM Scripts for Database Type Management

## Scripts to Add to package.json

Add these scripts to the `"scripts"` section of `/home/user/prayermap/package.json`:

```json
{
  "scripts": {
    // ... existing scripts ...

    // Database Type Management
    "db:types": "npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts",
    "db:types:local": "npx supabase gen types typescript --local > src/types/database.ts",
    "db:types:verify": "npx tsc --noEmit",
    "db:types:sync": "npm run db:types && npm run db:types:verify",
    "db:types:backup": "cp src/types/database.ts src/types/database.backup.ts"
  }
}
```

## Configuration Required

### 1. Set Your Supabase Project ID

Replace `YOUR_PROJECT_ID` in the `db:types` script with your actual Supabase project ID.

**Find your Project ID:**
- **Option 1:** Supabase Dashboard URL
  ```
  https://app.supabase.com/project/YOUR_PROJECT_ID
  ```

- **Option 2:** Environment Variables
  ```bash
  # Check your .env file
  cat .env | grep SUPABASE
  ```

- **Option 3:** Supabase CLI
  ```bash
  npx supabase projects list
  ```

### 2. Alternative: Use Environment Variable

For better security, use an environment variable:

```json
{
  "scripts": {
    "db:types": "npx supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/types/database.ts"
  }
}
```

Then set in your shell:
```bash
export SUPABASE_PROJECT_ID=your_actual_project_id
```

## Script Usage Guide

### Generate Types from Production Database

```bash
npm run db:types
```

**When to use:**
- After deploying new migrations to production
- When setting up a new development environment
- When database schema is out of sync with types

**Output:** Overwrites `src/types/database.ts` with latest types

---

### Generate Types from Local Database

```bash
npm run db:types:local
```

**When to use:**
- During local development with Supabase CLI
- Testing migrations locally before production deploy
- When production database is not accessible

**Prerequisites:**
```bash
npx supabase start  # Start local Supabase
```

---

### Verify Types Compile

```bash
npm run db:types:verify
```

**When to use:**
- After regenerating types
- As part of CI/CD pipeline
- Before committing type changes

**What it checks:**
- All TypeScript files compile without errors
- Type definitions are syntactically correct
- No type conflicts exist

---

### Sync and Verify (Recommended)

```bash
npm run db:types:sync
```

**When to use:**
- **Most common command** for regular type updates
- Combines generation + verification in one step
- Safe workflow with automatic validation

**What it does:**
1. Generates types from production database
2. Runs TypeScript compiler to verify
3. Reports any errors

---

### Backup Current Types

```bash
npm run db:types:backup
```

**When to use:**
- Before major schema changes
- Before regenerating types
- When experimenting with manual type edits

**Output:** Creates `src/types/database.backup.ts`

---

## Workflow Examples

### Standard Workflow: After Database Migration

```bash
# 1. Deploy migration to Supabase
npx supabase db push

# 2. Regenerate and verify types
npm run db:types:sync

# 3. Commit updated types
git add src/types/database.ts
git commit -m "chore: regenerate database types after migration"
```

---

### Safe Workflow: With Backup

```bash
# 1. Backup current types
npm run db:types:backup

# 2. Regenerate types
npm run db:types

# 3. Verify compilation
npm run db:types:verify

# 4. If successful, commit; if failed, restore backup
# Success:
git add src/types/database.ts
git commit -m "chore: update database types"

# Failure:
cp src/types/database.backup.ts src/types/database.ts
```

---

### Local Development Workflow

```bash
# 1. Start local Supabase
npx supabase start

# 2. Apply local migrations
npx supabase db reset

# 3. Generate types from local database
npm run db:types:local

# 4. Verify
npm run db:types:verify

# 5. Develop with type safety
npm run dev
```

---

## CI/CD Integration

### Add to GitHub Actions

```yaml
name: Type Check

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Verify database types
        run: npm run db:types:verify

      - name: Regenerate types (check for drift)
        env:
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
        run: npm run db:types

      - name: Check for type changes
        run: |
          if ! git diff --exit-code src/types/database.ts; then
            echo "❌ Database types are out of sync!"
            echo "Run 'npm run db:types' locally and commit the changes."
            exit 1
          fi
```

---

## Pre-commit Hook

Add to `.husky/pre-commit` (if using Husky):

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Verify types compile before commit
npm run db:types:verify
```

---

## Troubleshooting

### Error: "Project ID not found"

**Problem:** `YOUR_PROJECT_ID` not replaced or environment variable not set

**Solution:**
```bash
# Option 1: Edit package.json and replace YOUR_PROJECT_ID
# Option 2: Set environment variable
export SUPABASE_PROJECT_ID=your_actual_project_id
```

---

### Error: "Authentication required"

**Problem:** Not logged into Supabase CLI

**Solution:**
```bash
npx supabase login
```

---

### Error: "TypeScript compilation failed"

**Problem:** Type definitions have errors or conflicts

**Solution:**
1. Check error messages for specific issues
2. Restore backup: `cp src/types/database.backup.ts src/types/database.ts`
3. Review recent schema changes
4. Check for PostGIS or custom types needing manual definition

---

### Error: "Local database not running"

**Problem:** Attempting to use `db:types:local` without local Supabase

**Solution:**
```bash
npx supabase start
```

---

## Complete package.json Example

```json
{
  "name": "prayermap",
  "version": "1.0.0",
  "scripts": {
    // Development
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",

    // Testing
    "test": "vitest",
    "test:e2e": "playwright test",

    // Database Type Management
    "db:types": "npx supabase gen types typescript --project-id abcdefghijklmnop > src/types/database.ts",
    "db:types:local": "npx supabase gen types typescript --local > src/types/database.ts",
    "db:types:verify": "npx tsc --noEmit",
    "db:types:sync": "npm run db:types && npm run db:types:verify",
    "db:types:backup": "cp src/types/database.ts src/types/database.backup.ts",

    // Mobile
    "android:sync": "npm run build && npx cap sync android",
    "ios:sync": "npm run build && npx cap sync ios",
    "sync:all": "npm run build && npx cap sync"
  }
}
```

---

## Related Documentation

- [TYPE_REGENERATION.md](./TYPE_REGENERATION.md) - Complete type regeneration guide
- [TYPE_SYNC_STATUS.md](./TYPE_SYNC_STATUS.md) - Current sync status and missing types
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Quick command reference

---

**Created:** 2025-11-29
**Purpose:** Streamline database type management workflow
**Priority:** High (improves developer experience and type safety)
