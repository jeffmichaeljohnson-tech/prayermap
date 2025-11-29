# Cursor IDE Settings Recommendation

Configure these settings in Cursor to maximize productivity with PrayerMap.

## Required Settings

### 1. Enable Rules Processing

Open Cursor Settings (`Cmd/Ctrl + ,`) and add to your `settings.json`:

```json
{
  "workbench.editorAssociations": {
    "*.mdc": "default"
  }
}
```

This prevents .mdc files from rendering as UI and ensures proper save functionality.

### 2. Enable Codebase Indexing

1. Open Settings (`Cmd/Ctrl + ,`)
2. Search for "Codebase"
3. Enable "Index codebase for AI chat"
4. Wait for initial indexing to complete

### 3. Configure File Exclusions

Add to `settings.json` to speed up indexing:

```json
{
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true,
    "**/ios/Pods": true,
    "**/android/.gradle": true,
    "**/android/build": true
  }
}
```

## Recommended Extensions

Install these VS Code extensions for best experience:

1. **ESLint** - Error checking
2. **Tailwind CSS IntelliSense** - CSS autocompletion
3. **Prettier** - Code formatting
4. **PostCSS Language Support** - For Tailwind
5. **Playwright Test for VSCode** - Test runner

## User Rules (Global)

Add these to your Cursor global User Rules (Settings > Features > Rules for AI):

```
You are an expert developer working on PrayerMap, a sacred digital platform for prayer.

Key Guidelines:
1. Always check AGENTS.md for project-specific guidelines
2. Use TypeScript with strict types - never use 'any'
3. Follow the glassmorphic design system in tailwind.config.js
4. All data fetching should use React Query
5. All forms should use React Hook Form + Zod
6. Test on mobile viewports before completing UI work
7. Handle loading, error, and empty states for all async operations

Before making changes:
1. Read the relevant files to understand context
2. Check for existing patterns in similar files
3. Verify TypeScript types are correct
4. Ensure TailwindCSS classes match the design system
```

## Project Rules Setup Verification

After setup, verify rules are working:

1. Open Cursor Chat (`Cmd/Ctrl + L`)
2. Type: `@core-rules Show me the project tech stack`
3. You should see a response referencing PrayerMap's React/TypeScript/Supabase stack

## Multi-Agent Mode

For complex tasks with multiple agents:

1. Create clear task breakdowns in your prompts
2. Reference the agent-orchestration.mdc rules
3. Use the handoff protocol documented in AGENTS.md
4. Track progress with explicit TODO comments

## Keyboard Shortcuts

Customize these for faster workflow:

| Action | Shortcut |
|--------|----------|
| Open Chat | `Cmd/Ctrl + L` |
| Inline Edit | `Cmd/Ctrl + K` |
| Accept Suggestion | `Tab` |
| Reject Suggestion | `Esc` |
| Open Command Palette | `Cmd/Ctrl + Shift + P` |
| Toggle Terminal | `` Ctrl + ` `` |
| Go to File | `Cmd/Ctrl + P` |

## Troubleshooting

### Rules Not Loading

1. Check `.cursor/rules/` directory exists
2. Verify files have `.mdc` extension
3. Reload Cursor (`Cmd/Ctrl + Shift + P` > "Reload Window")

### AI Not Following Rules

1. Reference rules explicitly: `@react-typescript`
2. Quote rules in prompt: "Following the React rules..."
3. Check if rule file is too long (keep under 1000 lines)

### Slow Indexing

1. Check file exclusions are set
2. Ensure node_modules is excluded
3. Wait for initial index to complete (check status bar)

## Session Start Checklist

When starting a new development session:

1. [ ] Pull latest changes: `git pull`
2. [ ] Install dependencies: `npm install`
3. [ ] Start dev server: `npm run dev`
4. [ ] Verify Cursor indexing is complete
5. [ ] Read any recent TODO comments in the codebase

---

For more details, see:
- `AGENTS.md` - AI coding agent guidelines
- `.cursor/rules/*.mdc` - Modular rule files
- `README.md` - Project overview
