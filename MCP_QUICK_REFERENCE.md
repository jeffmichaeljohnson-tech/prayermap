# MCP Quick Reference

Quick commands and configuration snippets for MCP access to Claude Code and Claude Desktop.

## Cursor MCP Configuration Location

**Settings Path**: `Cmd/Ctrl + Shift + J` → MCP Settings

Or: `Cmd/Ctrl + ,` → Features → MCP

## Claude Desktop Config Location

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**Linux**: `~/.config/Claude/claude_desktop_config.json`

## Quick Setup Commands

### Copy Claude Desktop Config Path (macOS)
```bash
echo ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### Open Claude Desktop Config (macOS)
```bash
open ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### Open Claude Desktop Config (Windows)
```bash
notepad %APPDATA%\Claude\claude_desktop_config.json
```

## Test MCP Connection

### In Cursor Chat
```
@mcp List available MCP servers
@mcp What can Claude Desktop access?
```

### In Claude Desktop
```
Can you access the PrayerMap workspace at /Users/computer/jeffmichaeljohnson-tech/projects/prayermap/?
What files are in the src/components directory?
```

## Workspace Path

**Absolute Path**: `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap`

**Note**: Use the absolute path in all configurations. The `~` expansion may not work correctly if your home directory structure differs.

## Common Issues

| Issue | Quick Fix |
|-------|-----------|
| MCP not showing | Restart Cursor completely |
| Config not loading | Check JSON syntax, verify file path |
| API key error | Verify key in environment/config |
| Path issues | Use absolute paths, forward slashes. **Important**: The workspace is at `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap`, not `~/projects/prayermap` |

## Useful Commands

```bash
# Check if Claude Desktop is running (macOS)
pgrep -fl "Claude Desktop"

# Check Cursor MCP status
# Open Cursor → Settings → Features → MCP → Check server status

# View Cursor logs
# Cmd/Ctrl + Shift + P → "Show Logs"
```

## Configuration Template

See `.mcp.json.example` for a complete configuration template.

**Remember**: Copy `.mcp.json.example` to `.mcp.json` and fill in your API keys. The `.mcp.json` file is already in `.gitignore` to protect your secrets.


