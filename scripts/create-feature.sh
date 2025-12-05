#!/bin/bash

# Feature Module Generator
# Usage: ./scripts/create-feature.sh <feature-name>
# Example: ./scripts/create-feature.sh notifications
#
# See docs/MODULAR-STRUCTURE-POLICY.md for structure guidelines

set -e

if [ -z "$1" ]; then
    echo "Usage: ./scripts/create-feature.sh <feature-name>"
    echo "Example: ./scripts/create-feature.sh notifications"
    exit 1
fi

FEATURE_NAME=$1
FEATURE_PATH="src/features/$FEATURE_NAME"

# Validate feature name (kebab-case)
if [[ ! "$FEATURE_NAME" =~ ^[a-z][a-z0-9-]*$ ]]; then
    echo "Error: Feature name must be kebab-case (e.g., 'user-profile', 'notifications')"
    exit 1
fi

# Check if feature already exists
if [ -d "$FEATURE_PATH" ]; then
    echo "Error: Feature '$FEATURE_NAME' already exists at $FEATURE_PATH"
    exit 1
fi

echo "Creating feature module: $FEATURE_NAME"

# Create folder structure
mkdir -p "$FEATURE_PATH/components"
mkdir -p "$FEATURE_PATH/hooks"
mkdir -p "$FEATURE_PATH/services"
mkdir -p "$FEATURE_PATH/types"

# Convert kebab-case to PascalCase for component names
PASCAL_NAME=$(echo "$FEATURE_NAME" | sed -r 's/(^|-)(\w)/\U\2/g')

# Create index.ts (public API)
cat > "$FEATURE_PATH/index.ts" << EOF
/**
 * $PASCAL_NAME Feature Module
 *
 * Public API - Only export what other features need to consume.
 * See docs/MODULAR-STRUCTURE-POLICY.md for guidelines.
 */

// Components
// export { ${PASCAL_NAME}Component } from './components/${PASCAL_NAME}Component';

// Hooks
// export { use${PASCAL_NAME} } from './hooks/use${PASCAL_NAME}';

// Types
// export type { ${PASCAL_NAME}Type } from './types/${FEATURE_NAME}';
EOF

# Create types file
cat > "$FEATURE_PATH/types/${FEATURE_NAME}.ts" << EOF
/**
 * $PASCAL_NAME Types
 *
 * Define all TypeScript types, interfaces, and type utilities for this feature.
 */

export interface ${PASCAL_NAME}State {
  // Define your state shape
}

export interface ${PASCAL_NAME}Props {
  // Define common props
}
EOF

# Create example hook
cat > "$FEATURE_PATH/hooks/use${PASCAL_NAME}.ts" << EOF
/**
 * use${PASCAL_NAME} Hook
 *
 * Main hook for $PASCAL_NAME feature state and operations.
 */

import { useState } from 'react';
import type { ${PASCAL_NAME}State } from '../types/${FEATURE_NAME}';

export function use${PASCAL_NAME}() {
  const [state, setState] = useState<${PASCAL_NAME}State | null>(null);

  // Add your hook logic here

  return {
    state,
    // Add your return values
  };
}
EOF

# Create example component
cat > "$FEATURE_PATH/components/${PASCAL_NAME}Component.tsx" << EOF
/**
 * ${PASCAL_NAME}Component
 *
 * Main component for the $PASCAL_NAME feature.
 */

import type { ${PASCAL_NAME}Props } from '../types/${FEATURE_NAME}';

export function ${PASCAL_NAME}Component(props: ${PASCAL_NAME}Props) {
  return (
    <div>
      <h2>${PASCAL_NAME}</h2>
      {/* Add your component content */}
    </div>
  );
}
EOF

echo ""
echo "✅ Feature module created successfully!"
echo ""
echo "Structure created:"
echo "  $FEATURE_PATH/"
echo "  ├── components/"
echo "  │   └── ${PASCAL_NAME}Component.tsx"
echo "  ├── hooks/"
echo "  │   └── use${PASCAL_NAME}.ts"
echo "  ├── services/"
echo "  ├── types/"
echo "  │   └── ${FEATURE_NAME}.ts"
echo "  └── index.ts"
echo ""
echo "Next steps:"
echo "  1. Implement your components, hooks, and services"
echo "  2. Export public API in index.ts"
echo "  3. Import from other features using: import { ... } from '@features/$FEATURE_NAME'"
echo ""
echo "See docs/MODULAR-STRUCTURE-POLICY.md for guidelines."
