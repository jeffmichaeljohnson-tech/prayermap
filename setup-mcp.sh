#!/bin/bash

# MCP Setup Script for PrayerMap Workspace
# This script helps set up MCP access to Claude Code and Claude Desktop

set -e

WORKSPACE_PATH="/Users/computer/jeffmichaeljohnson-tech/projects/prayermap"
CLAUDE_DESKTOP_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"

echo "🚀 Setting up MCP for PrayerMap workspace..."
echo ""

# Verify we're in the correct directory
CURRENT_DIR=$(pwd)
if [ "$CURRENT_DIR" != "$WORKSPACE_PATH" ]; then
    echo "⚠️  Warning: Current directory ($CURRENT_DIR) doesn't match expected workspace path."
    echo "   Expected: $WORKSPACE_PATH"
    echo "   Continuing anyway, but paths in configs will use: $WORKSPACE_PATH"
    echo ""
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Install MCP server package globally
echo ""
echo "📦 Installing MCP server package..."
npm install -g @modelcontextprotocol/server || {
    echo "⚠️  Failed to install globally, trying with npx (will work but slower)..."
}

# Create MCP server config if it doesn't exist
if [ ! -f "mcp-server-config.json" ]; then
    echo ""
    echo "📝 Creating mcp-server-config.json from example..."
    cp mcp-server-config.json.example mcp-server-config.json
    echo "✅ Created mcp-server-config.json"
    echo "   Please review and adjust if needed"
else
    echo "✅ mcp-server-config.json already exists"
fi

# Create .mcp.json if it doesn't exist
if [ ! -f ".mcp.json" ]; then
    echo ""
    echo "📝 Creating .mcp.json from example..."
    cp .mcp.json.example .mcp.json
    echo "✅ Created .mcp.json"
    echo "   This file is gitignored and contains your local MCP config"
else
    echo "✅ .mcp.json already exists"
fi

# Setup Claude Desktop config
echo ""
echo "🔧 Configuring Claude Desktop..."

# Create Claude config directory if it doesn't exist
mkdir -p "$HOME/Library/Application Support/Claude"

# Check if Claude Desktop config exists
if [ -f "$CLAUDE_DESKTOP_CONFIG" ]; then
    echo "✅ Claude Desktop config found at: $CLAUDE_DESKTOP_CONFIG"
    echo ""
    echo "⚠️  Claude Desktop config already exists."
    echo "   Please manually add the prayermap-workspace server to:"
    echo "   $CLAUDE_DESKTOP_CONFIG"
    echo ""
    echo "   Add this to the mcpServers section:"
    echo '   {'
    echo '     "prayermap-workspace": {'
    echo '       "description": "PrayerMap project workspace",'
    echo '       "command": "npx",'
    echo '       "args": ['
    echo '         "-y",'
    echo '         "@modelcontextprotocol/server",'
    echo '         "--workspace",'
    echo "         \"$WORKSPACE_PATH\""
    echo '       ]'
    echo '     }'
    echo '   }'
else
    echo "📝 Creating Claude Desktop config..."
    cat > "$CLAUDE_DESKTOP_CONFIG" << EOF
{
  "mcpServers": {
    "prayermap-workspace": {
      "description": "PrayerMap project workspace",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server",
        "--workspace",
        "$WORKSPACE_PATH"
      ]
    }
  }
}
EOF
    echo "✅ Created Claude Desktop config at: $CLAUDE_DESKTOP_CONFIG"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Review mcp-server-config.json and adjust if needed"
echo "2. If Claude Desktop config was created, restart Claude Desktop"
echo "3. In Cursor: Cmd/Ctrl + Shift + J → Enable MCP"
echo "4. In Claude Code: Run 'claude mcp add' command (see MCP_SETUP_GUIDE.md)"
echo ""
echo "For detailed instructions, see: MCP_SETUP_GUIDE.md"
echo "For quick reference, see: MCP_QUICK_REFERENCE.md"


