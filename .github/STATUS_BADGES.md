# GitHub Actions Status Badges

Add these badges to your README.md to show the CI/CD pipeline status:

## Basic Badges

```markdown
![CI](https://github.com/jeffmichaeljohnson-tech/prayermap/workflows/CI/badge.svg)
[![codecov](https://codecov.io/gh/jeffmichaeljohnson-tech/prayermap/branch/main/graph/badge.svg)](https://codecov.io/gh/jeffmichaeljohnson-tech/prayermap)
```

## Detailed Badges (with branch)

```markdown
![CI](https://github.com/jeffmichaeljohnson-tech/prayermap/workflows/CI/badge.svg?branch=main)
[![codecov](https://codecov.io/gh/jeffmichaeljohnson-tech/prayermap/branch/main/graph/badge.svg?token=YOUR_CODECOV_TOKEN)](https://codecov.io/gh/jeffmichaeljohnson-tech/prayermap)
```

## Suggested README Section

Add this section near the top of your README.md:

```markdown
## Status

![CI](https://github.com/jeffmichaeljohnson-tech/prayermap/workflows/CI/badge.svg)
[![codecov](https://codecov.io/gh/jeffmichaeljohnson-tech/prayermap/branch/main/graph/badge.svg)](https://codecov.io/gh/jeffmichaeljohnson-tech/prayermap)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-purple)](https://vitejs.dev/)

- **Build Status**: Automated checks on every push and PR
- **Code Coverage**: Unit test coverage tracked via Codecov
- **Type Safety**: Full TypeScript strict mode
- **E2E Testing**: Playwright tests for critical user flows
```

## Note

Replace `jeffmichaeljohnson-tech/prayermap` with your actual GitHub repository path if different.
