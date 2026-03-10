/**
 * Type guards and error handling utilities
 * 
 * @module lib/errors
 */

import { z } from 'zod'

// Twilio Error
export interface TwilioError extends Error {
  code: number
  status?: number
  moreInfo?: string
}

/**
 * Checks if an error is a Twilio error
 * 
 * @param error - The error to check
 * @returns True if the error is a TwilioError
 * @example
 * ```typescript
 * catch (error) {
 *   if (isTwilioError(error)) {
 *     console.log('Twilio error code:', error.code)
 *   }
 * }
 * ```
 */
export function isTwilioError(error: unknown): error is TwilioError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'number'
  )
}

// Prisma Error
export interface PrismaError extends Error {
  code: string
  meta?: {
    target?: string[]
    cause?: string
  }
}

/**
 * Checks if an error is a Prisma database error
 * 
 * @param error - The error to check
 * @returns True if the error is a PrismaError
 * @example
 * ```typescript
 * catch (error) {
 *   if (isPrismaError(error) && error.code === 'P2002') {
 *     console.log('Unique constraint violation')
 *   }
 * }
 * ```
 */
export function isPrismaError(error: unknown): error is PrismaError {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error
  ) {
    const code = (error as Record<string, unknown>).code
    return typeof code === 'string' && code.startsWith('P')
  }
  return false
}

/**
 * Extracts a user-friendly message from a Zod validation error
 * 
 * @param error - The error to process
 * @returns Formatted error message
 */
export function getZodErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
  }
  return 'Errore di validazione'
}
