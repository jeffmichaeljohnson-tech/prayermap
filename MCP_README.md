# MCP Integration for PrayerMap Workspace

This directory contains configuration and setup files for Model Context Protocol (MCP) integration, enabling your Cursor workspace to communicate with Claude Code and Claude Desktop.

## Quick Start

### Automated Setup (Recommended)

**Important**: Make sure you're in the correct directory first:

```bash
cd /Users/computer/jeffmichaeljohnson-tech/projects/prayermap
./setup-mcp.sh
```

**Note**: The workspace path is `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap` (not `~/projects/prayermap`). Always use the absolute path in configurations.

This will:
- Install required MCP packages
- Create configuration files
- Set up Claude Desktop integration
- Provide next steps

### Manual Setup

1. **Read the Guide**: See `MCP_SETUP_GUIDE.md` for detailed instructions
2. **Quick Reference**: See `MCP_QUICK_REFERENCE.md` for commands and paths
3. **Configuration Files**:
   - Copy `.mcp.json.example` to `.mcp.json` (already gitignored)
   - Copy `mcp-server-config.json.example` to `mcp-server-config.json`
   - Configure Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`

## Files in This Setup

- **MCP_SETUP_GUIDE.md** - Comprehensive setup instructions
- **MCP_QUICK_REFERENCE.md** - Quick commands and troubleshooting
- **setup-mcp.sh** - Automated setup script
- **.mcp.json.example** - Template for Cursor MCP config (copy to `.mcp.json`)
- **mcp-server-config.json.example** - Template for MCP server config

## What This Enables

Once configured, you'll be able to:

✅ **From Claude Desktop**:
- Access PrayerMap workspace files
- Query codebase structure
- Get context about the project

✅ **From Claude Code**:
- Connect to PrayerMap workspace
- Share context with Cursor
- Access project files

✅ **From Cursor**:
- Use MCP servers for enhanced functionality
- Share workspace context with Claude services

## Configuration Locations

| Service | Config Location |
|---------|----------------|
| Cursor | `Cmd/Ctrl + Shift + J` → MCP Settings |
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Claude Code | Via command line: `claude mcp add` |

## Security Notes

⚠️ **Important**:
- `.mcp.json` is already in `.gitignore` (contains local config)
- Never commit API keys or sensitive data
- Review file permissions for workspace access

## Troubleshooting

See `MCP_QUICK_REFERENCE.md` for common issues and solutions.

Common fixes:
- Restart applications after config changes
- Verify JSON syntax in config files
- Check that Node.js and npm are installed
- Ensure workspace paths are absolute

## Next Steps After Setup

1. ✅ Run `./setup-mcp.sh`
2. ✅ Restart Claude Desktop
3. ✅ Enable MCP in Cursor settings
4. ✅ Test connections (see guide)
5. ✅ Start using shared context!

---

**Workspace**: `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap`
**Last Updated**: 2025-01-27


