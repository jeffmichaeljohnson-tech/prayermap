# 🪢 SEATBELT - Master Configuration Audit Process

> **Codename: SEATBELT**
> **Purpose:** Ensure all AI development tools have synchronized, validated configurations before development begins.
> **Created:** 2025-12-03
> **Last Audit:** 2025-12-03

---

## 🚨 CRITICAL: Authentication Check (Run FIRST!)

**90% of agent failures are due to expired authentication.** Run this before any multi-agent workflow:

```bash
echo "=== 🔐 AUTHENTICATION STATUS ===" && \
echo "" && \
echo "📦 GitHub:" && \
gh auth status 2>&1 | head -5 && \
echo "" && \
echo "🗄️ Supabase CLI:" && \
(supabase projects list --limit 1 > /dev/null 2>&1 && echo "✅ Authenticated" || echo "❌ NEEDS LOGIN: Run 'supabase login'") && \
echo "" && \
echo "▲ Vercel CLI:" && \
(vercel whoami 2>&1 | head -1 || echo "❌ NEEDS LOGIN: Run 'vercel login'") && \
echo "" && \
echo "🐙 Git Push Test:" && \
(cd /Users/computer/jeffmichaeljohnson-tech/projects/prayermap && git push --dry-run 2>&1 | head -2 || echo "⚠️ May need auth refresh")
```

### If Authentication Fails

```bash
# GitHub - Refresh token
gh auth login

# Supabase - Re-authenticate
supabase login

# Vercel - Re-authenticate
vercel login

# Git SSH - Test connection
ssh -T git@github.com
```

---

## 📋 Quick Audit Checklist

```bash
# Run this to validate all configs are valid JSON
echo "=== SEATBELT Quick Check ===" && \
echo -n "Claude Desktop: " && (cat "/Users/computer/Library/Application Support/Claude/claude_desktop_config.json" | python3 -m json.tool > /dev/null 2>&1 && echo "✅" || echo "❌") && \
echo -n "Cursor MCP: " && (cat "/Users/computer/.cursor/mcp.json" | python3 -m json.tool > /dev/null 2>&1 && echo "✅" || echo "❌") && \
echo -n "Claude Code: " && (cat "/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/.mcp.json" | python3 -m json.tool > /dev/null 2>&1 && echo "✅" || echo "❌") && \
echo -n "Git Config: " && (test -f "/Users/computer/.gitconfig" && echo "✅" || echo "❌")
```

---

## 🗂️ MASTER FILE INVENTORY

### Tier 1: AI Tool Configurations

| File | Tool | Purpose | Servers |
|------|------|---------|---------|
| `/Users/computer/Library/Application Support/Claude/claude_desktop_config.json` | Claude Desktop | MCP server config | 13 |
| `/Users/computer/.cursor/mcp.json` | Cursor IDE | MCP server config | 13 |
| `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/.mcp.json` | Claude Code | Project MCP servers | 12 |
| `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/.claude/settings.local.json` | Claude Code | Permissions & enabled servers | - |
| `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/.claude/config.json` | Claude Code | Organization & env vars | - |

### Tier 2: Development Environment

| File | Purpose | Status |
|------|---------|--------|
| `/Users/computer/.gitconfig` | Git identity, aliases, preferences | ✅ Created |
| `/Users/computer/.gitignore_global` | Global ignore patterns | ✅ Created |
| `/Users/computer/.zshrc` | Zsh shell config (NVM) | ✅ Verified |
| `/Users/computer/.zprofile` | Zsh profile (Homebrew) | ✅ Verified |
| `/Users/computer/.aws/config` | AWS CLI config | ✅ Verified |

### Tier 3: Project Environment

| File | Purpose | Status |
|------|---------|--------|
| `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/.env.local` | Project secrets & API keys | ✅ Verified |
| `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/docs/CLAUDE.md` | Claude Code instructions | ✅ Verified |


---

## 🔌 MCP SERVER PARITY MATRIX

