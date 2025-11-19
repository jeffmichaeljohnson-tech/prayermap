# Understanding Cursor Rules System

## What Are Cursor Rules?

Cursor Rules are instructions that guide how the AI assistant (Claude, GPT-4, etc.) behaves when helping you code. Think of them as a "style guide" and "coding standards" document that the AI reads before every interaction.

---

## Why Use Rules?

### Without Rules
```
You: "Create a prayer component"

AI: *Creates generic component with:*
- Class-based React (outdated)
- No TypeScript types
- Missing error handling
- Inconsistent styling
- No tests
```

### With Rules
```
You: "Create a prayer component"

AI: *Creates component with:*
- ✅ Functional React with hooks
- ✅ Full TypeScript interfaces
- ✅ Error boundaries and loading states
- ✅ Tailwind CSS following design system
- ✅ Unit tests included
- ✅ JSDoc comments
- ✅ Accessibility attributes
```

**Result**: 10x better code, first try! 🚀

---

## Two Rule Systems

### 1. Legacy Format: `.cursorrules`

**Location**: Project root  
**Format**: Single text file  
**Status**: Still works, but deprecated

```
# .cursorrules
You are an expert in React and TypeScript...

Rules:
- Use functional components
- Add TypeScript types
- Include tests
```

**Pros**: Simple, one file  
**Cons**: All rules load always, can't target specific files

---

### 2. Modern Format: `.cursor/rules/*.mdc`

**Location**: `.cursor/rules/` directory  
**Format**: Multiple MDC (Markdown with metadata) files  
**Status**: Current, recommended

```yaml
---
description: React development guidelines
globs:
  - "**/*.tsx"
  - "**/*.jsx"
alwaysApply: false
---

# React Rules

Your rules in Markdown format...
```

**Pros**: 
- Modular (separate concerns)
- Conditional loading (only when needed)
- Better performance
- Version controllable

**Cons**: Slightly more complex setup

---

## Rule Anatomy

### MDC File Structure

```yaml
---
description: Brief description of what this rule covers
globs:
  - "**/*.tsx"          # Apply to all .tsx files
  - "src/api/**/*.ts"   # Apply to API TypeScript files
alwaysApply: false      # or true
---

# Rule Title

## Section 1
Your rules content in **Markdown** format

### Examples
```typescript
// Good example
const example = () => { };

// Bad example
var example = function() { };
```

## Section 2
More rules...
```

### Frontmatter Fields

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `description` | string | Brief summary for AI | "React development guidelines" |
| `globs` | array | File patterns to match | `["**/*.tsx", "**/*.jsx"]` |
| `alwaysApply` | boolean | Load for every request | `true` or `false` |

---

## How Rules Are Loaded

### 1. Always Applied Rules

```yaml
---
alwaysApply: true
---
```

- Loaded for EVERY AI interaction
- Use for core project context
- Example: `index.mdc` with project overview

### 2. Auto-Attached Rules

```yaml
---
globs:
  - "**/*.tsx"
alwaysApply: false
---
```

- Loaded automatically when you're in matching files
- Example: Open `PrayerCard.tsx` → `react.mdc` loads automatically

### 3. Manually Invoked Rules

```yaml
---
alwaysApply: false
# No globs defined
---
```

- Load by typing `@rulename` in chat
- Example: Type `@database` to load database rules on demand

---

## PrayerMap Rules Structure

```
.cursor/rules/
├── index.mdc           # ⚡ ALWAYS loaded
│   └── Core context, workflow, tech stack
│
├── react.mdc           # 🎯 Auto-loaded for .tsx/.jsx
│   └── Components, hooks, state management
│
├── typescript.mdc      # 🎯 Auto-loaded for .ts/.tsx
│   └── Types, interfaces, type safety
│
├── backend-api.mdc     # 🎯 Auto-loaded for API files
│   └── Express, REST, validation, auth
│
└── database.mdc        # 🎯 Auto-loaded for SQL files
    └── PostgreSQL, PostGIS, migrations
```

---

## Rule Loading Priority

When you work on a file, Cursor loads rules in this order:

