# Memory Bootstrap Command

You are starting a new Claude Code session for **PrayerMap**.

## MANDATORY STEPS (Execute in order)

### Step 1: Query Pinecone Memory

Read the knowledge graph from Pinecone to restore context from previous sessions:

```
Use mcp__pinecone-prayermap__read_graph to get the full knowledge graph
```

This contains:
- Previous session context and decisions
- Database schema learnings
- Bug fixes and what caused them
- Architecture decisions
- User preferences (JJ's standards)

### Step 2: Read Critical Documentation

After loading memory, read these files in order:

1. **docs/CLAUDE.md** - Entry point with Principle 0 (Verification) and 0.1 (Database-First)
2. **docs/ARTICLE.md** - The Autonomous Excellence Manifesto (operational philosophy)
3. **docs/LIVING-MAP-PRINCIPLE.md** - Core spiritual mission (ABSOLUTE PRIORITY)
4. **docs/PRD.md** - Product requirements and specifications
5. **docs/RULES.md** - Engineering guidelines and constraints
6. **docs/MODULAR-DESIGN-STANDARD.md** - Folder structure and code organization
7. **CURSOR.md** - Anti-lying verification protocol (root level)

### Step 3: Read Active Rules

Check for active MDC rules:

```
ls .cursor/rules/
```

Key rules to be aware of:
- `core-rules.mdc` - Verification, Database-First, Living Map
- `agent-orchestration.mdc` - Director pattern for multi-agent work
- `observability-driven-development.mdc` - Logging and monitoring standards

### Step 4: Report Ready Status

After completing steps 1-3, provide a status report:

```markdown
## Memory Loaded

### From Pinecone
- [Summary of key entities and recent context]

### Documentation Read
- [x] CLAUDE.md - Principle 0 & 0.1 active
- [x] ARTICLE.md - Operational philosophy loaded
- [x] LIVING-MAP-PRINCIPLE.md - Core mission understood
- [x] PRD.md - Requirements loaded
- [x] RULES.md - Constraints loaded
- [x] MODULAR-DESIGN-STANDARD.md - FSD architecture understood
- [x] CURSOR.md - Verification protocol active

### Key Reminders
- A fix is NOT a fix until verified by human
- Database schema is source of truth, not TypeScript
- Living Map requirements override technical preferences
- Use structured logging for all operations
- Changes go to `develop` branch, production requires JJ sign-off

### Ready for instructions
```

---

## Quick Reference

### GitHub
- Owner: `jeffmichaeljohnson-tech`
- Repo: `prayermap`

### Branches
- `develop` - Active development
- `main` - Production (requires JJ sign-off)

### Memory Systems
- **Pinecone**: `prayermap` namespace for project knowledge
- **Pinecone**: `ora` namespace for framework patterns
- **LangSmith**: Agent performance tracking
- **Datadog**: Security, debugging, performance

### The Non-Negotiables
1. **Verification Enforcement** - Three states: WRITTEN → TESTED → DEPLOYED
2. **Database-First Debugging** - Check schema before code
3. **Living Map Principle** - Real-time < 2s, eternal memorial lines
4. **No green checkmarks** - Use the symbol instead

---

**This command ensures context continuity across Claude Code sessions.**
