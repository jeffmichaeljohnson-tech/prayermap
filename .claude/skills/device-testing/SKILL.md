---
name: device-testing
description: Expert in React Native testing strategies including unit tests with Jest, integration tests, E2E tests with Detox, component testing with React Native Testing Library, snapshot testing, mocking native modules, testing on simulators and real devices. Use for testing, jest, detox, e2e, unit test, integration test, component test, test runner, mock, snapshot test, testing library, react native testing library, test automation.
---

# Device Testing Expert

Comprehensive React Native testing methodologies covering the full testing pyramid with Jest, React Native Testing Library, Detox, and Maestro.

## Testing Pyramid

```
        /\
       /  \        E2E Tests (10%)
      /----\       Real device/simulator flows
     /      \
    /--------\     Integration Tests (20%)
   /          \    Component interactions
  /------------\   Unit Tests (70%)
 /              \  Isolated logic, hooks, utilities
/________________\
```

## Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|@expo|expo-.*)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

```javascript
// jest.setup.js
import '@testing-library/jest-native/extend-expect';
import { jest } from '@jest/globals';

// Mock Reanimated
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

// Mock native modules
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo modules
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 37.7749, longitude: -122.4194 },
  }),
}));

// Silence warnings
jest.spyOn(console, 'warn').mockImplementation(() => {});
```

## Unit Testing

### Testing Utilities

```typescript
// utils/formatters.test.ts
import { formatDistance, formatRelativeTime } from '../formatters';

describe('formatDistance', () => {
  it('formats meters correctly', () => {
    expect(formatDistance(500)).toBe('500 m');
    expect(formatDistance(1500)).toBe('1.5 km');
    expect(formatDistance(10000)).toBe('10 km');
  });

  it('handles edge cases', () => {
    expect(formatDistance(0)).toBe('0 m');
    expect(formatDistance(-100)).toBe('0 m');
  });
});

describe('formatRelativeTime', () => {
  it('formats recent times', () => {
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

    expect(formatRelativeTime(fiveMinAgo)).toBe('5 minutes ago');
  });
});
```

### Testing Hooks

```typescript
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useLocation } from '../useLocation';

describe('useLocation', () => {
  it('requests permission and gets location', async () => {
    const { result } = renderHook(() => useLocation());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.location).toEqual({
      latitude: 37.7749,
      longitude: -122.4194,
    });
  });

  it('handles permission denied', async () => {
    jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValueOnce({
      status: 'denied',
    });

    const { result } = renderHook(() => useLocation());

    await waitFor(() => {
      expect(result.current.error).toBe('Location permission denied');
    });
  });
});
```

## Snapshot Testing

```typescript
import { render } from '@testing-library/react-native';
import { PrayerMarker } from '../PrayerMarker';

describe('PrayerMarker Snapshots', () => {
  it('matches default snapshot', () => {
    const { toJSON } = render(
      <PrayerMarker
        prayer={{ id: '1', title: 'Test', category: 'healing' }}
      />
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('matches answered state snapshot', () => {
    const { toJSON } = render(
      <PrayerMarker
        prayer={{ id: '1', title: 'Test', status: 'answered' }}
      />
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
```

## Mocking Native Modules

```typescript
// __mocks__/react-native-maps.js
import React from 'react';
import { View } from 'react-native';

const MockMapView = ({ children, testID, ...props }) => (
  <View testID={testID} {...props}>
    {children}
  </View>
);

MockMapView.Marker = ({ children, testID, ...props }) => (
  <View testID={testID} {...props}>
    {children}
  </View>
);

export default MockMapView;
export const Marker = MockMapView.Marker;
```

```typescript
// __mocks__/@rnmapbox/maps.js
import React from 'react';
import { View } from 'react-native';

export default {
  MapView: ({ children, ...props }) => <View {...props}>{children}</View>,
  Camera: () => null,
  MarkerView: ({ children, ...props }) => <View {...props}>{children}</View>,
  setAccessToken: jest.fn(),
};
```

## API Mocking with MSW

