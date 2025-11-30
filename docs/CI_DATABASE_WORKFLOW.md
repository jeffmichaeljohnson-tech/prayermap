# Database CI Workflow Documentation

## Overview

The Database CI workflow (`/home/user/prayermap/.github/workflows/database.yml`) provides automated validation and testing for database-related changes in the PrayerMap project.

## Workflow Triggers

The workflow runs automatically when changes are made to:
- `supabase/migrations/**` - Any SQL migration files
- `src/services/**Service.ts` - Any service files that interact with the database

## Jobs

### 1. `validate-migrations`

**Purpose**: Ensures database migrations follow project standards

**Steps**:
1. **Validate SQL Syntax**
   - Checks that migration files contain valid SQL commands
   - Looks for: `CREATE`, `ALTER`, `DROP`, or `INSERT` statements
   - Warns if files appear empty or invalid

2. **Check Migration Naming**
   - Enforces consistent naming conventions
   - Accepted formats:
     - `NNN_description.sql` (e.g., `000_reset_schema.sql`)
     - `YYYYMMDD_description.sql` (e.g., `20250129_add_indexes.sql`)
     - `YYYYMMDDHHMMSS_description.sql` (full timestamp)
   - Regex pattern: `^[0-9]{3,14}_.+\.sql$`

**Example valid migrations**:
```
✅ 000_reset_schema.sql
✅ 001_initial_schema.sql
✅ 20250129_add_cursor_pagination.sql
✅ 20250129120530_add_performance_monitoring.sql
❌ add_indexes.sql (no number prefix)
❌ 2025-01-29_migration.sql (hyphens instead of underscores)
```

### 2. `test-services`

**Purpose**: Runs unit tests for database service layers

**Steps**:
1. **Setup Node.js**
   - Node version: 20
   - Uses npm cache for faster installation

2. **Install Dependencies**
   - Uses `npm ci` for reproducible builds

3. **Run Service Tests**
   - Command: `npm test -- src/services/__tests__`
   - Uses Vitest to run all service tests
   - Tests include:
     - `prayerService.test.ts` - Prayer CRUD operations
     - `userService.test.ts` - User profile management
     - `storageService.test.ts` - File storage operations

4. **Check TypeScript Types**
   - Command: `npx tsc --noEmit`
   - Validates TypeScript types without generating output
   - Ensures type safety across the codebase

### 3. `performance-check`

**Purpose**: Monitors bundle size to prevent performance regressions

**Conditions**: Only runs on pull requests

**Steps**:
1. **Setup and Build**
   - Installs dependencies
   - Runs production build: `npm run build`

2. **Check Bundle Size**
   - Calculates total JavaScript bundle size
   - Location: `dist/assets/*.js`
   - **Threshold**: 500KB
   - **Action**: Warns if bundle exceeds threshold (non-blocking)

**Sample output**:
```bash
Bundle size: 342KB
✅ Bundle size is within limits

Bundle size: 523KB
⚠️ Warning: Bundle size exceeds 500KB
```

## Integration with Existing CI

The database workflow complements existing CI workflows:

### Existing Workflows

1. **`ci.yml`**
   - Runs on all pushes to main and PRs
   - Linting, type checking, unit tests
   - Runs on all branches

2. **`e2e.yml`**
   - End-to-end tests with Playwright
   - Tests user flows and integrations

3. **`android-build.yml`**
   - Builds Android APK/AAB
   - Tests mobile compatibility

4. **`security.yml`**
   - Security scans and vulnerability checks

5. **`release.yml`**
   - Handles version releases and deployments

### Workflow Coordination

```
┌─────────────────────────────────────────────────────────┐
│                    PR or Push Event                      │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌──────────────┐   ┌──────────────┐
│   ci.yml      │   │ database.yml │   │  e2e.yml     │
│   (always)    │   │ (if db files)│   │ (if needed)  │
└───────────────┘   └──────────────┘   └──────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────────────────────────────────────────────┐
│              All checks must pass                     │
│              before merge allowed                     │
└───────────────────────────────────────────────────────┘
```

## Migration Best Practices

### Creating New Migrations

1. **Use timestamp prefix** for easy ordering:
   ```bash
   YYYYMMDD_descriptive_name.sql
   # Example: 20250129_add_prayer_indexes.sql
   ```

2. **Include descriptive names**:
   ```bash
   ✅ 20250129_add_prayer_response_indexes.sql
   ✅ 20250129_optimize_get_nearby_prayers.sql
   ❌ 20250129_migration.sql (too vague)
   ❌ 20250129_fix.sql (not descriptive)
   ```

3. **Write idempotent migrations**:
   ```sql
   -- Good: Safe to run multiple times
   CREATE INDEX IF NOT EXISTS idx_prayers_location
   ON prayers USING GIST(location);

   -- Bad: Will fail on second run
   CREATE INDEX idx_prayers_location
   ON prayers USING GIST(location);
   ```

