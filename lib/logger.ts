/**
 * Structured logging utility
 * 
 * @module lib/logger
 */

import { env } from './env'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogMeta {
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  meta?: LogMeta
  environment: string
}

class Logger {
  private isProduction = env.NODE_ENV === 'production'

  private formatMessage(level: LogLevel, message: string, meta?: LogMeta): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
      environment: env.NODE_ENV || 'development',
    }
  }

  private log(level: LogLevel, message: string, meta?: LogMeta) {
    const entry = this.formatMessage(level, message, meta)
    
    if (this.isProduction) {
      console.log(JSON.stringify(entry))
    } else {
      const metaStr = meta ? `\n  ${JSON.stringify(meta, null, 2)}` : ''
      const color = {
        info: '\x1b[36m',
        warn: '\x1b[33m',
        error: '\x1b[31m',
        debug: '\x1b[90m',
      }[level]
      const reset = '\x1b[0m'
      
      console.log(`${color}[${entry.timestamp}] [${level.toUpperCase()}]${reset} ${message}${metaStr}`)
    }
  }

  info(message: string, meta?: LogMeta) {
    this.log('info', message, meta)
  }

  warn(message: string, meta?: LogMeta) {
    this.log('warn', message, meta)
  }

  error(message: string, meta?: LogMeta) {
    this.log('error', message, meta)
  }

  debug(message: string, meta?: LogMeta) {
    if (!this.isProduction) {
      this.log('debug', message, meta)
    }
  }
}

/**
 * Sanitizes error objects to remove sensitive information
 * 
 * @param error - Error object or any value
 * @returns Sanitized error object safe for logging
 */
export function sanitizeError(error: unknown): {
  message: string
  name?: string
  stack?: string
  code?: string | number
  [key: string]: unknown
} {
  // Lista di campi sensibili da rimuovere
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'accessToken',
    'refreshToken',
    'apiKey',
    'authToken',
    'authorization',
    'credentials',
    'cookie',
    'session',
  ]

  // Se è un Error standard
  if (error instanceof Error) {
    const sanitized: {
      message: string
      name?: string
      stack?: string
      code?: string | number
      [key: string]: unknown
    } = {
      message: error.message,
      name: error.name,
    }

    // Aggiungi stack solo in development
    if (process.env.NODE_ENV !== 'production') {
      sanitized.stack = error.stack
    }

    // Aggiungi code se presente
    if ('code' in error) {
      const code = (error as { code?: string | number }).code
      if (code !== undefined && (typeof code === 'string' || typeof code === 'number')) {
        sanitized.code = code
      }
    }

    // Rimuovi campi sensibili da eventuali proprietà aggiuntive
    Object.keys(error).forEach(key => {
      if (!sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        const value = (error as unknown as Record<string, unknown>)[key]
        // Non loggare oggetti complessi o funzioni
        if (typeof value !== 'function' && typeof value !== 'object') {
          sanitized[key] = value
        }
      }
    })

    return sanitized
  }

  // Se è un oggetto
  if (typeof error === 'object' && error !== null) {
    const sanitized: {
      message: string
      [key: string]: unknown
    } = {
      message: 'Unknown error',
    }
    Object.keys(error).forEach(key => {
      if (!sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        const value = (error as Record<string, unknown>)[key]
        // Non loggare oggetti complessi, funzioni o valori troppo lunghi
        if (typeof value !== 'function' && typeof value !== 'object' && String(value).length < 500) {
          sanitized[key] = value
          // Se c'è una proprietà 'message', usala
          if (key === 'message' && typeof value === 'string') {
            sanitized.message = value
          }
        }
      }
    })
    return sanitized
  }

  // Se è una stringa o altro
  return {
    message: String(error),
  }
}

/**
 * Logger instance
 * 
 * - Development: Colored console output with formatted metadata
 * - Production: JSON-formatted logs for log aggregation services
 * 
 * @example
 * ```typescript
 * import { logger, sanitizeError } from '@/lib/logger'
 * 
 * logger.info('User logged in', { userId: '123' })
 * logger.error('Payment failed', { error: sanitizeError(err), orderId: '456' })
 * logger.debug('Processing item', { item })
 * ```
 */
export const logger = new Logger()
