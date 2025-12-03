# SEATBELT - Master Configuration Audit System

> **Codename: SEATBELT**
> **Purpose:** Ensure all AI development tools have synchronized, validated configurations before development begins.
> **Created:** 2025-12-03
> **Last Updated:** 2025-12-03

---

## Quick Start

```bash
# Full audit (recommended before development sessions)
npm run seatbelt

# Quick check (authentication + config validation only)
npm run preflight
# or
npm run seatbelt:quick

# API key health check only
npm run seatbelt:keys

# Direct script access with all options
./scripts/seatbelt.sh --help
```

---

## CRITICAL: Authentication Check (Run FIRST!)

**90% of agent failures are due to expired authentication.** Run this before any multi-agent workflow:

```bash
npm run preflight
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

## Script Options

| Option | Description |
|--------|-------------|
| `--quick` | Run essential checks only (auth + JSON validation) |
| `--full` | Run all checks including API key health (default) |
| `--keys-only` | Only check API key health validation |
| `--json` | Output results as JSON (for CI/agent consumption) |
| `--fix` | Attempt to auto-fix issues where possible |
| `--ci` | CI mode - exit 1 on any failure, minimal output |
| `--verbose` | Show detailed output for each check |
| `--help` | Show help message |

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All checks passed |
| `1` | Critical failures (blocks development) |
| `2` | Warnings (development can proceed with caution) |

---

## Check Modules

SEATBELT uses a modular architecture with individual check scripts in `scripts/seatbelt/`:

| Module | Purpose |
|--------|---------|
| `check_auth.sh` | CLI authentication (GitHub, Supabase, Vercel, AWS, Git SSH) |
| `check_configs.sh` | JSON syntax validation, MCP server parity |
| `check_env.sh` | Environment variables completeness and security |
| `check_git.sh` | Git repository state, remote connectivity |
| `check_cli.sh` | CLI tools installation, project linking |
| `check_keys.sh` | API key health validation (live checks without side effects) |
| `check_structure.sh` | Project structure, critical files |

---

## API Key Health Validation

The `check_keys` module validates API keys are **alive, not expired, and have proper permissions** using lightweight API calls that don't incur costs or cause side effects.

### Validated Services

| Service | Validation Method | Endpoint |
|---------|------------------|----------|
| **Supabase** | REST API health check | `/rest/v1/` |
| **Mapbox** | Minimal geocoding request | `/geocoding/v5/mapbox.places/test.json` |
| **OpenAI** | List models (no charge) | `/v1/models` |
| **Anthropic** | List models | `/v1/models` |
| **Pinecone** | List indexes | `/indexes` |
| **Slack** | Auth test | `/api/auth.test` |
| **LangSmith** | API info | `/api/v1/info` |
| **Brave Search** | Minimal search | `/web/search?q=test&count=1` |
| **Datadog** | Validate key | `/api/v1/validate` |
| **GitHub** | Get user | `/user` |
| **Figma** | Get me | `/v1/me` |
| **Hive AI** | Format validation | (no live endpoint) |

### Security Checks

The key validation also performs security checks:
- Detects `VITE_HIVE_API_KEY` exposure (should be server-side only)
- Validates AWS credentials are configured
- Reports rate limiting as "valid but limited"

---

## Master File Inventory

### Tier 1: AI Tool Configurations

| File | Tool | Purpose | Servers |
|------|------|---------|---------|
| `/Users/computer/Library/Application Support/Claude/claude_desktop_config.json` | Claude Desktop | MCP server config | 13 |
| `/Users/computer/.cursor/mcp.json` | Cursor IDE | MCP server config | 13 |
| `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/.mcp.json` | Claude Code | Project MCP servers | 12 |
| `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/.claude/settings.local.json` | Claude Code | Permissions & enabled servers | - |

### Tier 2: Development Environment

| File | Purpose |
|------|---------|
| `/Users/computer/.gitconfig` | Git identity, aliases, preferences |
| `/Users/computer/.gitignore_global` | Global ignore patterns |
| `/Users/computer/.zshrc` | Zsh shell config (NVM) |
| `/Users/computer/.aws/config` | AWS CLI config |

### Tier 3: Project Environment

| File | Purpose |
|------|---------|
| `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/.env.local` | Project secrets & API keys |
| `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/docs/CLAUDE.md` | Claude Code instructions |

---

## MCP Server Parity Matrix

| MCP Server | Claude Desktop | Cursor | Claude Code | Purpose |
|------------|:--------------:|:------:|:-----------:|---------|
| `supabase` | Y | Y | Y | Database, Auth, Storage |
| `github` | Y | Y | Y | Repos, Issues, PRs |
| `filesystem` | Y | Y | - | File access (native in CC) |
| `pinecone-ora` | Y | Y | Y | Ora knowledge graph |
| `pinecone-prayermap` | Y | Y | Y | PrayerMap knowledge |
| `figma` | Y | Y | Y | Design file access |
| `figma-framelink` | Y | Y | Y | Optimized code gen |
| `vercel` | Y | Y | Y | Deployments, domains |
| `slack` | Y | Y | Y | Team messaging |
| `langsmith` | Y | Y | Y | LLM tracing |
| `brave-search` | Y | Y | Y | Web search |
| `fetch` | Y | Y | Y | HTTP requests |
| `sequential-thinking` | Y | Y | Y | Complex reasoning |

---

## API Keys & Tokens Registry

> **SECURITY NOTE:** Tokens listed here are for audit reference only.

### Token Prefixes

| Service | Env Variable | Token Prefix | Location |
|---------|--------------|--------------|----------|
| **Supabase** | `SUPABASE_ACCESS_TOKEN` | `sbp_` | MCP configs |
| **GitHub** | `GITHUB_PERSONAL_ACCESS_TOKEN` | `github_pat_` | MCP configs |
| **Figma** | `FIGMA_API_KEY` | `figd_` | MCP configs |
| **Slack** | `SLACK_BOT_TOKEN` | `xoxb-` | MCP configs |
| **Pinecone** | `PINECONE_API_KEY` | `pcsk_` | MCP configs |
| **LangSmith** | `LANGSMITH_API_KEY` | `lsv2_sk_` | MCP configs |
| **Brave Search** | `BRAVE_API_KEY` | `BSA` | MCP configs |
| **Anthropic** | `ANTHROPIC_API_KEY` | `sk-ant-` | .env.local |
| **OpenAI** | `OPENAI_API_KEY` | `sk-proj-` | .env.local |
| **Mapbox** | `VITE_MAPBOX_TOKEN` | `pk.eyJ` | .env.local |
| **AWS** | `AWS_ACCESS_KEY_ID` | `AKIA` | .env.local |

---

## Git Pre-Commit Hook

SEATBELT automatically runs before every commit via `.git/hooks/pre-commit`.

**Behavior:**
- Runs `--quick` mode (auth + config validation)
- **Passes** → Commit proceeds normally
- **Fails** → Commit blocked until issues fixed
- **Emergency bypass:** `git commit --no-verify`

---

## Common Configuration Issues

### Issue: MCP Server Not Loading
**Checklist:**
1. JSON syntax valid (no trailing commas, proper quotes)
2. Environment variables are plain strings (NOT `${VAR}` syntax)
3. Token/key is correct and not expired
4. App restarted after config change

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

---

## NPM Scripts

```bash
# Full SEATBELT audit
npm run seatbelt

