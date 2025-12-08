---
name: react-native-web-testing
description: Use when testing React Native Web applications. Provides patterns for Jest, React Native Testing Library, component testing, and web-specific testing strategies.
---

# React Native Web Testing

Comprehensive testing approaches for React Native Web applications using Jest and React Native Testing Library.

## When to Use

- Testing React Native components
- Writing unit tests for hooks and utilities
- Integration testing with providers/context
- Form validation testing
- Accessibility testing
- Testing async operations and data loading

## Core Principles

**Test user behavior, not implementation details.** Use queries like `screen.getByText()` and `screen.getByRole()` rather than testing internal state.

## Component Testing

```typescript
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PrayerCard } from '../PrayerCard';

describe('PrayerCard', () => {
  const mockPrayer = {
    id: '1',
    title: 'Healing prayer',
    content: 'Please pray for healing',
    created_at: new Date().toISOString(),
  };

  it('renders prayer content correctly', () => {
    render(<PrayerCard prayer={mockPrayer} />);

    expect(screen.getByText('Healing prayer')).toBeTruthy();
    expect(screen.getByText('Please pray for healing')).toBeTruthy();
  });

  it('handles pray button interaction', () => {
    const onPray = jest.fn();
    render(<PrayerCard prayer={mockPrayer} onPray={onPray} />);

    fireEvent.press(screen.getByRole('button', { name: /pray/i }));

    expect(onPray).toHaveBeenCalledWith(mockPrayer.id);
  });

  it('shows loading state while submitting', () => {
    render(<PrayerCard prayer={mockPrayer} isSubmitting={true} />);

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });
});
```

## Async Operations Testing

```typescript
import { render, screen, waitFor } from '@testing-library/react-native';
import { PrayerList } from '../PrayerList';

describe('PrayerList', () => {
  it('displays prayers after loading', async () => {
    render(<PrayerList />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).toBeNull();
    });

    // Verify content is displayed
    expect(screen.getByText('Prayer 1')).toBeTruthy();
  });

  it('handles empty state', async () => {
    // Mock empty response
    mockApi.getPrayers.mockResolvedValue([]);

    render(<PrayerList />);

    await waitFor(() => {
      expect(screen.getByText(/no prayers found/i)).toBeTruthy();
    });
  });

  it('displays error message on failure', async () => {
    mockApi.getPrayers.mockRejectedValue(new Error('Network error'));

    render(<PrayerList />);

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeTruthy();
    });
  });
});
```

## Custom Hook Testing

```typescript
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePrayersNearby } from '../usePrayersNearby';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

describe('usePrayersNearby', () => {
  it('fetches prayers for given location', async () => {
    const { result } = renderHook(
      () => usePrayersNearby(37.7749, -122.4194),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(5);
  });

  it('refetches when location changes', async () => {
    const { result, rerender } = renderHook(
      ({ lat, lng }) => usePrayersNearby(lat, lng),
      {
        wrapper,
        initialProps: { lat: 37.7749, lng: -122.4194 }
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ lat: 40.7128, lng: -74.0060 });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(true);
    });
  });
});
```

## Context/Provider Testing

```typescript
import { render, screen } from '@testing-library/react-native';
import { AuthProvider } from '../AuthProvider';
import { UserProfile } from '../UserProfile';

const renderWithAuth = (ui, { user = null } = {}) => {
  return render(
    <AuthProvider initialUser={user}>
      {ui}
    </AuthProvider>
  );
};

describe('UserProfile with Auth', () => {
  it('shows login prompt when not authenticated', () => {
    renderWithAuth(<UserProfile />);

    expect(screen.getByText(/please sign in/i)).toBeTruthy();
  });

  it('shows user info when authenticated', () => {
    const mockUser = { id: '1', name: 'John', email: 'john@example.com' };

    renderWithAuth(<UserProfile />, { user: mockUser });

    expect(screen.getByText('John')).toBeTruthy();
    expect(screen.getByText('john@example.com')).toBeTruthy();
  });
});
```

## Form Validation Testing

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { PrayerForm } from '../PrayerForm';

describe('PrayerForm', () => {
  it('validates required fields', async () => {
    render(<PrayerForm onSubmit={jest.fn()} />);

    // Submit without filling fields
    fireEvent.press(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeTruthy();
    });
  });

  it('submits valid form data', async () => {
    const onSubmit = jest.fn();
    render(<PrayerForm onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByTestId('title-input'), 'My Prayer');
    fireEvent.changeText(screen.getByTestId('content-input'), 'Prayer content here');
    fireEvent.press(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        title: 'My Prayer',
        content: 'Prayer content here',
      });
    });
  });

  it('disables submit button while submitting', () => {
    render(<PrayerForm onSubmit={jest.fn()} isSubmitting={true} />);

    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton.props.accessibilityState.disabled).toBe(true);
  });
});
```

## Accessibility Testing

```typescript
import { render, screen } from '@testing-library/react-native';
import { PrayerCard } from '../PrayerCard';

describe('PrayerCard Accessibility', () => {
  it('has proper accessibility labels', () => {
    render(<PrayerCard prayer={mockPrayer} />);

    expect(screen.getByLabelText(/pray for this request/i)).toBeTruthy();
  });

  it('indicates disabled state accessibly', () => {
    render(<PrayerCard prayer={mockPrayer} disabled={true} />);

    const button = screen.getByRole('button');
    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  it('announces loading state', () => {
    render(<PrayerCard prayer={mockPrayer} isLoading={true} />);

    expect(screen.getByLabelText(/loading/i)).toBeTruthy();
  });
});
```

## Mocking Patterns

```typescript
// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: { prayerId: '123' },
  }),
}));

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockPrayer, error: null }),
    })),
  },
}));

// Mock async storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
```

## Best Practices

### DO
- Test user-visible behavior
- Use semantic queries (`getByRole`, `getByText`, `getByLabelText`)
- Test loading, error, and success states
- Mock external dependencies
- Use `waitFor` for async operations
- Test accessibility attributes
- Keep tests isolated and independent

### DON'T
- Test implementation details (internal state)
- Use `querySelector` or DOM-specific selectors
- Create tests coupled to component structure
- Skip cleanup between tests
- Test third-party library internals
- Use arbitrary timeouts instead of `waitFor`

## Test Setup

```typescript
// jest.setup.js
import '@testing-library/jest-native/extend-expect';

// Silence console errors in tests
jest.spyOn(console, 'error').mockImplementation(() => {});

// Mock native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Global test utilities
global.mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
};
```
