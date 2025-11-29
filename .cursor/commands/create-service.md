# Create Service Function

Generate a new service function following PrayerMap patterns.

## Usage
`/create-service <serviceName>`

## Service Template

Generate service functions with:
1. Supabase client check
2. Type conversion (DB → Frontend)
3. Error handling
4. Subscription support if needed

## Generated Structure

```typescript
import { supabase } from '@/lib/supabase';
import type { DataType } from '@/types/data';

// ============================================
// TYPE CONVERTERS
// ============================================

function rowToData(row: any): DataType {
  return {
    id: row.id,
    // Convert snake_case → camelCase
    createdAt: new Date(row.created_at),
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    // Handle nullable fields
    name: row.name ?? undefined,
  };
}

// ============================================
// QUERY FUNCTIONS
// ============================================

export async function fetchAll{ServiceName}(): Promise<DataType[]> {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(rowToData);
  } catch (error) {
    console.error('Failed to fetch:', error);
    return [];
  }
}

export async function fetch{ServiceName}ById(id: string): Promise<DataType | null> {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return rowToData(data);
  } catch (error) {
    console.error('Failed to fetch by id:', error);
    return null;
  }
}

// ============================================
// MUTATION FUNCTIONS
// ============================================

export async function create{ServiceName}(
  input: Omit<DataType, 'id' | 'createdAt'>
): Promise<DataType | null> {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('table_name')
      .insert({
        // Convert camelCase → snake_case
        name: input.name,
        user_id: input.userId,
      })
      .select()
      .single();

    if (error) throw error;
    return rowToData(data);
  } catch (error) {
    console.error('Failed to create:', error);
    return null;
  }
}

export async function update{ServiceName}(
  id: string,
  updates: Partial<DataType>
): Promise<DataType | null> {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('table_name')
      .update({
        name: updates.name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return rowToData(data);
  } catch (error) {
    console.error('Failed to update:', error);
    return null;
  }
}

export async function delete{ServiceName}(id: string): Promise<boolean> {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return false;
  }

  try {
    const { error } = await supabase
      .from('table_name')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to delete:', error);
    return false;
  }
}

// ============================================
// SUBSCRIPTION FUNCTIONS
// ============================================

export function subscribeTo{ServiceName}(
  callback: (data: DataType[]) => void
): () => void {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return () => {};
  }

  const channel = supabase
    .channel('{service_name}_channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'table_name' },
      async () => {
        const data = await fetchAll{ServiceName}();
        callback(data);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
```

## File Location
Services should be created in `src/services/`

## Checklist
After creating:
- [ ] Add types to `src/types/`
- [ ] Create corresponding hook if needed
- [ ] Test CRUD operations
- [ ] Verify real-time subscription