# Quick check (auth + configs only)
npm run seatbelt:quick
npm run preflight

# API key health validation only
npm run seatbelt:keys
```

---

## CI Integration

For CI/CD pipelines:

```bash
# Run in CI mode (exit 1 on failure, minimal output)
./scripts/seatbelt.sh --ci

# Get JSON output for parsing
./scripts/seatbelt.sh --json
```

---

## Architecture

```
scripts/
├── seatbelt.sh              # Main orchestrator
└── seatbelt/
    ├── check_auth.sh        # CLI authentication
    ├── check_configs.sh     # JSON validation, MCP parity
    ├── check_env.sh         # Environment variables
    ├── check_git.sh         # Git state
    ├── check_cli.sh         # CLI tools & project linking
    ├── check_keys.sh        # API key health validation
    └── check_structure.sh   # Project structure

.git/hooks/
└── pre-commit               # Auto-runs seatbelt --quick
```

---

## Knowledge Storage

SEATBELT audit data is stored in Pinecone indexes:

| Index | Entities Stored |
|-------|-----------------|
| `pinecone-prayermap` | Configuration state, MCP servers, file locations |
| `pinecone-ora` | SEATBELT process (reusable), best practices |

---

## Related Documentation

- **[SESSION-CONTEXT.md](./SESSION-CONTEXT.md)** - Pre-session context template
- **[CLAUDE.md](./CLAUDE.md)** - Claude Code project instructions
- **[AI-AGENTS.md](./AI-AGENTS.md)** - Multi-agent coordination protocols
- **[ENVIRONMENT-STRATEGY.md](./ENVIRONMENT-STRATEGY.md)** - Environment variable management

---

## Audit Log

| Date | Action | Status |
|------|--------|--------|
| 2025-12-03 | Initial SEATBELT document | Complete |
| 2025-12-03 | Created modular script architecture | Complete |
| 2025-12-03 | Implemented API key health validation | Complete |
| 2025-12-03 | Added npm scripts, pre-commit hook | Complete |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-03 | Initial SEATBELT document |
| 2.0.0 | 2025-12-03 | Modular architecture, API key validation, npm scripts |

---

> **Remember:** Run SEATBELT before every major development session. A few minutes of verification prevents hours of debugging configuration issues.
