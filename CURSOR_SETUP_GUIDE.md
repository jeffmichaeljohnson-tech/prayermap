# PrayerMap Cursor AI Setup Guide

## 🚀 Quick Start (5 Minutes)

This guide will help you configure Cursor IDE for maximum productivity with the PrayerMap project.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation Steps](#installation-steps)
3. [Configuration Files](#configuration-files)
4. [Cursor Settings](#cursor-settings)
5. [Verification](#verification)
6. [Usage Tips](#usage-tips)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- ✅ **Cursor IDE** (latest version) - [Download here](https://cursor.sh)
- ✅ **Node.js** 18+ - [Download here](https://nodejs.org)
- ✅ **Git** - [Download here](https://git-scm.com)

### Recommended Extensions
- ESLint
- Prettier
- TypeScript and JavaScript Language Features

---

## Installation Steps

### Step 1: Extract the Project Files

1. **Unzip the project package** to your desired location:
   ```bash
   # Example location
   ~/Projects/prayermap/
   ```

2. **Open the project in Cursor**:
   ```bash
   cursor ~/Projects/prayermap/
   ```
   
   Or use: `File > Open Folder` in Cursor

### Step 2: Install the Configuration Files

The following files are already included in your project:

```
prayermap/
├── .cursorrules                    # Legacy rules file (backup)
├── .cursor/
│   └── rules/
│       ├── index.mdc               # Core project rules (ALWAYS APPLIED)
│       ├── react.mdc               # React-specific rules
│       ├── typescript.mdc          # TypeScript rules
│       ├── backend-api.mdc         # Backend/API rules
│       └── database.mdc            # PostgreSQL/PostGIS rules
├── START_HERE_v2.md                # Project overview
├── PrayerMap_PRD_v2.md            # Product requirements
├── PROJECT_STRUCTURE_v2.md         # Architecture docs
├── prayermap_schema_v2.sql         # Database schema
├── prayermap_api_spec_v2.md        # API documentation
├── IMPLEMENTATION_GUIDE_v2.md      # Implementation guide
└── ... (other project files)
```

**✅ These files are already in place - no action needed!**

### Step 3: Configure Cursor Settings

#### Option A: Quick Setup (Copy-Paste - RECOMMENDED)

1. **Open Cursor Settings**:
   - Mac: `Cmd + ,` (Command + Comma)
   - Windows/Linux: `Ctrl + ,`
   - Or: `Cursor > Settings`

2. **Navigate to**: `Features > Rules for AI`

3. **Copy and paste this into "Rules for AI"**:

```
You are an expert full-stack developer specializing in React, TypeScript, Node.js, Express, and PostgreSQL.

CRITICAL WORKFLOW:
1. ALWAYS read project documentation BEFORE making changes:
   - START_HERE_v2.md - Project overview
   - PrayerMap_PRD_v2.md - Requirements  
   - PROJECT_STRUCTURE_v2.md - Architecture
   
2. NEVER make assumptions - ask clarifying questions

3. Follow the project's .cursorrules and .cursor/rules/*.mdc files

4. Write clean, tested, documented code

5. Consider security, performance, and accessibility

STYLE PREFERENCES:
- TypeScript for all code (no `any` types)
- Functional components only (no class components)
- Explicit error handling (no silent failures)
- Comprehensive JSDoc comments
- 80% minimum test coverage

When suggesting code:
- Provide complete, working examples
- Explain complex logic with comments
- Include error handling
- Follow existing project patterns
- Suggest improvements where appropriate
```

4. **Click "Save"** or settings will auto-save

#### Option B: Manual Configuration

1. Open Cursor Settings (`Cmd/Ctrl + ,`)
2. Go to `Features > Cursor Tab`
3. Enable these options:
   - ✅ Enable Cursor Tab
   - ✅ Partial Accepts
   - ✅ Enable Always Search (for better context awareness)

4. Go to `Features > Chat`
   - ✅ Enable Apply Code from Chat
   - ✅ Enable Code Actions

5. Go to `Features > Rules for AI`
   - Paste the rules from Option A above

---

## Configuration Files

### Understanding the Rule Files

#### `.cursorrules` (Legacy Format - Backup)
- Single file with all rules
- Still supported but deprecated
- Use as reference or fallback

#### `.cursor/rules/` (Modern Format - PRIMARY)
- **`index.mdc`** - Core rules, ALWAYS applied
- **`react.mdc`** - Automatically applied to .tsx/.jsx files
- **`typescript.mdc`** - Automatically applied to .ts/.tsx files  
- **`backend-api.mdc`** - Automatically applied to API files
- **`database.mdc`** - Automatically applied to SQL/migration files

### How Rules Are Applied

1. **Always Applied**: `index.mdc` loads for every request
2. **Auto-Attached**: Files matching `globs` patterns automatically include relevant rules
3. **Manual**: Type `@react` or `@database` to manually load specific rules

---

## Cursor Settings Configuration

### Step 4: Configure AI Model Settings

1. **Open Settings** (`Cmd/Ctrl + ,`)
2. **Navigate to**: `Models`
3. **Set Model Preferences**:

```
Primary Model: Claude Sonnet 4 (recommended for this project)
Fallback Model: GPT-4 Turbo

Context Window: Max available
Temperature: 0.2 (for consistent, precise code generation)
```

### Step 5: Configure Indexing

1. **In Settings**, go to: `Features > Codebase Indexing`
2. **Enable these options**:
   - ✅ Enable Codebase Indexing
   - ✅ Auto-index on startup
   - ✅ Include documentation files (.md)

3. **Add to indexing** (if not already):
   ```
   **/*.md
   **/*.ts
   **/*.tsx
   **/*.sql
   ```

### Step 6: Configure File Exclusions

1. **In Settings**, go to: `Features > Codebase Indexing > Exclude`
2. **Add these patterns** to exclude from AI context:

```
**/node_modules/**
**/dist/**
**/build/**
**/.git/**
**/.next/**
**/.cache/**
**/coverage/**
**/*.log
**/.env*
```

---

## Verification

### Verify Installation

1. **Open Cursor Chat** (`Cmd/Ctrl + L`)
2. **Type this test command**:
   ```
   @index Show me the core rules for this project
   ```
3. **Expected Response**: Should display rules from `index.mdc`

### Verify Rules Loading

1. **Open a React file** (e.g., create `test.tsx`)
2. **Type**: `Cmd/Ctrl + K` (inline AI)
3. **Ask**: "What are the React rules for this project?"
4. **Expected**: Should reference functional components, TypeScript, hooks, etc.

### Verify Documentation Access

1. **In Chat**, type:
   ```
   What is PrayerMap and what are its main features?
   ```
2. **Expected**: Should reference information from `START_HERE_v2.md` and `PrayerMap_PRD_v2.md`

---

## Usage Tips

### Effective Prompting

#### ✅ GOOD Prompts
```
"Create a React component for displaying a prayer card. 
Follow the project's TypeScript and React rules.
Include proper error handling and loading states."

"Add a database migration to add a 'category' field to prayer_requests table.
Follow the migration pattern in database.mdc"

"Review this API endpoint for security issues and suggest improvements
based on the backend-api rules"
```

#### ❌ AVOID These Prompts
```
"Make a component"  // Too vague
"Fix this"          // No context
"Add feature"       // Unclear requirements
```

### Keyboard Shortcuts

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Open Chat | `Cmd + L` | `Ctrl + L` |
| Inline AI | `Cmd + K` | `Ctrl + K` |
| Accept Suggestion | `Tab` | `Tab` |
| Reject Suggestion | `Esc` | `Esc` |
| Command Palette | `Cmd + Shift + P` | `Ctrl + Shift + P` |

### Using Context References

In chat, you can reference files directly:

```
"Based on @prayermap_schema_v2.sql, create a TypeScript interface 
for the prayer_requests table"

"Following @IMPLEMENTATION_GUIDE_v2.md, implement the user authentication flow"

"Review @prayermap_api_spec_v2.md and implement the GET /prayers endpoint"
```

### Agent vs Ask Mode

- **Ask Mode** (default): Get answers and suggestions
- **Agent Mode**: Let AI make changes automatically
  - Use for: Multi-file refactoring, repetitive tasks
  - Be cautious: Review changes before accepting

**Toggle in chat**: Use the dropdown at top of chat window

---

## Troubleshooting

### Rules Not Being Applied

**Problem**: AI doesn't follow the project rules

**Solutions**:
1. Verify `.cursor/rules/` directory exists with `.mdc` files
2. Check file has correct frontmatter (between `---` markers)
3. Reload Cursor: `Cmd/Ctrl + Shift + P` → "Reload Window"
4. Manually reference rules: `@react` in chat

### "Cannot Read Documentation"

**Problem**: AI can't access project .md files

**Solutions**:
1. Enable codebase indexing in Settings
2. Wait for indexing to complete (check status bar)
3. Explicitly reference files: `@START_HERE_v2.md`
4. Check files are not in excluded patterns

### Slow Response Times

**Problem**: AI takes too long to respond

**Solutions**:
1. Reduce context window size in Settings
2. Exclude large files from indexing
3. Use smaller, focused prompts
4. Clear Cursor cache: `Cursor > Clear Cache and Reload`

### Rules File Errors

**Problem**: `.mdc` files have syntax errors

**Solutions**:
1. Verify frontmatter is valid YAML between `---` markers
2. Check `globs` is an array with proper YAML syntax
3. Ensure `alwaysApply` is boolean (`true` or `false`)
4. No special characters in `description` field

### Context Window Exceeded

**Problem**: "Context too large" error

**Solutions**:
1. Break large tasks into smaller steps
2. Reference specific files instead of whole codebase
3. Exclude unnecessary files from indexing
4. Use `@filename` to reference only needed files

---

## Advanced Configuration

### Custom Rules

To add your own rules:

1. **Create new .mdc file**:
   ```bash
   touch .cursor/rules/my-custom-rule.mdc
   ```

2. **Add frontmatter and content**:
   ```yaml
   ---
   description: My custom development guidelines
   globs:
     - "**/*.tsx"
   alwaysApply: false
   ---
   
   # My Custom Rules
   
   Add your rules here in Markdown format
   ```

3. **Use in chat**: `@my-custom-rule`

### Team Sharing

To share these settings with your team:

1. **Commit to Git**:
   ```bash
   git add .cursorrules .cursor/
   git commit -m "Add Cursor AI configuration"
   git push
   ```

2. **Team members** will get the same rules automatically

3. **Document in README**:
   ```markdown
   ## Cursor Setup
   
   1. Open project in Cursor
   2. Rules are automatically loaded from .cursor/rules/
   3. See CURSOR_SETUP_GUIDE.md for details
   ```

---

## Best Practices

### DO:
- ✅ Read documentation files before making changes
- ✅ Ask clarifying questions when unsure
- ✅ Review AI-generated code before accepting
- ✅ Use specific, detailed prompts
- ✅ Reference project files with `@filename`
- ✅ Test generated code thoroughly
- ✅ Keep rules files updated as project evolves

### DON'T:
- ❌ Accept all AI suggestions blindly
- ❌ Use vague prompts without context
- ❌ Skip reading the project documentation
- ❌ Modify rules files without understanding them
- ❌ Commit sensitive data in rules files
- ❌ Ignore security warnings from AI
- ❌ Overload context with too many files

---

## Resources

### Official Documentation
- [Cursor Documentation](https://docs.cursor.sh)
- [Cursor Rules Guide](https://docs.cursor.sh/context/rules-for-ai)
- [Community Rules Repository](https://github.com/PatrickJS/awesome-cursorrules)

### Project-Specific
- `START_HERE_v2.md` - Project overview
- `IMPLEMENTATION_GUIDE_v2.md` - Development guide
- `prayermap_api_spec_v2.md` - API reference

### Community
- [Cursor Discord](https://discord.gg/cursor)
- [Cursor Community Forum](https://forum.cursor.com)

---

## Support

If you encounter issues:

1. Check this guide's Troubleshooting section
2. Review the [Cursor Documentation](https://docs.cursor.sh)
3. Ask in chat: "Help me troubleshoot Cursor configuration issues"
4. Contact team lead or senior developer

---

## Version History

- **v1.0** (2024-11) - Initial Cursor configuration with modern .mdc format
- Comprehensive rules for React, TypeScript, Backend, Database
- Complete documentation and setup guide

---

**You're all set! 🎉**

Start coding with AI assistance by opening Cursor Chat (`Cmd/Ctrl + L`) and asking:
```
"Show me how to get started with the PrayerMap project"
```

Happy coding! 🚀
