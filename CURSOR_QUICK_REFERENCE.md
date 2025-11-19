# Cursor AI Quick Reference Card

## 🚀 Essential Keyboard Shortcuts

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| **Open Chat** | `Cmd + L` | `Ctrl + L` |
| **Inline AI Edit** | `Cmd + K` | `Ctrl + K` |
| **Accept Suggestion** | `Tab` | `Tab` |
| **Partial Accept** | `Cmd + →` | `Ctrl + →` |
| **Reject Suggestion** | `Esc` | `Esc` |
| **Command Palette** | `Cmd + Shift + P` | `Ctrl + Shift + P` |
| **Find File** | `Cmd + P` | `Ctrl + P` |
| **Terminal** | `Ctrl + ~` | `Ctrl + ~` |

---

## 💬 Chat Commands

### Referencing Context
```
@filename           # Reference specific file
@foldername         # Reference entire folder
@codebase           # Reference entire codebase
@docs               # Reference documentation
@web                # Search the web
@terminal           # Reference terminal output
```

### Rule References
```
@index              # Core project rules
@react              # React development rules
@typescript         # TypeScript rules
@backend-api        # Backend API rules
@database           # Database rules
```

### Examples
```
"Based on @prayermap_schema_v2.sql, create interfaces"
"Following @react rules, create a PrayerCard component"
"Review @prayermap_api_spec_v2.md and implement /prayers endpoint"
```

---

## 🎯 Effective Prompts

### ✅ GOOD Prompts
```
"Create a React component for displaying prayer cards that:
- Uses TypeScript with proper interfaces
- Includes loading and error states
- Follows the project's React rules
- Has proper accessibility attributes"

"Add a migration to add 'category' enum to prayer_requests:
- Follow the migration pattern in database.mdc
- Include rollback
- Add appropriate index"

"Review this authentication middleware for:
- Security vulnerabilities
- Following JWT best practices
- Proper error handling"
```

### ❌ AVOID These
```
"Make a component"
"Fix this" 
"Add feature"
"Create API"
```

**Why?** Too vague, no requirements, no context

---

## 🔧 Common Workflows

### 1. Creating New Component
```
Cmd/Ctrl + L (Open Chat)

"Create a PrayerCard component following @react rules that:
1. Accepts prayer data as props
2. Shows title, description, location
3. Has 'Pray' and 'Share' buttons
4. Includes loading and error states
5. Uses Tailwind CSS classes"
```

### 2. Adding API Endpoint
```
Cmd/Ctrl + L

"Create a GET /api/v1/prayers/:id endpoint:
1. Follow @backend-api rules
2. Include authentication middleware
3. Validate prayer ID
4. Return prayer with user info
5. Handle not found case
6. Include unit tests"
```

### 3. Database Migration
```
Cmd/Ctrl + L

"Create a migration following @database rules to:
1. Add 'tags' JSONB column to prayer_requests
2. Add GIN index for tag searching
3. Include rollback script
4. Follow naming convention"
```

### 4. Refactoring Code
```
1. Select code to refactor
2. Cmd/Ctrl + K (Inline edit)
3. Type: "Refactor to use async/await and add error handling"
4. Review changes
5. Accept with Tab or reject with Esc
```

### 5. Code Review
```
Cmd/Ctrl + L

"Review this pull request for:
1. Security issues
2. Performance problems
3. Code style violations
4. Missing error handling
5. Potential bugs

Provide specific suggestions for improvement."
```

---

## 📋 Before Starting Work

### Always Check These First:
1. ✅ Read `START_HERE_v2.md`
2. ✅ Review `PrayerMap_PRD_v2.md` for requirements
3. ✅ Check `PROJECT_STRUCTURE_v2.md` for architecture
4. ✅ Review relevant API/schema docs
5. ✅ Ask clarifying questions if unclear

### Start Chat With:
```
"I need to implement [feature]. Before I start:
1. What files should I read?
2. Are there existing patterns I should follow?
3. What edge cases should I consider?
4. What tests are needed?"
```

---

## 🎨 UI Component Pattern

