/**
 * Application configuration constants
 * 
 * @module lib/config
 */

/**
 * Application configuration
 * 
 * Centralized configuration for timezone, booking rules, reminders, and rate limiting.
 * All values are type-safe and immutable.
 * 
 * @constant
 * @example
 * ```typescript
 * import { APP_CONFIG } from '@/lib/config'
 * 
 * const minHour = APP_CONFIG.booking.minHour // 8
 * const timezone = APP_CONFIG.timezone // 'Europe/Rome'
 * ```
 */
export const APP_CONFIG = {
  timezone: 'Europe/Rome',
  
  booking: {
    minHour: 8,
    maxHour: 20,
    slotIntervalMinutes: 15, // Intervallo griglia calendario
  },
  
  reminders: {
    minutesBefore: 60,
    cronWindowMinutes: 10,
  },
  
  rateLimit: {
    bookings: {
      maxRequests: 10,
      windowMs: 60 * 1000,
    },
    login: {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000,
    },
  },
} as const

export type AppConfig = typeof APP_CONFIG
