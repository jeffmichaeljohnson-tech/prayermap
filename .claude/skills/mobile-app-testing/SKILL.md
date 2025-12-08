---
name: mobile-app-testing
description: Comprehensive mobile app testing strategies for iOS and Android. Covers unit tests, UI tests, integration tests, performance testing, and test automation with Detox, Appium, and XCTest.
---

# Mobile App Testing

Implement comprehensive testing strategies for mobile applications including unit tests, UI tests, integration tests, and performance testing across React Native, iOS, and Android.

## When to Use

- Creating reliable mobile applications with test coverage
- Automating UI testing across iOS and Android
- Performance testing and optimization
- Integration testing with backend services
- Regression testing before releases

## React Native Testing with Jest & Detox

### Unit Tests with Jest

```javascript
// Unit test with Jest
import { calculateDistance, formatPrayerCount } from '../utils/math';

describe('Math utilities', () => {
  test('should calculate distance between coordinates', () => {
    const from = { lat: 37.7749, lng: -122.4194 };
    const to = { lat: 37.7849, lng: -122.4094 };

    const distance = calculateDistance(from, to);

    expect(distance).toBeCloseTo(1.4, 1); // ~1.4 km
  });

  test('should format prayer counts', () => {
    expect(formatPrayerCount(5)).toBe('5 prayers');
    expect(formatPrayerCount(1)).toBe('1 prayer');
    expect(formatPrayerCount(1000)).toBe('1K prayers');
    expect(formatPrayerCount(1500000)).toBe('1.5M prayers');
  });
});
```

### Component Unit Tests

```javascript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PrayerCard } from '../components/PrayerCard';

describe('PrayerCard Component', () => {
  const mockPrayer = {
    id: '1',
    title: 'Healing Prayer',
    content: 'Please pray for my recovery',
    category: 'health',
    created_at: new Date().toISOString(),
  };

  test('renders prayer content correctly', () => {
    render(<PrayerCard prayer={mockPrayer} />);

    expect(screen.getByText('Healing Prayer')).toBeTruthy();
    expect(screen.getByText('Please pray for my recovery')).toBeTruthy();
  });

  test('calls onPray when pray button pressed', () => {
    const onPray = jest.fn();
    render(<PrayerCard prayer={mockPrayer} onPray={onPray} />);

    fireEvent.press(screen.getByTestId('pray-button'));

    expect(onPray).toHaveBeenCalledWith(mockPrayer.id);
  });

  test('handles missing prayer gracefully', () => {
    render(<PrayerCard prayer={null} />);

    expect(screen.getByText(/no prayer data/i)).toBeTruthy();
  });

  test('displays category badge', () => {
    render(<PrayerCard prayer={mockPrayer} />);

    expect(screen.getByText('Health')).toBeTruthy();
  });
});
```

### E2E Testing with Detox

```javascript
describe('Login Flow E2E Test', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should login successfully with valid credentials', async () => {
    await waitFor(element(by.id('emailInput')))
      .toBeVisible()
      .withTimeout(5000);

    await element(by.id('emailInput')).typeText('user@example.com');
    await element(by.id('passwordInput')).typeText('password123');
    await element(by.id('loginButton')).tap();

    await waitFor(element(by.text('Home')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should show error with invalid credentials', async () => {
    await element(by.id('emailInput')).typeText('invalid@example.com');
    await element(by.id('passwordInput')).typeText('wrongpass');
    await element(by.id('loginButton')).tap();

    await waitFor(element(by.text(/invalid credentials/i)))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should navigate between tabs', async () => {
    // Login first
    await element(by.id('emailInput')).typeText('user@example.com');
    await element(by.id('passwordInput')).typeText('password123');
    await element(by.id('loginButton')).tap();
    await waitFor(element(by.text('Home'))).toBeVisible().withTimeout(5000);

    // Navigate tabs
    await element(by.id('profileTab')).tap();
    await waitFor(element(by.text('Profile')))
      .toBeVisible()
      .withTimeout(2000);

    await element(by.id('mapTab')).tap();
    await waitFor(element(by.id('prayer-map')))
      .toBeVisible()
      .withTimeout(2000);
  });
});
```

## iOS Testing with XCTest

### ViewModel Unit Tests

