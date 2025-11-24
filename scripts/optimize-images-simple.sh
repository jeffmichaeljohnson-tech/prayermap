#!/bin/bash

# Simple image optimization script using available tools

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ASSETS_DIR="$PROJECT_ROOT/figma-assets"

echo "🎨 Optimizing Figma assets..."

# Check for cwebp
if command -v cwebp &> /dev/null; then
    echo "✅ Creating WebP versions..."
    find "$ASSETS_DIR" -name "*.png" -type f | while read -r file; do
        webp_file="${file%.png}.webp"
        if [ ! -f "$webp_file" ]; then
            echo "  Converting: $(basename "$file")"
            cwebp -q 85 "$file" -o "$webp_file" 2>/dev/null || true
        fi
    done
    echo "✅ WebP conversion complete"
else
    echo "⚠️  cwebp not found. Install with: brew install webp"
fi

# Check for svgo
if command -v svgo &> /dev/null; then
    echo "✅ Optimizing SVG files..."
    find "$ASSETS_DIR" -name "*.svg" -type f | while read -r file; do
        echo "  Optimizing: $(basename "$file")"
        svgo "$file" --multipass --quiet 2>/dev/null || true
    done
    echo "✅ SVG optimization complete"
else
    echo "⚠️  svgo not found. Install with: npm install -g svgo"
fi

# Generate simple report
REPORT_FILE="$ASSETS_DIR/00-DOCUMENTATION/05-OPTIMIZATION-REPORT.md"
cat > "$REPORT_FILE" << EOF
# PrayerMap Asset Optimization Report

**Date:** $(date +"%Y-%m-%d %H:%M:%S")

## Summary

### File Counts

\`\`\`
PNG Files: $(find "$ASSETS_DIR" -name "*.png" | wc -l | tr -d ' ')
SVG Files: $(find "$ASSETS_DIR" -name "*.svg" | wc -l | tr -d ' ')
WebP Files: $(find "$ASSETS_DIR" -name "*.webp" | wc -l | tr -d ' ')
\`\`\`

### Screenshots Extracted

\`\`\`
$(ls -lh "$ASSETS_DIR/01-SCREENS/2x/"*.png 2>/dev/null | awk '{print $9, $5}' | sed 's|.*/||')
\`\`\`

## Status

- [x] Screenshots extracted from Figma site
- [$(command -v cwebp &> /dev/null && echo "x" || echo " ")] WebP versions created
- [$(command -v svgo &> /dev/null && echo "x" || echo " ")] SVG optimization complete

## Next Steps

1. Review extracted screenshots
2. Install optimization tools for better compression:
   - \`brew install imageoptim-cli\` (for PNG optimization)
   - \`brew install webp\` (for WebP conversion)
   - \`npm install -g svgo\` (for SVG optimization)
3. Compare with app screenshots: \`npm run sync-figma-screenshots\`

EOF

echo ""
echo "✨ Optimization complete!"
echo "📊 Report: $REPORT_FILE"


