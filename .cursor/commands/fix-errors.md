# Fix Errors

Analyze and fix the TypeScript/build errors in the current file or project.

## Process
1. Identify the root cause of each error
2. Explain why the error occurs
3. Provide the corrected code
4. Verify the fix doesn't introduce new issues

## Common Issues to Check
- Missing or incorrect type annotations
- Null/undefined handling
- Import path issues
- Missing dependencies
- Incompatible type assignments
- Missing return types

## Output Format
For each error:
```
Error: [error message]
Location: [file:line]
Cause: [explanation]
Fix: [corrected code]
```

Fix all errors in order of dependency (fix imports before type errors that depend on them).