```swift
import XCTest
@testable import PrayerMap

class PrayerViewModelTests: XCTestCase {
    var viewModel: PrayerViewModel!
    var mockPrayerService: MockPrayerService!

    override func setUp() {
        super.setUp()
        mockPrayerService = MockPrayerService()
        viewModel = PrayerViewModel(prayerService: mockPrayerService)
    }

    override func tearDown() {
        viewModel = nil
        mockPrayerService = nil
        super.tearDown()
    }

    func testFetchPrayersSuccess() async {
        let expectedPrayers = [
            Prayer(id: UUID(), title: "Prayer 1", content: "Content 1"),
            Prayer(id: UUID(), title: "Prayer 2", content: "Content 2"),
        ]
        mockPrayerService.mockPrayers = expectedPrayers

        await viewModel.fetchPrayers()

        XCTAssertEqual(viewModel.prayers.count, 2)
        XCTAssertEqual(viewModel.prayers[0].title, "Prayer 1")
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.isLoading)
    }

    func testFetchPrayersFailure() async {
        mockPrayerService.shouldFail = true

        await viewModel.fetchPrayers()

        XCTAssertTrue(viewModel.prayers.isEmpty)
        XCTAssertNotNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.isLoading)
    }

    func testCreatePrayer() async {
        let newPrayer = PrayerInput(title: "New Prayer", content: "New content")

        await viewModel.createPrayer(newPrayer)

        XCTAssertTrue(mockPrayerService.createPrayerCalled)
        XCTAssertEqual(mockPrayerService.lastCreatedPrayer?.title, "New Prayer")
    }
}

// Mock Service
class MockPrayerService: PrayerServiceProtocol {
    var mockPrayers: [Prayer] = []
    var shouldFail = false
    var createPrayerCalled = false
    var lastCreatedPrayer: PrayerInput?

    func fetchPrayers() async throws -> [Prayer] {
        if shouldFail {
            throw NetworkError.unknown
        }
        return mockPrayers
    }

    func createPrayer(_ input: PrayerInput) async throws -> Prayer {
        createPrayerCalled = true
        lastCreatedPrayer = input
        return Prayer(id: UUID(), title: input.title, content: input.content)
    }
}
```

### iOS UI Tests

```swift
import XCTest

class PrayerMapUITests: XCTestCase {
    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }

    func testLoginFlow() throws {
        let emailTextField = app.textFields["emailInput"]
        let passwordTextField = app.secureTextFields["passwordInput"]
        let loginButton = app.buttons["loginButton"]

        XCTAssertTrue(emailTextField.waitForExistence(timeout: 5))

        emailTextField.tap()
        emailTextField.typeText("user@example.com")

        passwordTextField.tap()
        passwordTextField.typeText("password123")

        loginButton.tap()

        let homeScreen = app.staticTexts["Home"]
        XCTAssertTrue(homeScreen.waitForExistence(timeout: 10))
    }

    func testCreatePrayer() throws {
        // Login first
        login()

        // Tap create button
        let createButton = app.buttons["createPrayerFAB"]
        XCTAssertTrue(createButton.waitForExistence(timeout: 5))
        createButton.tap()

        // Fill form
        let titleField = app.textFields["prayerTitleInput"]
        XCTAssertTrue(titleField.waitForExistence(timeout: 5))
        titleField.tap()
        titleField.typeText("Test Prayer")

        let contentField = app.textViews["prayerContentInput"]
        contentField.tap()
        contentField.typeText("Prayer content here")

        // Submit
        app.buttons["submitPrayerButton"].tap()

        // Verify success
        let successMessage = app.staticTexts["Prayer submitted"]
        XCTAssertTrue(successMessage.waitForExistence(timeout: 5))
    }

    func testMapInteraction() throws {
        login()

        // Navigate to map
        app.tabBars.buttons["Map"].tap()

        let map = app.otherElements["prayerMap"]
        XCTAssertTrue(map.waitForExistence(timeout: 10))

        // Tap on a marker (if visible)
        let marker = app.otherElements["prayerMarker"].firstMatch
        if marker.waitForExistence(timeout: 5) {
            marker.tap()

            // Verify detail modal appears
            let modal = app.otherElements["prayerDetailModal"]
            XCTAssertTrue(modal.waitForExistence(timeout: 3))
        }
    }

    // Helper
    private func login() {
        let emailTextField = app.textFields["emailInput"]
        emailTextField.tap()
        emailTextField.typeText("user@example.com")

        app.secureTextFields["passwordInput"].tap()
        app.secureTextFields["passwordInput"].typeText("password123")

        app.buttons["loginButton"].tap()

        XCTAssertTrue(app.staticTexts["Home"].waitForExistence(timeout: 10))
    }
}
```

## Android Testing with Espresso

### ViewModel Unit Tests