4. **Include rollback strategy** (in comments):
   ```sql
   -- Migration: Add prayer response indexes
   -- Rollback: DROP INDEX idx_prayer_responses_prayer_id;

   CREATE INDEX idx_prayer_responses_prayer_id
   ON prayer_responses(prayer_id);
   ```

### Testing Migrations Locally

Before pushing migrations:

1. **Test against local database**:
   ```bash
   npx supabase start
   npx supabase migration up
   ```

2. **Verify changes**:
   ```bash
   npx supabase db dump --schema public > test_schema.sql
   ```

3. **Test rollback** (if applicable):
   ```bash
   # Apply your rollback strategy
   # Verify database state
   ```

## Service Test Requirements

### Required Test Coverage

All database services must include tests for:

1. **Happy Path**
   - Successful operations
   - Expected data returns

2. **Error Handling**
   - Database errors
   - Network errors
   - Invalid input
   - Not found scenarios

3. **Edge Cases**
   - Null values
   - Empty results
   - Boundary conditions

### Example Test Structure

```typescript
// src/services/__tests__/exampleService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { exampleService } from '../exampleService';

describe('exampleService', () => {
  describe('getData', () => {
    it('should fetch data successfully', async () => {
      // Test happy path
    });

    it('should handle not found', async () => {
      // Test null/missing data
    });

    it('should handle database error', async () => {
      // Test error scenarios
    });
  });
});
```

## Performance Monitoring

### Bundle Size Tracking

The workflow tracks JavaScript bundle size to prevent:
- Bloated dependencies
- Unnecessary code duplication
- Performance regressions

**Current Threshold**: 500KB

**How to Fix Bundle Size Issues**:

1. **Analyze bundle composition**:
   ```bash
   npm run build -- --sourcemap
   npx vite-bundle-visualizer
   ```

2. **Common fixes**:
   - Remove unused dependencies
   - Use dynamic imports for large components
   - Optimize images and assets
   - Use tree-shaking friendly imports

3. **Example optimization**:
   ```typescript
   // Bad: Imports entire library
   import _ from 'lodash';

   // Good: Imports only what's needed
   import debounce from 'lodash/debounce';
   ```

## Troubleshooting

### Migration Validation Fails

**Issue**: "Invalid migration filename"
```
Error: Invalid migration filename: my_migration.sql
Expected format: NNN_description.sql, YYYYMMDD_description.sql
```

**Solution**: Rename file to include numeric prefix:
```bash
mv my_migration.sql 20250129_my_migration.sql
```

### Service Tests Fail

**Issue**: Tests fail in CI but pass locally

**Common causes**:
1. **Environment differences**
   - Check that mocks are properly configured
   - Verify test doesn't depend on local state

2. **Timing issues**
   - Add proper async/await
   - Use `waitFor` for async operations

3. **Database state**
   - Ensure tests are isolated
   - Reset mocks between tests

**Solution**:
```typescript
// Add proper cleanup
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

### Bundle Size Warning

**Issue**: "Warning: Bundle size exceeds 500KB"

**Investigation steps**:
1. **Check what changed**:
   ```bash
   git diff main -- package.json
   ```

2. **Analyze bundle**:
   ```bash
   npm run build
   du -sh dist/assets/*.js
   ```

3. **Review recent additions**:
   - New dependencies
   - Large assets
   - Duplicated code

## Local Development

### Running Tests Before Push

```bash
# Run all service tests
npm test -- src/services/__tests__

# Run specific test file
npm test -- src/services/__tests__/prayerService.test.ts

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Validating Migrations

```bash
# Check migration naming
for f in supabase/migrations/*.sql; do
  echo "Checking $(basename $f)..."
done

# Validate SQL syntax
npx supabase db lint
```

### Pre-Push Checklist

- [ ] Migration files follow naming convention
- [ ] Service tests pass locally
- [ ] TypeScript compiles without errors
- [ ] Bundle size is reasonable
- [ ] Migration tested against local database

## Related Documentation

- [Database Optimization Sprint](./database/DATABASE_OPTIMIZATION.md)
- [Cursor Pagination Guide](./CURSOR_PAGINATION.md)
- [Performance Monitoring](./PERFORMANCE_MONITORING.md)
- [E2E Test Guide](../e2e/DATABASE_OPTIMIZATION_TESTS.md)

## Workflow File Location

**File**: `/home/user/prayermap/.github/workflows/database.yml`

**View on GitHub**: `.github/workflows/database.yml`

---

**Last Updated**: 2025-11-29
**CI Integration Agent**: Database Optimization Sprint
**Version**: 1.0
