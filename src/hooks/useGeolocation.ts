import { useState, useEffect } from 'react'

export interface GeolocationPosition {
  latitude: number
  longitude: number
  accuracy?: number
}

export interface UseGeolocationReturn {
  position: GeolocationPosition | null
  loading: boolean
  error: GeolocationPositionError | null
  refresh: () => void
}

export interface GeolocationPositionError {
  code: number
  message: string
}

/**
 * Hook to get user's current geolocation
 * 
 * @param options - Geolocation options (enableHighAccuracy, timeout, maximumAge)
 * @returns Position, loading state, error, and refresh function
 */
export function useGeolocation(
  options?: PositionOptions
): UseGeolocationReturn {
  const [position, setPosition] = useState<GeolocationPosition | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<GeolocationPositionError | null>(null)

  const getCurrentPosition = () => {
    if (!navigator.geolocation) {
      setError({
        code: 0,
        message: 'Geolocation is not supported by your browser',
      })
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
        setLoading(false)
      },
      (err) => {
        setError({
          code: err.code,
          message: err.message,
        })
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
        ...options,
      }
    )
  }

  useEffect(() => {
    getCurrentPosition()
  }, [])

  return {
    position,
    loading,
    error,
    refresh: getCurrentPosition,
  }
}

