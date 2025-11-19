/**
 * Utility functions for distance conversion and formatting
 * Based on prayermap_schema_v2.sql distance unit conventions:
 * - User-facing display: Always MILES
 * - Database storage: Always KILOMETERS
 * - Conversion: 1 mile = 1.60934 km
 */

import { MILES_TO_KM, KM_TO_MILES } from './constants'

// ============================================================================
// DISTANCE CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert miles to kilometers
 * 
 * @param miles - Distance in miles
 * @returns Distance in kilometers
 * 
 * @example
 * ```ts
 * milesToKm(30) // Returns 48.2802
 * ```
 */
export function milesToKm(miles: number): number {
  if (typeof miles !== 'number' || isNaN(miles) || miles < 0) {
    throw new Error('miles must be a non-negative number')
  }
  return miles * MILES_TO_KM
}

/**
 * Convert kilometers to miles
 * 
 * @param km - Distance in kilometers
 * @returns Distance in miles
 * 
 * @example
 * ```ts
 * kmToMiles(48.2802) // Returns 30
 * ```
 */
export function kmToMiles(km: number): number {
  if (typeof km !== 'number' || isNaN(km) || km < 0) {
    throw new Error('km must be a non-negative number')
  }
  return km * KM_TO_MILES
}

// ============================================================================
// DISTANCE FORMATTING FUNCTIONS
// ============================================================================

/**
 * Format distance for display
 * 
 * Formats distance in a user-friendly way:
 * - Less than 0.1 miles: Shows in feet
 * - Less than 1 mile: Shows in tenths of a mile (e.g., "0.5 mi")
 * - 1 mile or more: Shows whole miles with decimal (e.g., "2.3 mi")
 * - Very large distances: Shows whole miles only (e.g., "100 mi")
 * 
 * @param miles - Distance in miles
 * @param options - Formatting options
 * @param options.precision - Number of decimal places (default: 1)
 * @param options.unit - Unit to display ('mi' or 'miles', default: 'mi')
 * @returns Formatted distance string
 * 
 * @example
 * ```ts
 * formatDistance(0.5) // Returns "0.5 mi"
 * formatDistance(2.345) // Returns "2.3 mi"
 * formatDistance(100) // Returns "100 mi"
 * formatDistance(0.05, { precision: 2 }) // Returns "0.05 mi"
 * ```
 */
export function formatDistance(
  miles: number,
  options: {
    precision?: number
    unit?: 'mi' | 'miles'
  } = {}
): string {
  if (typeof miles !== 'number' || isNaN(miles) || miles < 0) {
    throw new Error('miles must be a non-negative number')
  }

  const { precision = 1, unit = 'mi' } = options

  // Handle very small distances (less than 0.1 miles)
  if (miles < 0.1) {
    const feet = miles * 5280
    if (feet < 100) {
      return `${Math.round(feet)} ft`
    }
    return `${Math.round(feet / 10) * 10} ft`
  }

  // Handle distances less than 1 mile
  if (miles < 1) {
    return `${miles.toFixed(precision)} ${unit}`
  }

  // Handle whole miles (no decimal needed)
  if (miles >= 100) {
    return `${Math.round(miles)} ${unit}`
  }

  // Handle distances between 1 and 100 miles
  return `${miles.toFixed(precision)} ${unit}`
}

/**
 * Format distance from kilometers for display
 * 
 * Converts kilometers to miles and formats for display.
 * This is a convenience function for when you have distance in km
 * (e.g., from database) and want to display it in miles.
 * 
 * @param km - Distance in kilometers
 * @param options - Formatting options (see formatDistance)
 * @returns Formatted distance string in miles
 * 
 * @example
 * ```ts
 * formatDistanceFromKm(48.2802) // Returns "30.0 mi"
 * ```
 */
export function formatDistanceFromKm(
  km: number,
  options?: {
    precision?: number
    unit?: 'mi' | 'miles'
  }
): string {
  const miles = kmToMiles(km)
  return formatDistance(miles, options)
}

// ============================================================================
// DISTANCE VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate miles value
 * 
 * @param miles - Distance in miles to validate
 * @param min - Minimum allowed miles (default: 0)
 * @param max - Maximum allowed miles (default: Infinity)
 * @returns True if valid, throws error if invalid
 * 
 * @throws {Error} If miles is invalid
 */
export function validateMiles(
  miles: number,
  min: number = 0,
  max: number = Infinity
): boolean {
  if (typeof miles !== 'number' || isNaN(miles)) {
    throw new Error('miles must be a number')
  }
  if (miles < min) {
    throw new Error(`miles must be at least ${min}`)
  }
  if (miles > max) {
    throw new Error(`miles must be at most ${max}`)
  }
  return true
}

/**
 * Validate kilometers value
 * 
 * @param km - Distance in kilometers to validate
 * @param min - Minimum allowed km (default: 0)
 * @param max - Maximum allowed km (default: Infinity)
 * @returns True if valid, throws error if invalid
 * 
 * @throws {Error} If km is invalid
 */
export function validateKm(
  km: number,
  min: number = 0,
  max: number = Infinity
): boolean {
  if (typeof km !== 'number' || isNaN(km)) {
    throw new Error('km must be a number')
  }
  if (km < min) {
    throw new Error(`km must be at least ${min}`)
  }
  if (km > max) {
    throw new Error(`km must be at most ${max}`)
  }
  return true
}

// ============================================================================
// DISTANCE COMPARISON FUNCTIONS
// ============================================================================

/**
 * Check if distance is within radius
 * 
 * @param distanceMiles - Distance to check in miles
 * @param radiusMiles - Radius limit in miles
 * @returns True if distance is within radius
 */
export function isWithinRadius(
  distanceMiles: number,
  radiusMiles: number
): boolean {
  if (typeof distanceMiles !== 'number' || isNaN(distanceMiles)) {
    return false
  }
  if (typeof radiusMiles !== 'number' || isNaN(radiusMiles)) {
    return false
  }
  return distanceMiles <= radiusMiles
}

/**
 * Check if distance (in km) is within radius (in miles)
 * 
 * Convenience function for comparing database distances (km) with user radius (miles)
 * 
 * @param distanceKm - Distance to check in kilometers
 * @param radiusMiles - Radius limit in miles
 * @returns True if distance is within radius
 */
export function isWithinRadiusKm(
  distanceKm: number,
  radiusMiles: number
): boolean {
  const distanceMiles = kmToMiles(distanceKm)
  return isWithinRadius(distanceMiles, radiusMiles)
}

