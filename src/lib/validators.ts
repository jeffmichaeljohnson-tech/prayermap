/**
 * Form validation utilities
 */

export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { isValid: false, error: 'Email is required' }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' }
  }

  return { isValid: true }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'Password is required' }
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' }
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' }
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' }
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' }
  }

  return { isValid: true }
}

/**
 * Validate prayer text
 */
export function validatePrayerText(text: string): ValidationResult {
  if (!text || text.trim().length === 0) {
    return { isValid: false, error: 'Prayer text is required' }
  }

  if (text.trim().length < 10) {
    return { isValid: false, error: 'Prayer must be at least 10 characters' }
  }

  if (text.length > 5000) {
    return { isValid: false, error: 'Prayer must be less than 5000 characters' }
  }

  return { isValid: true }
}

/**
 * Validate prayer title
 */
export function validatePrayerTitle(title: string | null): ValidationResult {
  if (!title) {
    return { isValid: true } // Title is optional
  }

  if (title.trim().length < 3) {
    return { isValid: false, error: 'Title must be at least 3 characters' }
  }

  if (title.length > 200) {
    return { isValid: false, error: 'Title must be less than 200 characters' }
  }

  return { isValid: true }
}

/**
 * Validate coordinates
 */
export function validateCoordinates(lat: number, lng: number): ValidationResult {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return { isValid: false, error: 'Coordinates must be numbers' }
  }

  if (lat < -90 || lat > 90) {
    return { isValid: false, error: 'Latitude must be between -90 and 90' }
  }

  if (lng < -180 || lng > 180) {
    return { isValid: false, error: 'Longitude must be between -180 and 180' }
  }

  return { isValid: true }
}

/**
 * Validate file for media upload
 */
export function validateMediaFile(file: File, maxSizeMB: number = 10): ValidationResult {
  const validTypes = ['audio/mpeg', 'audio/wav', 'audio/aac', 'video/mp4', 'video/webm']
  
  if (!validTypes.includes(file.type)) {
    return { isValid: false, error: 'Invalid file type. Only audio and video files are allowed' }
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return { isValid: false, error: `File size must be less than ${maxSizeMB}MB` }
  }

  return { isValid: true }
}