1. **Always Rules** (`alwaysApply: true`)
   - `index.mdc` always loads

2. **Auto-Attached Rules** (matching `globs`)
   - Working on `PrayerCard.tsx`?
   - Loads: `react.mdc`, `typescript.mdc`

3. **Manual Rules** (you invoke with `@`)
   - Type `@database` in chat
   - Loads: `database.mdc`

**Result**: AI has ALL relevant context! 🧠

---

## Glob Patterns Explained

Globs are file matching patterns:

| Pattern | Matches | Example |
|---------|---------|---------|
| `**/*.tsx` | All .tsx files anywhere | `src/components/PrayerCard.tsx` |
| `src/**/*.ts` | All .ts files under src/ | `src/api/prayers.ts` |
| `**/api/**/*.ts` | .ts files in any api/ folder | `backend/api/routes.ts` |
| `*.sql` | .sql files in root only | `schema.sql` |
| `**/*test.ts` | All test files | `prayer.test.ts` |

---

## Best Practices

### ✅ DO:

1. **Keep Rules Focused**
   ```yaml
   # Good: Specific rule for one concern
   description: React component patterns
   globs: ["**/*.tsx"]
   ```

2. **Use Clear Descriptions**
   ```yaml
   description: PostgreSQL queries and migrations
   # Not: "database stuff"
   ```

3. **Appropriate Glob Patterns**
   ```yaml
   globs:
     - "**/*.tsx"        # All React components
     - "**/api/**/*.ts"  # API files
   ```

4. **Include Examples**
   ```markdown
   ## Bad Example
   ```typescript
   const x = any;
   ```

   ## Good Example
   ```typescript
   const user: User = { id: '123' };
   ```
   ```

5. **Update Regularly**
   - Add new patterns as project evolves
   - Remove outdated practices
   - Keep aligned with team decisions

### ❌ DON'T:

1. **Avoid Huge Always-On Rules**
   ```yaml
   # Bad: 5000 lines, always loaded
   alwaysApply: true
   ```

2. **Don't Overlap Too Much**
   ```yaml
   # Bad: Same files matched by multiple rules
   react.mdc → globs: ["**/*.tsx"]
   components.mdc → globs: ["**/*.tsx"]  # Duplicate!
   ```

3. **Don't Use Vague Globs**
   ```yaml
   globs: ["**/*"]  # Matches everything!
   ```

4. **Don't Skip Descriptions**
   ```yaml
   description: ""  # ❌ Empty or missing
   ```

---

## Testing Your Rules

### Method 1: Chat Test

1. Open Cursor Chat (`Cmd/Ctrl + L`)
2. Type: `@rulename Show me what rules apply`
3. Verify rule content appears

### Method 2: File Test

1. Open a file (e.g., `PrayerCard.tsx`)
2. Ask: "What are the React rules for this file?"
3. Should reference your `react.mdc` content

### Method 3: Generation Test

1. Open Chat
2. Ask: "Create a new prayer component following the rules"
3. Verify output follows your standards

---

## Troubleshooting

### "Rules Not Loading"

**Check**:
1. File is in `.cursor/rules/` directory
2. File has `.mdc` extension
3. Frontmatter is valid YAML (between `---`)
4. `globs` syntax is correct array
5. Reload Cursor: `Cmd/Ctrl + Shift + P` → Reload Window

### "Wrong Rules Applied"

**Fix**:
1. Check glob patterns - too broad?
2. Verify `alwaysApply` settings
3. Multiple rules matching same files?
4. Manually invoke with `@rulename`

### "AI Ignores Rules"

**Try**:
1. Reference rule explicitly: `@react`
2. Quote the rule: "Following the React rules, create..."
3. Be more specific in prompt
4. Check rule isn't too long (>2000 words)

---

## Customizing for Your Team

### Step 1: Review Base Rules
```bash
cat .cursor/rules/index.mdc
cat .cursor/rules/react.mdc
# etc.
```

### Step 2: Identify Team Preferences
- Coding style differences?
- Additional libraries/tools?
- Specific patterns used?
- Custom CI/CD requirements?

