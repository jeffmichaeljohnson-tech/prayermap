# Cursor Settings - Copy & Paste Templates

## 🎯 Quick Copy-Paste Configurations

### 1. Rules for AI (Global Settings)

**Location**: Cursor Settings → Features → Rules for AI

**Copy this entire block**:

```
You are an expert full-stack developer specializing in React, TypeScript, Node.js, Express, and PostgreSQL.

CRITICAL WORKFLOW:
1. ALWAYS read project documentation BEFORE making changes:
   - START_HERE_v2.md - Project overview
   - PrayerMap_PRD_v2.md - Requirements  
   - PROJECT_STRUCTURE_v2.md - Architecture
   
2. NEVER make assumptions - ask clarifying questions

3. Follow the project's .cursorrules and .cursor/rules/*.mdc files

4. Write clean, tested, documented code

5. Consider security, performance, and accessibility

STYLE PREFERENCES:
- TypeScript for all code (no `any` types)
- Functional components only (no class components)
- Explicit error handling (no silent failures)
- Comprehensive JSDoc comments
- 80% minimum test coverage

CODE QUALITY STANDARDS:
- DRY (Don't Repeat Yourself)
- KISS (Keep It Simple)
- YAGNI (You Aren't Gonna Need It)
- SOLID principles
- Immutable data patterns

ERROR HANDLING:
- Always use try-catch for async operations
- Never silently ignore errors
- Use specific error types
- Log errors with context
- Return user-friendly error messages

SECURITY:
- Validate ALL user inputs
- Use parameterized queries only
- Implement rate limiting
- Never expose sensitive data in errors
- Use JWT in httpOnly cookies

When suggesting code:
- Provide complete, working examples
- Explain complex logic with comments
- Include error handling
- Follow existing project patterns
- Suggest improvements where appropriate
- Reference relevant documentation files
```

---

### 2. Indexing Patterns (Include)

**Location**: Cursor Settings → Features → Codebase Indexing → Include

**Copy these patterns** (one per line):

```
**/*.md
**/*.ts
**/*.tsx
**/*.jsx
**/*.js
**/*.sql
**/*.json
**/*.yml
**/*.yaml
```

---

### 3. Indexing Patterns (Exclude)

**Location**: Cursor Settings → Features → Codebase Indexing → Exclude

**Copy these patterns** (one per line):

```
**/node_modules/**
**/dist/**
**/build/**
**/.git/**
**/.next/**
**/.cache/**
**/coverage/**
**/*.log
**/.env*
**/out/**
**/.turbo/**
**/public/uploads/**
**/tmp/**
**/temp/**
```

---

### 4. TypeScript Settings (tsconfig.json)

**If you need to create or update `tsconfig.json`**:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "allowSyntheticDefaultImports": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/utils/*": ["src/utils/*"],
      "@/types/*": ["src/types/*"],
      "@/api/*": ["src/api/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "build"]
}
```

---

### 5. ESLint Configuration (.eslintrc.json)

**If you need ESLint configuration**:

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "plugins": ["@typescript-eslint", "react", "react-hooks"],
  "rules": {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { 
      "argsIgnorePattern": "^_" 
    }],
    "@typescript-eslint/no-explicit-any": "error",
    "no-console": ["warn", { 
      "allow": ["warn", "error"] 
    }]
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
```

---

### 6. Prettier Configuration (.prettierrc)

**For code formatting consistency**:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

---

### 7. Git Ignore (.gitignore)

**Add these patterns if not already present**:

```
# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Production
/build
/dist
/out

# Misc
.DS_Store
*.pem
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.idea/
.vscode/
*.swp
*.swo
*~

# Cursor
.cursor/
!.cursor/rules/
```

---

### 8. Package.json Scripts

**Recommended scripts to add to `package.json`**:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

---

### 9. Environment Variables Template (.env.example)

**Create this file for team reference**:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/prayermap
DB_HOST=localhost
DB_PORT=5432
DB_NAME=prayermap
DB_USER=postgres
DB_PASSWORD=your_password

# Authentication
JWT_SECRET=your_jwt_secret_key_here_min_32_chars
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# OAuth Providers
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
MAPBOX_ACCESS_TOKEN=your_mapbox_token

# Storage
AWS_BUCKET_NAME=prayermap-uploads
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret

# Email Service
SENDGRID_API_KEY=your_sendgrid_key
FROM_EMAIL=noreply@prayermap.com

# Redis (for caching)
REDIS_URL=redis://localhost:6379

# Application
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000/api
FRONTEND_URL=http://localhost:3000

# Monitoring
SENTRY_DSN=your_sentry_dsn
```

---

### 10. VS Code Settings (Optional - for team consistency)

**Create `.vscode/settings.json`**:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.exclude": {
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules": true,
    "**/dist": true,
    "**/build": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/build": true,
    "**/coverage": true
  }
}
```

---

## 🚀 Quick Setup Checklist

Copy-paste in this order:

1. ✅ **Rules for AI** → Cursor Settings
2. ✅ **Include/Exclude patterns** → Indexing settings
3. ✅ **tsconfig.json** → Project root
4. ✅ **eslintrc.json** → Project root
5. ✅ **.prettierrc** → Project root
6. ✅ **Update .gitignore** → Add patterns
7. ✅ **.env.example** → Project root (template)
8. ✅ **package.json scripts** → Add to existing
9. ✅ **.vscode/settings.json** → For team (optional)

---

## 📝 After Setup

### Install Dependencies

```bash
# ESLint and Prettier
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install --save-dev prettier eslint-config-prettier eslint-plugin-react eslint-plugin-react-hooks

# Testing
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @types/jest ts-jest

# TypeScript (if needed)
npm install --save-dev typescript @types/react @types/node
```

### Verify Setup

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Formatting
npm run format:check

# Tests
npm test
```

---

## 🎯 Using the Settings

### In Cursor Chat
- Rules are automatically loaded
- Reference docs with `@filename`
- Rules apply based on file types

### In Your Code
- TypeScript enforces types
- ESLint catches issues
- Prettier formats on save
- Tests ensure quality

---

## 🔄 Updating Settings

To update any setting:
1. Modify the configuration file
2. Save changes
3. Reload Cursor (`Cmd/Ctrl + Shift + P` → Reload)
4. Commit to Git for team

---

## 💡 Tips

- **Gradual Adoption**: Add settings incrementally
- **Team Agreement**: Discuss rules with team first
- **Documentation**: Keep this file updated
- **Consistency**: Use same settings across projects

---

**All set! Your Cursor IDE is now optimally configured for PrayerMap development.** 🎉
