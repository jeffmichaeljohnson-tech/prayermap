# PrayerMap Ora Configuration

Project-specific configuration for the Ora autonomous agent framework.

## Structure

```
ora-config/
├── docs/                    # Agent reference documentation
│   ├── PATTERNS.md          # Code patterns
│   ├── TYPES.md             # TypeScript interfaces
│   ├── SUPABASE.md          # Database reference
│   ├── DESIGN-SYSTEM.md     # Visual design guide
│   └── IOS-STRATEGY.md      # iOS deployment strategy
├── mcp-server/              # MCP server for Claude memory access
│   ├── index.js             # Server implementation
│   ├── package.json         # Dependencies
│   └── README.md            # Setup instructions
└── README.md                # This file
```

## Purpose

This directory contains prayermap-specific customizations for the Ora framework:

1. **Agent Documentation** - Quick reference docs that agents can consume to understand project patterns
2. **MCP Server** - Gives Claude direct access to Pinecone memory and PostgreSQL state

## Relationship to .ora Submodule

- `.ora/` - The upstream Ora framework (submodule)
- `ora-config/` - PrayerMap-specific customizations (this directory)

The submodule provides the core framework; this directory provides project customizations.

## Setup

### MCP Server (Optional)

```bash
cd ora-config/mcp-server
npm install
```

Configure in Cursor's MCP settings to give Claude direct memory access.

### Documentation

The docs are automatically available to agents via Cursor's codebase indexing.
Reference them in prompts: `@ora-config/docs/PATTERNS.md`