```typescript
// Copy this template for new components

import { FC, memo, useState, useCallback } from 'react';

interface ComponentNameProps {
  // Props with TypeScript types
}

export const ComponentName: FC<ComponentNameProps> = memo(({
  // Destructure props
}) => {
  // 1. Hooks at top
  const [state, setState] = useState();
  
  // 2. Event handlers
  const handleAction = useCallback(async () => {
    try {
      // Implementation
    } catch (error) {
      // Error handling
    }
  }, [/* dependencies */]);
  
  // 3. Render
  return (
    <div className="component-name">
      {/* JSX */}
    </div>
  );
});

ComponentName.displayName = 'ComponentName';
```

---

## 🔐 Security Checklist

Before committing code:
- [ ] All inputs validated
- [ ] SQL queries use parameters ($1, $2)
- [ ] Authentication on protected routes
- [ ] Sensitive data not logged
- [ ] Error messages don't leak info
- [ ] Rate limiting on APIs
- [ ] HTTPS enforced in production

---

## 🧪 Testing Pattern

```typescript
describe('ComponentName', () => {
  it('should render with required props', () => {
    // Arrange
    const props = { /* test props */ };
    
    // Act
    render(<ComponentName {...props} />);
    
    // Assert
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
  
  it('should handle error state', async () => {
    // Arrange
    const mockError = new Error('Test error');
    
    // Act
    render(<ComponentName {...propsWithError} />);
    
    // Assert
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

---

## 📦 Package Management

```bash
# Install dependency
npm install package-name

# Install dev dependency  
npm install --save-dev package-name

# Update dependencies
npm update

# Check for outdated
npm outdated

# Remove unused
npm prune
```

---

## 🐛 Debugging Commands

```bash
# Check TypeScript errors
npm run type-check

# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Test coverage
npm test -- --coverage
```

---

## 🔄 Git Workflow

```bash
# Create feature branch
git checkout -b feature/prayer-notifications

# Commit with conventional format
git commit -m "feat: add prayer notification system"

# Push and create PR
git push -u origin feature/prayer-notifications
```

### Commit Message Format
```
feat: Add new feature
fix: Fix bug
refactor: Code refactoring
docs: Documentation changes
test: Add tests
chore: Maintenance tasks
```

---

## 🚨 Emergency Commands

### Cursor Not Responding
```
Cmd/Ctrl + Shift + P
→ "Reload Window"
```

### Clear Cursor Cache
```
Cmd/Ctrl + Shift + P
→ "Clear Cache and Reload"
```

### Reset Cursor Settings
```
Cmd/Ctrl + Shift + P
→ "Reset Settings"
```

### Disable All Extensions
```
Cmd/Ctrl + Shift + P
→ "Disable All Extensions"
```

---

## 💡 Pro Tips

1. **Use Agent Mode** for multi-file changes
2. **Reference docs first** with `@filename`
3. **Be specific** in prompts with requirements
4. **Review before accepting** all AI suggestions
5. **Test generated code** before committing
6. **Update rules** as project evolves
7. **Ask questions** when uncertain

---

## 📞 Getting Help

### In Cursor Chat:
```
"Help me understand how to [task]"
"What's the best way to [action]?"
"Review this code for [specific concerns]"
"Explain why [code pattern] is used"
```

### Resources:
- `CURSOR_SETUP_GUIDE.md` - Full setup guide
- `START_HERE_v2.md` - Project overview
- `IMPLEMENTATION_GUIDE_v2.md` - Dev guide
- [Cursor Docs](https://docs.cursor.sh)

---

## ⚡ Power User Tips

### Multi-line Edits
```
1. Select code
2. Cmd/Ctrl + K
3. Describe changes
4. Review diff
5. Accept or modify
```

### Batch Processing
```
"Apply this pattern to all components in /components/prayer/:
- Add proper TypeScript types
- Include error boundaries
- Add loading states"
```

### Template Generation
```
"Generate boilerplate following project patterns:
- API endpoint with tests
- React component with tests
- Database migration with rollback"
```

---

**Print this reference and keep it handy! 📌**

Last Updated: November 2024
