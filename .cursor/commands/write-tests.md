# Write Tests

Generate comprehensive tests for the selected code.

## Requirements
- Use **Vitest** as the test framework
- Use **React Testing Library** for component tests
- Co-locate test files with source files (e.g., `Component.test.tsx`)

## Test Coverage
1. **Happy Path**: Expected behavior works correctly
2. **Edge Cases**: Empty states, boundary conditions
3. **Error Cases**: Error handling, invalid input
4. **User Interactions**: Click, type, submit events

## Test Structure
```typescript
describe('ComponentName', () => {
  it('should render correctly', () => {});
  it('should handle user interaction', () => {});
  it('should display error state', () => {});
});
```

## Best Practices
- Test behavior, not implementation details
- Use `screen.getByRole` over `getByTestId`
- Mock external dependencies (Supabase, APIs)
- Keep tests focused and independent