```kotlin
@RunWith(AndroidJUnit4::class)
class PrayerViewModelTest {
    private lateinit var viewModel: PrayerViewModel
    private val mockPrayerRepository = mock<PrayerRepository>()

    @get:Rule
    val instantTaskExecutorRule = InstantTaskExecutorRule()

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Before
    fun setUp() {
        viewModel = PrayerViewModel(mockPrayerRepository)
    }

    @Test
    fun `fetchPrayers success updates state`() = runTest {
        val expectedPrayers = listOf(
            Prayer("1", "Prayer 1", "Content 1"),
            Prayer("2", "Prayer 2", "Content 2")
        )
        whenever(mockPrayerRepository.getPrayers()).thenReturn(expectedPrayers)

        viewModel.fetchPrayers()

        assertEquals(expectedPrayers, viewModel.prayers.value)
        assertNull(viewModel.errorMessage.value)
        assertFalse(viewModel.isLoading.value)
    }

    @Test
    fun `fetchPrayers failure updates error state`() = runTest {
        whenever(mockPrayerRepository.getPrayers())
            .thenThrow(IOException("Network error"))

        viewModel.fetchPrayers()

        assertTrue(viewModel.prayers.value.isEmpty())
        assertNotNull(viewModel.errorMessage.value)
        assertFalse(viewModel.isLoading.value)
    }

    @Test
    fun `createPrayer calls repository`() = runTest {
        val input = PrayerInput("New Prayer", "Content")
        whenever(mockPrayerRepository.createPrayer(any()))
            .thenReturn(Prayer("new-id", input.title, input.content))

        viewModel.createPrayer(input)

        verify(mockPrayerRepository).createPrayer(input)
    }
}
```

### Android UI Tests with Espresso

```kotlin
@RunWith(AndroidJUnit4::class)
class LoginActivityTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(LoginActivity::class.java)

    @Test
    fun testLoginWithValidCredentials() {
        onView(withId(R.id.emailInput))
            .perform(typeText("user@example.com"), closeSoftKeyboard())

        onView(withId(R.id.passwordInput))
            .perform(typeText("password123"), closeSoftKeyboard())

        onView(withId(R.id.loginButton))
            .perform(click())

        onView(withText("Home"))
            .check(matches(isDisplayed()))
    }

    @Test
    fun testLoginWithInvalidCredentials() {
        onView(withId(R.id.emailInput))
            .perform(typeText("invalid@example.com"), closeSoftKeyboard())

        onView(withId(R.id.passwordInput))
            .perform(typeText("wrongpassword"), closeSoftKeyboard())

        onView(withId(R.id.loginButton))
            .perform(click())

        onView(withText(containsString("Invalid credentials")))
            .check(matches(isDisplayed()))
    }

    @Test
    fun testNavigationBetweenTabs() {
        // Login first
        performLogin()

        onView(withId(R.id.profileTab)).perform(click())
        onView(withText("Profile")).check(matches(isDisplayed()))

        onView(withId(R.id.mapTab)).perform(click())
        onView(withId(R.id.prayerMap)).check(matches(isDisplayed()))

        onView(withId(R.id.homeTab)).perform(click())
        onView(withText("Home")).check(matches(isDisplayed()))
    }

    private fun performLogin() {
        onView(withId(R.id.emailInput))
            .perform(typeText("user@example.com"), closeSoftKeyboard())
        onView(withId(R.id.passwordInput))
            .perform(typeText("password123"), closeSoftKeyboard())
        onView(withId(R.id.loginButton))
            .perform(click())
        onView(withText("Home")).check(matches(isDisplayed()))
    }
}

@RunWith(AndroidJUnit4::class)
class PrayerCreationTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    @Test
    fun testCreatePrayerFlow() {
        // Login
        performLogin()

        // Open create dialog
        onView(withId(R.id.createPrayerFab))
            .perform(click())

        // Fill form
        onView(withId(R.id.prayerTitleInput))
            .perform(typeText("Test Prayer"), closeSoftKeyboard())

        onView(withId(R.id.prayerContentInput))
            .perform(typeText("Prayer content here"), closeSoftKeyboard())

        // Select category
        onView(withId(R.id.categorySpinner))
            .perform(click())
        onData(hasToString("Health"))
            .perform(click())

        // Submit
        onView(withId(R.id.submitPrayerButton))
            .perform(click())

        // Verify success
        onView(withText("Prayer submitted"))
            .check(matches(isDisplayed()))
    }
}
```

## Performance Testing

### iOS Performance Tests

