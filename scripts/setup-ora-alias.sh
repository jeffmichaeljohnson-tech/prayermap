#!/bin/bash

# Setup global 'ora' command alias for PrayerMap
# This creates a system-wide command that mimics the Ora framework

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Setting up global 'ora' command for PrayerMap..."

# Create symlink in /usr/local/bin (requires admin access)
if [[ -w "/usr/local/bin" ]]; then
    ln -sf "$SCRIPT_DIR/ora" "/usr/local/bin/ora"
    echo "✅ Global 'ora' command installed to /usr/local/bin/ora"
else
    echo "⚠️  Cannot write to /usr/local/bin (requires sudo)"
    echo "   Run: sudo ln -sf $SCRIPT_DIR/ora /usr/local/bin/ora"
fi

# Add to PATH in shell profiles
for shell_profile in ~/.bashrc ~/.zshrc ~/.bash_profile ~/.profile; do
    if [[ -f "$shell_profile" ]]; then
        # Check if already added
        if ! grep -q "$SCRIPT_DIR" "$shell_profile"; then
            echo "" >> "$shell_profile"
            echo "# PrayerMap Ora Command" >> "$shell_profile"
            echo "export PATH=\"$SCRIPT_DIR:\$PATH\"" >> "$shell_profile"
            echo "alias ora='$SCRIPT_DIR/ora'" >> "$shell_profile"
            echo "✅ Added to $shell_profile"
        else
            echo "ℹ️  Already exists in $shell_profile"
        fi
    fi
done

echo ""
echo "🎉 Ora command setup complete!"
echo ""
echo "Usage examples:"
echo "  ora \"Fix the inbox notification system\""
echo "  ora \"Optimize prayer loading performance\""
echo "  ora \"Debug authentication flow issues\""
echo ""
echo "Alternative commands:"
echo "  npm run agents:deploy  - Full 5-agent investigation swarm"
echo "  npm run agents:status  - Check agent status"
echo "  npm run agents:results - View results"
echo ""
echo "Restart your terminal or run: source ~/.zshrc (or ~/.bashrc)"