### Step 3: Create Custom Rule
```bash
touch .cursor/rules/team-custom.mdc
```

```yaml
---
description: Team-specific patterns and preferences
alwaysApply: true
---

# Team Custom Rules

## Our Specific Patterns

[Your team's unique requirements]
```

### Step 4: Commit to Repo
```bash
git add .cursor/rules/team-custom.mdc
git commit -m "docs: add team custom rules"
git push
```

Now entire team has same standards! 🎉

---

## Advanced: Dynamic Rules

### Conditional Loading

Only load heavy rules when actually needed:

```yaml
---
description: Advanced database optimization patterns
globs:
  - "**/migrations/**/*.ts"
  - "**/database/optimizations/**/*.ts"
alwaysApply: false
---

Heavy content only loads when working on migrations...
```

### Context-Specific Rules

Different rules for different parts of app:

```
.cursor/rules/
├── frontend-react.mdc      # Frontend components
├── backend-api.mdc         # Backend APIs
├── database-migrations.mdc # Database work
├── testing-e2e.mdc        # E2E tests
└── deployment-docker.mdc   # Deployment
```

Each loads only when relevant!

---

## Rule Composition

### Small, Focused Rules

```
react-hooks.mdc           → Hook patterns
react-performance.mdc     → Optimization
react-accessibility.mdc   → A11y standards
react-testing.mdc         → Test patterns
```

**Benefits**:
- Easier to maintain
- Faster loading (only what's needed)
- Team can own different rules
- Less merge conflicts

---

## Real-World Examples

### Example 1: Adding New Library

Team adopts React Query:

```bash
touch .cursor/rules/react-query.mdc
```

```yaml
---
description: React Query data fetching patterns
globs:
  - "**/hooks/use*.ts"
  - "**/api/**/*.ts"
alwaysApply: false
---

# React Query Patterns

## Query Hooks
Always use this pattern:
[Examples...]
```

### Example 2: Security Standards

```yaml
---
description: Security requirements for API endpoints
globs:
  - "**/api/**/*.ts"
alwaysApply: false
---

# Security Checklist

Every API endpoint MUST have:
- [ ] Authentication check
- [ ] Input validation
- [ ] Rate limiting
- [ ] SQL injection prevention
[...]
```

---

## Migrating from .cursorrules to .mdc

### Step 1: Backup
```bash
cp .cursorrules .cursorrules.backup
```

### Step 2: Split by Concern
```bash
mkdir -p .cursor/rules

# Extract sections
# React rules → react.mdc
# TypeScript rules → typescript.mdc
# etc.
```

### Step 3: Add Frontmatter
```yaml
---
description: [Section description]
globs: ["**/*.tsx"]
alwaysApply: false
---

[Original content]
```

### Step 4: Test
1. Comment out `.cursorrules`
2. Test with new `.mdc` files
3. Verify behavior is same
4. Delete backup when satisfied

---

## Summary

### Key Takeaways

1. **Rules guide AI behavior** - Like style guides for humans
2. **Two formats** - Legacy (`.cursorrules`) and Modern (`.mdc`)
3. **Three loading modes** - Always, Auto, Manual
4. **Glob patterns** - Control when rules apply
5. **Modular is better** - Small, focused rules beat one huge file
6. **Test your rules** - Verify they work as expected
7. **Keep updated** - Evolve with your project

### Quick Decision Tree

```
Need rules to apply always?
├─ Yes → alwaysApply: true (use for core context)
└─ No → Need automatic loading?
    ├─ Yes → Add globs for file patterns
    └─ No → Manual invocation with @rulename
```

---

## Further Reading

- [Cursor Official Docs](https://docs.cursor.sh/context/rules-for-ai)
- [Awesome Cursor Rules](https://github.com/PatrickJS/awesome-cursorrules)
- `CURSOR_SETUP_GUIDE.md` - Full setup walkthrough
- `CURSOR_QUICK_REFERENCE.md` - Command reference

---

**You now understand Cursor Rules! 🎓**

Start experimenting with the provided rules and customize them for your needs.
