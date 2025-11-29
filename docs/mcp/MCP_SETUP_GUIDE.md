# MCP Setup Guide: Connecting Cursor to Claude Code & Claude Desktop

This guide will help you configure Model Context Protocol (MCP) access from your Cursor workspace to Claude Code and Claude Desktop.

## Overview

MCP allows bidirectional communication between Cursor, Claude Code, and Claude Desktop, enabling:
- Shared context across tools
- Cross-platform AI assistance
- Enhanced workflow integration
- Workspace file access from Claude services

## Prerequisites

- Cursor IDE installed
- Claude Code installed (if using)
- Claude Desktop installed (if using)
- Node.js installed (for MCP server)
- Both applications running and accessible

## Architecture

The setup involves:
1. **Setting up an MCP server** that exposes your workspace
2. **Configuring Cursor** to connect to Claude services
3. **Configuring Claude Desktop** to connect to your workspace
4. **Configuring Claude Code** to connect to your workspace

## Configuration Steps

### Step 1: Set Up MCP Server for Your Workspace

First, we'll create an MCP server that exposes your PrayerMap workspace:

1. **Install MCP Server Package**:
   ```bash
   npm install -g @modelcontextprotocol/server
   ```

2. **Create MCP Server Configuration**:
   
   Create `mcp-server-config.json` in your workspace root:
   ```json
   {
     "name": "prayermap-workspace",
     "version": "1.0.0",
     "description": "MCP server for PrayerMap workspace",
     "workspace": "/Users/computer/jeffmichaeljohnson-tech/projects/prayermap",
     "capabilities": {
       "filesystem": true,
       "codebase": true,
       "context": true
     }
   }
   ```

3. **Start MCP Server** (optional, if running standalone):
   ```bash
   mcp-server --config mcp-server-config.json --port 3001
   ```

### Step 2: Configure Cursor MCP Settings

1. **Open Cursor Settings**:
   - Press `Cmd + Shift + J` (Mac) or `Ctrl + Shift + J` (Windows/Linux)
   - Or: `Cmd/Ctrl + ,` → Features → MCP

2. **Enable MCP**:
   - Toggle "Enable MCP" to ON
   - Ensure MCP servers are enabled

3. **Add Workspace MCP Server** (if running standalone):
   ```json
   {
     "mcpServers": {
       "prayermap-workspace": {
         "description": "PrayerMap workspace MCP server",
         "command": "npx",
         "args": [
           "-y",
           "@modelcontextprotocol/server",
           "--workspace",
           "/Users/computer/jeffmichaeljohnson-tech/projects/prayermap"
         ]
       }
     }
   }
   ```

### Step 3: Configure Claude Desktop MCP Settings

1. **Locate Claude Desktop Config File**:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. **Create or Edit Configuration File**:
   
   If the file doesn't exist, create it. Add or update the `mcpServers` section:
   ```json
   {
     "mcpServers": {
       "prayermap-workspace": {
         "description": "PrayerMap project workspace",
         "command": "npx",
         "args": [
           "-y",
           "@modelcontextprotocol/server",
           "--workspace",
           "/Users/computer/jeffmichaeljohnson-tech/projects/prayermap"
         ]
       }
     }
   }
   ```

   **Note**: If you're running a standalone MCP server, use:
   ```json
   {
     "mcpServers": {
       "prayermap-workspace": {
         "description": "PrayerMap workspace via HTTP",
         "url": "http://localhost:3001"
       }
     }
   }
   ```

3. **Restart Claude Desktop**:
   - Fully quit Claude Desktop (Cmd+Q on Mac)
   - Reopen to apply changes

### Step 4: Configure Claude Code MCP Settings

If you're using Claude Code:

1. **Add MCP Server via Command Line**:
   ```bash
   claude mcp add --transport http prayermap-workspace http://localhost:3001
   ```
   
   Or if using direct workspace access:
   ```bash
   claude mcp add --transport stdio prayermap-workspace npx -y @modelcontextprotocol/server --workspace /Users/computer/jeffmichaeljohnson-tech/projects/prayermap
   ```

2. **Activate in Claude Code**:
   - Launch Claude Code
   - Run: `/mcp`
   - Select `prayermap-workspace` and authenticate

### Step 5: Verify Connection

1. **In Cursor**:
   - Open Cursor Chat (`Cmd/Ctrl + L`)
   - Test: `@mcp What MCP servers are available?`
   - Should show workspace MCP server

2. **In Claude Desktop**:
   - Ask: "Can you access the PrayerMap workspace at /Users/computer/jeffmichaeljohnson-tech/projects/prayermap/?"
   - Try: "What files are in the src/components directory?"
   - Should confirm workspace access

3. **In Claude Code**:
   - Test: `/mcp prayermap-workspace list files`
   - Verify context sharing works

## Alternative: Using Environment Variables

If you prefer environment-based configuration, create a `.env.mcp` file in your workspace root:

```bash
# .env.mcp (DO NOT COMMIT THIS FILE)
ANTHROPIC_API_KEY=your-api-key-here
CURSOR_WORKSPACE_PATH=/Users/computer/jeffmichaeljohnson-tech/projects/prayermap
CLAUDE_DESKTOP_CONFIG_PATH=~/Library/Application Support/Claude/claude_desktop_config.json
```

Then reference these in your MCP configurations.

## Troubleshooting

### Issue: MCP servers not showing up in Cursor

**Solutions**:
1. Restart Cursor completely
2. Check Cursor Settings → Features → MCP → Enable MCP
3. Verify JSON syntax in configuration
4. Check Cursor logs: `Cmd/Ctrl + Shift + P` → "Show Logs"

### Issue: Claude Desktop can't connect to workspace

**Solutions**:
1. Verify workspace path is correct and absolute
2. Ensure Claude Desktop has file system permissions
3. Check that the workspace directory exists and is accessible
4. Restart Claude Desktop

### Issue: API key errors

**Solutions**:
1. Verify your Anthropic API key is valid
2. Check that the key is set in environment variables or config
3. Ensure the key has necessary permissions

### Issue: Cross-platform path issues

**Solutions**:
- Use absolute paths (not relative)
- Use forward slashes `/` even on Windows
- Verify paths match your actual file system

## Security Notes

⚠️ **Important**:
- Never commit API keys to version control
- Add `.env.mcp` to `.gitignore` (already done)
- Use environment variables for sensitive data
- Review MCP server permissions regularly

## Additional Resources

- [Cursor MCP Documentation](https://docs.cursor.sh/features/mcp)
- [Anthropic Claude MCP Guide](https://docs.anthropic.com/claude/docs/mcp)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)

## Next Steps

After setup:
1. Test basic MCP functionality
2. Explore shared context features
3. Configure workspace-specific MCP tools
4. Set up automated context syncing (optional)

---

**Last Updated**: 2025-01-27
**Workspace**: `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap`

