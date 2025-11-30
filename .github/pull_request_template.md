## Description

<!-- Provide a clear description of your changes -->

## Type of Change

<!-- Mark the relevant option with an "x" -->

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📱 Mobile-specific change (iOS or Android)
- [ ] 📝 Documentation update
- [ ] ♻️ Code refactoring (no functional changes)
- [ ] 🔧 Maintenance (dependencies, configs, etc.)

## Related Issue

<!-- Link to the issue this PR addresses -->
Fixes #(issue)

## Changes Made

<!-- List the key changes in bullet points -->

-
-
-

## Testing

<!-- Describe the tests you ran and how to reproduce them -->

- [ ] Tests pass locally (`npm run test:ci`)
- [ ] Linting passes (`npm run lint`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Tested on iOS (if mobile change)
- [ ] Tested on Android (if mobile change)
- [ ] Tested on desktop browsers
- [ ] Tested on mobile browsers

## Screenshots / Videos

<!-- If applicable, add screenshots or videos to demonstrate changes -->

## Checklist

- [ ] My code follows the project's code style
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings or errors
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Conventional Commit

<!-- Ensure your PR title follows conventional commits format -->

**PR Title Format:**
```
<type>: <description>

Examples:
✅ feat: add video prayer responses
✅ fix: resolve map marker clustering on iOS
✅ mobile: add haptic feedback to prayer submission
✅ refactor: extract prayer validation logic
✅ docs: update API documentation
✅ chore: update dependencies
```

**Why?** This format is used to automatically generate changelogs for releases.

**Types:**
- `feat` - New feature (triggers MINOR version bump)
- `fix` - Bug fix (triggers PATCH version bump)
- `mobile` - Mobile-specific change
- `refactor` - Code refactoring
- `docs` - Documentation only
- `style` - Code style (formatting, missing semicolons, etc.)
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**For breaking changes:**
Include `BREAKING CHANGE:` in the PR description (triggers MAJOR version bump)

## Additional Notes

<!-- Any additional information that reviewers should know -->
