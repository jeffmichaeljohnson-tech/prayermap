# Create Custom Hook

Generate a new custom React hook following PrayerMap patterns.

## Usage
`/create-hook <useHookName>`

## Hook Template

Generate a hook with:
1. TypeScript interfaces for options and return type
2. Proper state management
3. Subscription cleanup pattern
4. Error handling
5. Loading states

## Generated Structure

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';

interface Use{HookName}Options {
  autoFetch?: boolean;
  enableRealtime?: boolean;
}

interface Use{HookName}Return {
  data: DataType[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function use{HookName}(
  options: Use{HookName}Options = {}
): Use{HookName}Return {
  const {
    autoFetch = true,
    enableRealtime = true,
  } = options;

  const [data, setData] = useState<DataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscription cleanup ref
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Fetch function
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDataFromService();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch';
      setError(message);
      console.error('Hook fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  // Real-time subscription
  useEffect(() => {
    if (!enableRealtime) return;

    unsubscribeRef.current = subscribeToChanges((updatedData) => {
      setData(updatedData);
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [enableRealtime]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
```

## File Location
Hooks should be created in `src/hooks/`

## Naming Convention
- Always prefix with `use`
- Use camelCase: `usePrayers`, `useInbox`, `useAudioRecorder`

## Checklist
After creating:
- [ ] Export from hooks index if exists
- [ ] Add corresponding service functions if needed
- [ ] Test in a component
- [ ] Verify subscription cleanup works