| MCP Server | Claude Desktop | Cursor | Claude Code | Purpose |
|------------|:--------------:|:------:|:-----------:|---------|
| `supabase` | ✅ | ✅ | ✅ | Database, Auth, Storage |
| `github` | ✅ | ✅ | ✅ | Repos, Issues, PRs |
| `filesystem` | ✅ | ✅ | ➖ | File access (native in CC) |
| `pinecone-ora` | ✅ | ✅ | ✅ | Ora knowledge graph |
| `pinecone-prayermap` | ✅ | ✅ | ✅ | PrayerMap knowledge |
| `figma` | ✅ | ✅ | ✅ | Design file access |
| `figma-framelink` | ✅ | ✅ | ✅ | Optimized code gen |
| `vercel` | ✅ | ✅ | ✅ | Deployments, domains |
| `slack` | ✅ | ✅ | ✅ | Team messaging |
| `langsmith` | ✅ | ✅ | ✅ | LLM tracing |
| `brave-search` | ✅ | ✅ | ✅ | Web search |
| `fetch` | ✅ | ✅ | ✅ | HTTP requests |
| `sequential-thinking` | ✅ | ✅ | ✅ | Complex reasoning |

---

## 🔑 API KEYS & TOKENS REGISTRY

> ⚠️ **SECURITY NOTE:** Tokens listed here are for audit reference only. 
> Never commit this file to a public repository.

### Authentication Tokens

| Service | Env Variable | Token Prefix | Location |
|---------|--------------|--------------|----------|
| **Supabase** | `SUPABASE_ACCESS_TOKEN` | `sbp_` | MCP configs |
| **GitHub** | `GITHUB_PERSONAL_ACCESS_TOKEN` | `github_pat_` | MCP configs |
| **Figma** | `FIGMA_API_KEY` | `figd_` | MCP configs |
| **Slack** | `SLACK_BOT_TOKEN` | `xoxb-` | MCP configs |
| **Slack** | `SLACK_TEAM_ID` | `T` | MCP configs |
| **Pinecone** | `PINECONE_API_KEY` | `pcsk_` | MCP configs |
| **LangSmith** | `LANGSMITH_API_KEY` | `lsv2_sk_` | MCP configs |
| **Brave Search** | `BRAVE_API_KEY` | `BSA` | MCP configs |
| **Anthropic** | `ANTHROPIC_API_KEY` | `sk-ant-` | .env.local |
| **OpenAI** | `OPENAI_API_KEY` | `sk-proj-` | .env.local |
| **Mapbox** | `VITE_MAPBOX_TOKEN` | `pk.eyJ` | .env.local |
| **Datadog** | `DATADOG_API_KEY` | (hex) | .env.local |
| **AWS** | `AWS_ACCESS_KEY_ID` | `AKIA` | .env.local |


---

## 📁 COMPLETE FILE PATHS

### Claude Desktop
```
/Users/computer/Library/Application Support/Claude/
├── claude_desktop_config.json    # Main MCP configuration
└── logs/                         # Debug logs
```

### Cursor
```
/Users/computer/.cursor/
├── mcp.json                      # MCP server configuration
└── extensions/                   # Installed extensions

/Users/computer/Library/Application Support/Cursor/
└── User/
    └── settings.json             # Editor settings
```

### Claude Code (Global)
```
/Users/computer/.claude/
├── debug/                        # Debug logs
├── downloads/                    # Downloaded files
├── shell-snapshots/              # Shell state snapshots
├── statsig/                      # Feature flags
└── todos/                        # Task tracking
```

### Claude Code (Project)
```
/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/.claude/
├── config.json                   # Organization & env placeholders
└── settings.local.json           # Permissions & enabled MCP servers

/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/
└── .mcp.json                     # Project MCP server configuration
```

### Git Configuration
```
/Users/computer/
├── .gitconfig                    # Git identity & preferences
└── .gitignore_global             # Global ignore patterns
```

### Shell Environment
```
/Users/computer/
├── .zshrc                        # Zsh config (NVM setup)
├── .zprofile                     # Zsh profile (Homebrew)
├── .bashrc                       # Bash config (if used)
└── .bash_profile                 # Bash profile (if used)
```

### Cloud Services
```
/Users/computer/
├── .aws/
│   └── config                    # AWS CLI configuration
├── .vercel/                      # Vercel CLI state
├── .supabase/                    # Supabase CLI state
└── .docker/                      # Docker configuration
```


---

## 🔧 COMMON CONFIGURATION ISSUES

### Issue: MCP Server Not Loading
**Symptoms:** Tool not available, "server not found" errors