```typescript
// mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.get('*/prayers', (req, res, ctx) => {
    const lat = req.url.searchParams.get('lat');
    const lng = req.url.searchParams.get('lng');

    return res(
      ctx.json([
        { id: '1', title: 'Prayer 1', lat: 37.77, lng: -122.41 },
        { id: '2', title: 'Prayer 2', lat: 37.78, lng: -122.42 },
      ])
    );
  }),

  rest.post('*/prayers', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({ id: 'new-id', ...req.body })
    );
  }),

  rest.get('*/prayers/:id', (req, res, ctx) => {
    return res(
      ctx.json({ id: req.params.id, title: 'Prayer', content: 'Content' })
    );
  }),
];

// mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

## Detox E2E Testing

### Configuration

```javascript
// .detoxrc.js
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/PrayerMap.app',
      build: 'xcodebuild -workspace ios/PrayerMap.xcworkspace -scheme PrayerMap -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: { type: 'iPhone 15' },
    },
    emulator: {
      type: 'android.emulator',
      device: { avdName: 'Pixel_7_API_34' },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
  },
};
```

### E2E Test Examples

```typescript
// e2e/login.e2e.ts
describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should login with valid credentials', async () => {
    await waitFor(element(by.id('email-input')))
      .toBeVisible()
      .withTimeout(5000);

    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();

    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should show error for invalid credentials', async () => {
    await element(by.id('email-input')).typeText('wrong@example.com');
    await element(by.id('password-input')).typeText('wrongpass');
    await element(by.id('login-button')).tap();

    await waitFor(element(by.text('Invalid credentials')))
      .toBeVisible()
      .withTimeout(5000);
  });
});
```

```typescript
// e2e/prayer-flow.e2e.ts
describe('Prayer Creation Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    // Login first
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();
    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10000);
  });

  it('should create a new prayer request', async () => {
    // Tap FAB to create prayer
    await element(by.id('create-prayer-fab')).tap();

    await waitFor(element(by.id('prayer-form')))
      .toBeVisible()
      .withTimeout(5000);

    // Fill form
    await element(by.id('prayer-title-input')).typeText('Prayer for healing');
    await element(by.id('prayer-content-input')).typeText('Please pray for my recovery');

    // Select category
    await element(by.id('category-picker')).tap();
    await element(by.text('Health')).tap();

    // Submit
    await element(by.id('submit-prayer-button')).tap();

    // Verify success
    await waitFor(element(by.text('Prayer submitted')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should view prayer on map', async () => {
    await element(by.id('map-tab')).tap();

    await waitFor(element(by.id('prayer-marker-1')))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id('prayer-marker-1')).tap();

    await waitFor(element(by.id('prayer-detail-modal')))
      .toBeVisible()
      .withTimeout(5000);
  });
});
```

### Detox Utilities

```typescript
// e2e/utils/helpers.ts
export async function login(email: string, password: string) {
  await waitFor(element(by.id('email-input')))
    .toBeVisible()
    .withTimeout(5000);

  await element(by.id('email-input')).typeText(email);
  await element(by.id('password-input')).typeText(password);
  await element(by.id('login-button')).tap();

  await waitFor(element(by.id('home-screen')))
    .toBeVisible()
    .withTimeout(10000);
}

export async function logout() {
  await element(by.id('profile-tab')).tap();
  await element(by.id('logout-button')).tap();
  await waitFor(element(by.id('login-screen')))
    .toBeVisible()
    .withTimeout(5000);
}

export async function takeScreenshot(name: string) {
  await device.takeScreenshot(name);
}
```

## Maestro Alternative (YAML-based)

```yaml
# maestro/flows/login.yaml
appId: com.prayermap.app
---
- launchApp
- assertVisible: "Sign In"
- tapOn:
    id: "email-input"
- inputText: "test@example.com"
- tapOn:
    id: "password-input"
- inputText: "password123"
- tapOn:
    id: "login-button"
- assertVisible:
    id: "home-screen"
    timeout: 10000
```

```yaml
# maestro/flows/create-prayer.yaml
appId: com.prayermap.app
---
- runFlow: login.yaml
- tapOn:
    id: "create-prayer-fab"
- assertVisible:
    id: "prayer-form"
- tapOn:
    id: "prayer-title-input"
- inputText: "Test Prayer"
- tapOn:
    id: "prayer-content-input"
- inputText: "Prayer content here"
- tapOn:
    id: "submit-prayer-button"
- assertVisible: "Prayer submitted"
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test -- --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  e2e-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: brew tap wix/brew && brew install applesimutils
      - run: npx detox build --configuration ios.sim.debug
      - run: npx detox test --configuration ios.sim.debug

  e2e-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      - run: npm ci
      - name: Start emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          script: npx detox test --configuration android.emu.debug
```

## Best Practices

### DO
- Use `testID` for E2E selectors (survives localization)
- Test on real devices before release
- Maintain 80%+ code coverage
- Run E2E tests in CI
- Mock external APIs consistently
- Use factories for test data

### DON'T
- Use text selectors in E2E (breaks with i18n)
- Skip real device testing
- Let tests become flaky
- Ignore coverage drops
- Test third-party libraries
- Create interdependent tests
