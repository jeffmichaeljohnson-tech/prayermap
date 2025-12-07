/**
 * App Settings Management Hooks
 * React Query hooks for fetching and updating application settings
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

// Types
export interface AppSetting {
  key: string
  value: string | number | boolean | object
  description: string | null
  updated_at: string
}

// Default settings when RPC doesn't exist
const DEFAULT_SETTINGS: Record<string, AppSetting> = {
  prayer_expiration_days: {
    key: 'prayer_expiration_days',
    value: '30',
    description: 'Number of days before a prayer expires',
    updated_at: new Date().toISOString(),
  },
  memorial_line_duration_days: {
    key: 'memorial_line_duration_days',
    value: '365',
    description: 'Number of days memorial lines persist',
    updated_at: new Date().toISOString(),
  },
}

/**
 * Fetch all app settings
 */
export function useAppSettings() {
  return useQuery({
    queryKey: ['admin-app-settings'],
    queryFn: async (): Promise<Record<string, AppSetting>> => {
      const { data, error } = await supabase.rpc('get_app_settings')

      if (error) {
        console.error('Error fetching app settings:', error)
        // Return defaults if function doesn't exist yet
        if (error.code === 'PGRST202' || error.message.includes('function') || error.message.includes('does not exist')) {
          console.warn('App settings RPC function not found - run the migration SQL')
          return DEFAULT_SETTINGS
        }
        throw new Error(error.message)
      }

      // Convert array of settings to object
      const settings: Record<string, AppSetting> = {}
      if (data && Array.isArray(data)) {
        for (const setting of data) {
          settings[setting.key] = {
            ...setting,
            value: typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value),
          }
        }
      }

      return settings
    },
  })
}

/**
 * Get a specific setting value
 */
export function useAppSetting(key: string, defaultValue: string | number = '') {
  const { data: settings, isLoading, error } = useAppSettings()

  const value = settings?.[key]?.value ?? defaultValue
  const parsedValue = typeof value === 'string' ? value.replace(/"/g, '') : value

  return {
    value: parsedValue,
    isLoading,
    error,
    setting: settings?.[key],
  }
}

/**
 * Update an app setting
 */
export function useUpdateAppSetting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string | number }) => {
      const valueString = typeof value === 'number' ? value.toString() : value
      
      const { data, error } = await supabase.rpc('update_app_setting', {
        p_key: key,
        p_value: valueString,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error updating setting:', error)
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-app-settings'] })
      toast.success(`Setting "${variables.key}" updated successfully`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to update setting: ${error.message}`)
    },
  })
}

/**
 * Hook for prayer expiration setting specifically
 */
export function usePrayerExpirationSetting() {
  const { value, isLoading, error } = useAppSetting('prayer_expiration_days', 30)
  const updateSetting = useUpdateAppSetting()

  return {
    expirationDays: Number(value) || 30,
    isLoading,
    error,
    updateExpirationDays: (days: number) => 
      updateSetting.mutate({ key: 'prayer_expiration_days', value: days }),
    isUpdating: updateSetting.isPending,
  }
}

/**
 * Hook for memorial line duration setting
 */
export function useMemorialLineDurationSetting() {
  const { value, isLoading, error } = useAppSetting('memorial_line_duration_days', 365)
  const updateSetting = useUpdateAppSetting()

  return {
    durationDays: Number(value) || 365,
    isLoading,
    error,
    updateDurationDays: (days: number) => 
      updateSetting.mutate({ key: 'memorial_line_duration_days', value: days }),
    isUpdating: updateSetting.isPending,
  }
}