**Checklist:**
1. ✅ JSON syntax valid (no trailing commas, proper quotes)
2. ✅ Environment variables are plain strings (NOT `${VAR}` syntax)
3. ✅ Token/key is correct and not expired
4. ✅ App restarted after config change

### Issue: Supabase MCP Not Working
**Fix:** Use Personal Access Token, not project service key
```
Wrong: SUPABASE_ACCESS_KEY or SUPABASE_SERVICE_ROLE_KEY
Right: SUPABASE_ACCESS_TOKEN (generate at supabase.com/dashboard/account/tokens)
```

### Issue: Slack MCP Auth Failure
**Fix:** Ensure both token AND team ID are present
```json
"env": {
  "SLACK_BOT_TOKEN": "xoxb-...",
  "SLACK_TEAM_ID": "T09P4910D9U"
}
```

### Issue: Vercel MCP Not Working
**Fix:** Don't set VERCEL_TOKEN - use CLI auth
```bash
vercel login  # Authenticate first
```

### Issue: Git Commits Failing
**Fix:** Ensure .gitconfig exists with identity
```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

---

## 🔄 SEATBELT AUDIT PROCEDURE

### Before Starting Development

Run the full Seatbelt check:

```bash
#!/bin/bash
# SEATBELT Pre-Flight Check

echo "🪢 SEATBELT Configuration Audit"
echo "================================"
echo ""

# 1. Validate JSON configs
echo "📋 Config Validation:"
echo -n "  Claude Desktop: "
cat "/Users/computer/Library/Application Support/Claude/claude_desktop_config.json" | python3 -m json.tool > /dev/null 2>&1 && echo "✅" || echo "❌ INVALID"

echo -n "  Cursor MCP: "
cat "/Users/computer/.cursor/mcp.json" | python3 -m json.tool > /dev/null 2>&1 && echo "✅" || echo "❌ INVALID"

echo -n "  Claude Code: "
cat "/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/.mcp.json" | python3 -m json.tool > /dev/null 2>&1 && echo "✅" || echo "❌ INVALID"

echo ""

# 2. Check critical files exist
echo "📁 Critical Files:"
echo -n "  .gitconfig: "
test -f "/Users/computer/.gitconfig" && echo "✅" || echo "❌ MISSING"

echo -n "  .env.local: "
test -f "/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/.env.local" && echo "✅" || echo "❌ MISSING"

echo ""

# 3. Count MCP servers
echo "🔌 MCP Server Count:"
echo -n "  Claude Desktop: "
grep -c '"command":' "/Users/computer/Library/Application Support/Claude/claude_desktop_config.json" 2>/dev/null || echo "0"

echo -n "  Cursor: "
grep -c '"command":' "/Users/computer/.cursor/mcp.json" 2>/dev/null || echo "0"

echo -n "  Claude Code: "
grep -c '"command":' "/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/.mcp.json" 2>/dev/null || echo "0"

echo ""

# 4. Git identity check
echo "👤 Git Identity:"
echo -n "  User: "
git config --global user.name 2>/dev/null || echo "NOT SET"
echo -n "  Email: "
git config --global user.email 2>/dev/null || echo "NOT SET"

echo ""
echo "🪢 SEATBELT Check Complete"
```


---

## 📊 CONFIGURATION SNAPSHOTS

### Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "supabase": { "env": { "SUPABASE_ACCESS_TOKEN": "sbp_..." } },
    "github": { "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "github_pat_..." } },
    "filesystem": { "args": ["...", "/paths/to/access"] },
    "pinecone-ora": { "env": { "PINECONE_API_KEY": "pcsk_..." } },
    "pinecone-prayermap": { "env": { "PINECONE_API_KEY": "pcsk_..." } },
    "figma": { "env": { "FIGMA_API_KEY": "figd_..." } },
    "figma-framelink": { "args": ["--figma-api-key=figd_..."] },
    "vercel": { /* No env - uses CLI auth */ },
    "slack": { "env": { "SLACK_BOT_TOKEN": "xoxb-...", "SLACK_TEAM_ID": "T09P4910D9U" } },
    "langsmith": { "env": { "LANGSMITH_API_KEY": "lsv2_sk_...", "LANGSMITH_PROJECT": "prayermap" } },
    "brave-search": { "env": { "BRAVE_API_KEY": "BSA..." } },
    "fetch": { /* No auth required */ },
    "sequential-thinking": { /* No auth required */ }
  }
}
```

