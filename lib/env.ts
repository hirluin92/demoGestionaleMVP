/**
 * Environment variables validation and type-safe access
 * 
 * Validates all required environment variables at startup and provides
 * type-safe access throughout the application.
 * 
 * @module lib/env
 * @example
 * ```typescript
 * import { env } from '@/lib/env'
 * 
 * const dbUrl = env.DATABASE_URL
 * if (env.TWILIO_ACCOUNT_SID) {
 *   // Twilio is configured
 * }
 * ```
 */

import { z } from 'zod'

const envSchema = z.object({
  // Database (sempre richiesto)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL è richiesto'),
  
  // NextAuth (sempre richiesto)
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL deve essere un URL valido'),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET deve essere almeno 32 caratteri'),
  
  // Google Calendar (richiesto in produzione, opzionale in dev)
  GOOGLE_CLIENT_ID: process.env.NODE_ENV === 'production' 
    ? z.string().min(1, 'GOOGLE_CLIENT_ID è richiesto in produzione')
    : z.string().optional(),
  GOOGLE_CLIENT_SECRET: process.env.NODE_ENV === 'production'
    ? z.string().min(1, 'GOOGLE_CLIENT_SECRET è richiesto in produzione')
    : z.string().optional(),
  GOOGLE_CALENDAR_ID: z.string().default('primary'),
  
  // Twilio (opzionale - l'app funziona senza WhatsApp)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),
  
  // Admin (opzionale - per seed script)
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(6).optional(),
  
  // Cron (opzionale - per reminder job)
  CRON_SECRET: z.string().min(16).optional(),
  
  // Resend (opzionale - per email password reset)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export type Env = z.infer<typeof envSchema>

let env: Env

try {
  env = envSchema.parse(process.env)
  
  // Log warning per variabili opzionali mancanti
  if (!env.TWILIO_ACCOUNT_SID) {
    console.warn('⚠️  TWILIO_ACCOUNT_SID non configurato - le notifiche WhatsApp saranno disabilitate')
  }
  if (!env.GOOGLE_CLIENT_ID && process.env.NODE_ENV === 'development') {
    console.warn('⚠️  GOOGLE_CLIENT_ID non configurato - Google Calendar disabilitato in dev')
  }
  
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Errore configurazione environment variables:')
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`)
    })
    process.exit(1)
  }
  throw error
}

export { env }
