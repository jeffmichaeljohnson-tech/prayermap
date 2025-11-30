# Pull Request

## Summary
<!-- Provide a brief overview of what this PR accomplishes -->

## Type of Change
<!-- Mark the relevant option with an "x" -->

- [ ] `feat` - New feature
- [ ] `fix` - Bug fix
- [ ] `mobile` - Mobile-specific change (iOS/Android)
- [ ] `refactor` - Code refactoring
- [ ] `docs` - Documentation update
- [ ] `style` - Code style/formatting
- [ ] `test` - Adding or updating tests
- [ ] `chore` - Maintenance task

## Critical Principles Checklist
<!-- ALL items must be checked before requesting review -->

### Research & Documentation
- [ ] **Research-Driven**: Verified implementation against official documentation
- [ ] **Source Credibility**: All approaches based on approved sources (official docs, industry leaders)
- [ ] **Memory Query**: Checked project memory for similar past decisions/solutions
- [ ] **Documentation**: Updated relevant docs (README, technical docs, comments)

### Mobile Compatibility
- [ ] **iOS Testing**: Tested on iOS device/simulator (or N/A if web-only)
- [ ] **Android Testing**: Tested on Android device/emulator (or N/A if web-only)
- [ ] **Capacitor Sync**: Ran `npm run build && npx cap sync` (if mobile-related)
- [ ] **Native Permissions**: Properly requested/handled native permissions (if applicable)
- [ ] **Web Fallback**: Implemented fallback for web platform (if using native features)

### Performance & UX
- [ ] **Living & Breathing**: Added appropriate animations (60fps, tasteful motion)
- [ ] **Performance**: Verified 60fps animations, fast load times
- [ ] **Minimal Steps**: Counted and minimized user steps/friction
- [ ] **Loading States**: Implemented proper loading/error states
- [ ] **Responsive Design**: Mobile-first, works on all screen sizes

### Code Quality
- [ ] **TypeScript**: Strict mode compliance (no `any` types)
- [ ] **Error Handling**: Comprehensive error handling throughout
- [ ] **Accessibility**: ARIA labels, keyboard navigation, WCAG 2.1 AA
- [ ] **Security**: No exposed secrets, RLS policies intact
- [ ] **Testing**: Added/updated tests for new functionality

## Quality Gates (from ARTICLE.md)
<!-- ALL gates must be met -->

- [ ] **Quality**: 85%+ target met
- [ ] **Accuracy**: 90%+ target met
- [ ] **Documentation**: 95%+ coverage for new code
- [ ] **Citations**: All technical decisions backed by sources
- [ ] **Testing Notes**: Included how this was verified

## Changes Made
<!-- Detailed list of changes -->

### Added
-

### Changed
-

### Removed
-

### Fixed
-

## Testing
<!-- Describe how this was tested -->

### Manual Testing
- [ ] Tested on desktop browser
- [ ] Tested on mobile browser
- [ ] Tested on iOS device/simulator
- [ ] Tested on Android device/emulator

### Automated Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass (or N/A)

### Test Scenarios
<!-- Describe specific test scenarios -->

1.
2.
3.

## Screenshots/Videos
<!-- If UI changes, provide before/after screenshots or videos -->

### Before


### After


## Performance Impact
<!-- Required for any code that affects performance -->

- Bundle size change:
- Load time impact:
- Animation frame rate:
- Lighthouse score:

## Mobile Considerations
<!-- Required if this touches mobile functionality -->

### iOS
- Minimum iOS version:
- Native features used:
- Permissions required:

### Android
- Minimum Android version:
- Native features used:
- Permissions required:

## Security Considerations
<!-- Required if this touches auth, data, or permissions -->

- [ ] No RLS policies bypassed
- [ ] No secrets exposed
- [ ] Input validation implemented
- [ ] XSS prevention addressed

## Breaking Changes
<!-- List any breaking changes and migration steps -->

- None

OR

- Breaking change 1: [description + migration steps]
- Breaking change 2: [description + migration steps]

## Related Issues
<!-- Link related issues -->

Closes #
Relates to #

## Deployment Notes
<!-- Special deployment considerations -->

- [ ] Database migrations required
- [ ] Environment variables added
- [ ] Third-party service configuration needed
- [ ] Mobile app rebuild required

### Migration Steps
<!-- If database changes -->

```sql
-- SQL migrations here
```

## Reviewer Notes
<!-- Anything reviewers should pay special attention to -->



## Spiritual Context
<!-- How does this serve PrayerMap's mission? -->

This change serves our mission by:



---

## Pre-Merge Checklist (Reviewer)
<!-- Reviewer verification -->

- [ ] Code follows project standards (CLAUDE.md)
- [ ] All 5 critical principles honored
- [ ] Mobile compatibility verified
- [ ] Performance benchmarks met
- [ ] Security review complete
- [ ] Documentation complete
- [ ] Tests comprehensive

---

**Remember**: Every line of code serves the mission of connecting people through prayer.
