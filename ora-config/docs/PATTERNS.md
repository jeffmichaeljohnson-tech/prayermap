# PrayerMap Code Patterns

Quick reference for agents working on the PrayerMap codebase.

## Component Patterns

### Basic Component Structure
```tsx
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ComponentProps {
  data: DataType;
  onAction?: (id: string) => void;
  className?: string;
}

export function Component({ data, onAction, className }: ComponentProps) {
  const [loading, setLoading] = useState(false);

  const handleAction = useCallback(async () => {
    setLoading(true);
    try {
      await doSomething();
      onAction?.(data.id);
    } finally {
      setLoading(false);
    }
  }, [data.id, onAction]);

  return (
    <motion.div
      className={cn("glass rounded-2xl p-6", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Content */}
    </motion.div>
  );
}
```

### Modal Pattern
```tsx
// Parent controls visibility
const [showModal, setShowModal] = useState(false);

{showModal && (
  <ModalComponent onClose={() => setShowModal(false)} />
)}

// Modal structure
export function ModalComponent({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        className="relative glass-strong rounded-3xl p-8 max-w-md w-full mx-4"
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
      >
        {/* Modal content */}
      </motion.div>
    </motion.div>
  );
}
```

## Service Patterns

### Query Function
```typescript
export async function fetchData(): Promise<DataType[]> {
  if (!supabase) {
    console.error('Supabase not initialized');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('table')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(rowToType);
  } catch (error) {
    console.error('Fetch failed:', error);
    return [];
  }
}
```

### Mutation Function
```typescript
export async function createItem(input: CreateInput): Promise<Item | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('table')
      .insert({ field: input.field })
      .select()
      .single();

    if (error) throw error;
    return rowToType(data);
  } catch (error) {
    console.error('Create failed:', error);
    return null;
  }
}
```

### Subscription Function
```typescript
export function subscribeToData(callback: (data: DataType[]) => void): () => void {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('channel_name')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'table' },
      async () => {
        const data = await fetchData();
        callback(data);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
```

## Hook Patterns

### Data Hook with Subscription
```typescript
export function useData(): UseDataReturn {
  const [data, setData] = useState<DataType[]>([]);
  const [loading, setLoading] = useState(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const result = await fetchDataService();
    setData(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    unsubscribeRef.current = subscribeToData(setData);
    return () => unsubscribeRef.current?.();
  }, [fetch]);

  return { data, loading, refetch: fetch };
}
```

## Styling Patterns

### Glassmorphic Classes
```tsx
// Light glass (main containers)
className="glass rounded-2xl p-6"

// Strong glass (modals, overlays)
className="glass-strong rounded-3xl p-8"

// Custom glass
className="bg-white/30 backdrop-blur-lg border border-white/20"
```

### Animation Variants
```tsx
// Fade in with slide
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.3 }}

// Scale on interaction
whileHover={{ scale: 1.02 }}
whileTap={{ scale: 0.98 }}
```

## Error Handling Pattern

```typescript
try {
  const result = await operation();
  return result;
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error('Context:', { operation: 'name', error });
  return null;
}
```
