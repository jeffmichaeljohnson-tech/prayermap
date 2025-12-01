/**
 * Traced Supabase Client
 * 
 * Wraps the Supabase client with Datadog tracing for full-stack debugging.
 * Automatically traces all queries, subscriptions, and real-time connections.
 * 
 * Usage:
 * ```typescript
 * import { tracedSupabase } from '@/lib/supabase-traced';
 * 
 * // All queries are automatically traced
 * const { data } = await tracedSupabase.from('prayers').select('*');
 * ```
 */

import { supabase } from './supabase';
import { traceSupabaseQuery, traceRealtimeSubscription } from './datadog';
import { livingMapMonitor } from "../lib/livingMapMonitor";
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Create a traced version of the Supabase client
 */
export function createTracedSupabase<T>(client: SupabaseClient<T> | null): SupabaseClient<T> | null {
  if (!client) return null;
  
  // Create a proxy that wraps all methods with tracing
  return new Proxy(client, {
    get(target, prop) {
      const original = target[prop as keyof typeof target];
      
      // Wrap 'from' method to trace queries
      if (prop === 'from') {
        return (table: string) => {
          const originalFrom = original.call(target, table);
          
          return {
            ...originalFrom,
            select: (columns?: string) => {
              return traceSupabaseQuery(`select.${table}`, async () => 
                originalFrom.select(columns)
              );
            },
            insert: (values: any) => {
              return traceSupabaseQuery(`insert.${table}`, async () => 
                originalFrom.insert(values)
              );
            },
            update: (values: any) => {
              return traceSupabaseQuery(`update.${table}`, async () => 
                originalFrom.update(values)
              );
            },
            delete: () => {
              return traceSupabaseQuery(`delete.${table}`, async () => 
                originalFrom.delete()
              );
            },
            upsert: (values: any) => {
              return traceSupabaseQuery(`upsert.${table}`, async () => 
                originalFrom.upsert(values)
              );
            },
          };
        };
      }
      
      // Wrap 'channel' method to trace real-time subscriptions
      if (prop === 'channel') {
        return (name: string, options?: any) => {
          const channel = original.call(target, name, options);
          
          // Monitor channel health with Living Map monitoring
          // livingMapMonitor tracks overall map state rather than individual channels
          
          return traceRealtimeSubscription(name, () => {
            // Wrap subscribe method
            const originalSubscribe = channel.subscribe?.bind(channel);
            if (originalSubscribe) {
              channel.subscribe = (callback?: any) => {
                return traceRealtimeSubscription(`${name}.subscribe`, () => 
                  originalSubscribe(callback)
                );
              };
            }
            
            return channel;
          });
        };
      }
      
      // Wrap 'rpc' method to trace function calls
      if (prop === 'rpc') {
        return (functionName: string, args?: any) => {
          return traceSupabaseQuery(`rpc.${functionName}`, async () => 
            original.call(target, functionName, args)
          );
        };
      }
      
      // Return original for other methods
      return typeof original === 'function' ? original.bind(target) : original;
    },
  }) as SupabaseClient<T>;
}

/**
 * Traced Supabase client - use this instead of the regular supabase client
 * for automatic tracing of all operations
 */
export const tracedSupabase = createTracedSupabase(supabase);

/**
 * Helper to trace custom Supabase operations
 */
export async function traceSupabaseOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  return traceSupabaseQuery(operationName, operation, metadata);
}

