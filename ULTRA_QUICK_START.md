# ⚡ ULTRA-QUICK START - 3 MINUTES

## Step 1: Extract (30 seconds)
1. Download `prayermap-cursor-package.zip`
2. Extract to: `~/Projects/prayermap/` (or your preferred location)

## Step 2: Open in Cursor (30 seconds)
```bash
cd ~/Projects/prayermap
cursor .
```

## Step 3: Configure Settings (2 minutes)

### A. Open Settings
- Mac: `Cmd + ,`
- Windows/Linux: `Ctrl + ,`

### B. Add Rules for AI

Navigate to: **Features → Rules for AI**

**Copy-paste this entire block**:

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

### C. Enable Indexing

Navigate to: **Features → Codebase Indexing**

Check these boxes:
- ☑️ Enable Codebase Indexing
- ☑️ Auto-index on startup

**Add Include Patterns** (one per line):
```
**/*.md
**/*.ts
**/*.tsx
**/*.sql
```

**Add Exclude Patterns** (one per line):
```
**/node_modules/**
**/dist/**
**/build/**
**/.env*
```

### D. Save
Settings auto-save. Close settings.

---

## Step 4: Verify (30 seconds)

1. Open Chat: `Cmd/Ctrl + L`
2. Type: `@index What are the core rules?`
3. ✅ Should show PrayerMap context

**DONE!** 🎉

---

## 📚 What to Read Next

1. `README.md` - Package overview
2. `CURSOR_SETUP_GUIDE.md` - Detailed guide
3. `CURSOR_QUICK_REFERENCE.md` - Daily reference
4. `START_HERE_v2.md` - Project overview

---

## 💡 First Prompt to Try

```
"Based on @START_HERE_v2.md, explain PrayerMap's 
main features and tech stack"
```

---

## 🆘 Problems?

See `DEPLOYMENT_INSTRUCTIONS.md` → Troubleshooting section

---

**You're all set! Start coding with AI assistance.** 🚀