### Git Configuration (`.gitconfig`)
```ini
[user]
    name = Jeff Johnson
    email = jeffmichaeljohnson@gmail.com
[core]
    editor = code --wait
    excludesfile = ~/.gitignore_global
[init]
    defaultBranch = main
[push]
    default = current
    autoSetupRemote = true
[credential]
    helper = osxkeychain
```

---

## 📝 AUDIT LOG

| Date | Action | Files Modified | Status |
|------|--------|----------------|--------|
| 2025-12-03 | Initial SEATBELT audit | All configs | ✅ Complete |
| 2025-12-03 | Fixed Supabase env var | 3 MCP configs | ✅ Fixed |
| 2025-12-03 | Fixed Slack Team ID | claude_desktop_config.json | ✅ Fixed |
| 2025-12-03 | Created .gitconfig | /Users/computer/.gitconfig | ✅ Created |
| 2025-12-03 | Created .gitignore_global | /Users/computer/.gitignore_global | ✅ Created |
| 2025-12-03 | Synchronized Claude Code | .mcp.json, settings.local.json | ✅ Synced |
| 2025-12-03 | Full Cursor parity | /Users/computer/.cursor/mcp.json | ✅ Synced |

---

## 🚀 POST-SEATBELT ACTIONS

After running SEATBELT audit:

1. **Restart all AI tools**
   - Quit Claude Desktop → Reopen
   - Quit Cursor → Reopen
   - Exit `claude` CLI → Restart in project directory

2. **Verify MCP connections**
   - In Claude Desktop: Check if tools appear in attachment menu
   - In Cursor: Run MCP command to list servers
   - In Claude Code: Run `/mcp` to see available servers

3. **Test critical integrations**
   - GitHub: Can list repositories
   - Supabase: Can list tables
   - Slack: Can list channels
   - Vercel: Can list projects

---

## 📚 RELATED DOCUMENTATION

- **[SESSION-CONTEXT.md](./SESSION-CONTEXT.md)** - Pre-session context template (complete after SEATBELT)
- **[CLAUDE.md](./CLAUDE.md)** - Claude Code project instructions
- **[AI-AGENTS.md](./AI-AGENTS.md)** - Multi-agent coordination protocols
- **[ACCEPTANCE-CRITERIA.md](./ACCEPTANCE-CRITERIA.md)** - Definition of done standards
- **[SECURITY-SPEC.md](./SECURITY-SPEC.md)** - RLS policy design intent
- **[ENVIRONMENT-STRATEGY.md](./ENVIRONMENT-STRATEGY.md)** - Environment variable management
- **[ARTICLE.md](./ARTICLE.md)** - Operational philosophy
- **[LIVING-MAP-PRINCIPLE.md](./LIVING-MAP-PRINCIPLE.md)** - Core architecture principle

---

## 🏷️ VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-03 | Initial SEATBELT document created |
| 1.1.0 | 2025-12-03 | Added npm scripts, pre-commit hook, Pinecone storage |

---

## 🛠️ NPM SCRIPTS

```bash
# Run SEATBELT audit
npm run seatbelt

# Alias for seatbelt
npm run preflight
```

---

## 🪝 GIT PRE-COMMIT HOOK

SEATBELT automatically runs before every commit. Located at:
```
.git/hooks/pre-commit
```

**Behavior:**
- ✅ Passes → Commit proceeds normally
- ❌ Fails → Commit blocked until issues fixed
- 🚨 Emergency bypass: `git commit --no-verify`

---

## 💾 KNOWLEDGE STORAGE

SEATBELT audit data is stored in two Pinecone indexes:

| Index | Entities Stored |
|-------|-----------------|
| `pinecone-prayermap` | SEATBELT Configuration Audit, MCP Server Configuration, Configuration File Locations, Slack Integration, Git Configuration |
| `pinecone-ora` | SEATBELT Process (reusable), MCP Configuration Best Practices |

---

> **Remember:** Run SEATBELT before every major development session. A few minutes of verification prevents hours of debugging configuration issues.