```swift
import XCTest

class PerformanceTests: XCTestCase {

    func testPrayerListRenderingPerformance() {
        let prayers = (0..<1000).map { i in
            Prayer(
                id: UUID(),
                title: "Prayer \(i)",
                content: "Content \(i)",
                category: "health"
            )
        }

        measure {
            let viewModel = PrayerListViewModel()
            viewModel.prayers = prayers
            _ = viewModel.filteredPrayers(category: "health")
        }
    }

    func testMapMarkerRenderingPerformance() {
        let prayers = (0..<500).map { i in
            Prayer(
                id: UUID(),
                title: "Prayer \(i)",
                lat: 37.7749 + Double.random(in: -0.1...0.1),
                lng: -122.4194 + Double.random(in: -0.1...0.1)
            )
        }

        measure {
            let viewModel = MapViewModel()
            _ = viewModel.clusterMarkers(prayers, zoomLevel: 12)
        }
    }

    func testNetworkResponseTime() {
        let expectation = XCTestExpectation(description: "Fetch prayers")

        measure {
            Task {
                do {
                    let service = PrayerService()
                    _ = try await service.fetchPrayers(near: Location(lat: 37.7749, lng: -122.4194))
                    expectation.fulfill()
                } catch {
                    XCTFail("Network request failed: \(error)")
                }
            }

            wait(for: [expectation], timeout: 10)
        }
    }

    func testDatabaseQueryPerformance() {
        let realm = try! Realm()

        // Seed data
        try! realm.write {
            for i in 0..<10000 {
                let prayer = PrayerObject()
                prayer.id = UUID().uuidString
                prayer.title = "Prayer \(i)"
                prayer.category = i % 2 == 0 ? "health" : "gratitude"
                realm.add(prayer)
            }
        }

        measure {
            _ = realm.objects(PrayerObject.self)
                .filter("category == %@", "health")
                .sorted(byKeyPath: "createdAt", ascending: false)
        }
    }
}
```

### Android Performance Tests

```kotlin
@RunWith(AndroidJUnit4::class)
class PerformanceTest {

    @get:Rule
    val benchmarkRule = BenchmarkRule()

    @Test
    fun prayerListFiltering() {
        val prayers = (0 until 1000).map { i ->
            Prayer("$i", "Prayer $i", "Content $i", if (i % 2 == 0) "health" else "gratitude")
        }

        benchmarkRule.measureRepeated {
            prayers.filter { it.category == "health" }
        }
    }

    @Test
    fun jsonParsing() {
        val json = """
            {
                "prayers": ${(0 until 100).map { """{"id":"$it","title":"Prayer $it"}""" }}
            }
        """.trimIndent()

        val moshi = Moshi.Builder().build()
        val adapter = moshi.adapter(PrayerResponse::class.java)

        benchmarkRule.measureRepeated {
            adapter.fromJson(json)
        }
    }
}
```

## Test Data Factories

```typescript
// factories/prayer.ts
import { faker } from '@faker-js/faker';

export const createMockPrayer = (overrides = {}) => ({
  id: faker.string.uuid(),
  title: faker.lorem.sentence(),
  content: faker.lorem.paragraph(),
  category: faker.helpers.arrayElement(['health', 'gratitude', 'family', 'work']),
  user_id: faker.string.uuid(),
  lat: faker.location.latitude(),
  lng: faker.location.longitude(),
  created_at: faker.date.recent().toISOString(),
  prayer_count: faker.number.int({ min: 0, max: 100 }),
  ...overrides,
});

export const createMockPrayers = (count: number, overrides = {}) =>
  Array.from({ length: count }, () => createMockPrayer(overrides));

export const createMockUser = (overrides = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  display_name: faker.person.fullName(),
  avatar_url: faker.image.avatar(),
  ...overrides,
});
```

## Best Practices

### DO
- Write tests for business logic first
- Use dependency injection for testability
- Mock external API calls
- Test both success and failure paths
- Automate UI testing for critical flows
- Run tests on real devices before release
- Measure performance on target devices
- Keep tests isolated and independent
- Use meaningful test names
- Maintain >80% code coverage
- Use `testID` props for E2E selectors

### DON'T
- Skip testing UI-critical flows
- Use hardcoded test data
- Ignore performance regressions
- Test implementation details
- Make tests flaky or unreliable
- Skip testing on actual devices
- Ignore accessibility testing
- Create interdependent tests
- Test without mocking APIs
- Deploy untested code
- Use text selectors in E2E (breaks i18n)
