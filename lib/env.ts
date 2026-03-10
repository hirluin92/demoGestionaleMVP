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
  DATABASE_URL: z.string().url('DATABASE_URL deve essere un URL valido'),
  
  // NextAuth (sempre richiesto)
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL deve essere un URL valido'),
  NEXTAUTH_SECRET: z.string().min(16, 'NEXTAUTH_SECRET deve essere almeno 16 caratteri'),
  
  // App (sempre richiesto)
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL deve essere un URL valido'),
  
  // Twilio (opzionale - necessario solo per WhatsApp)
  TWILIO_ACCOUNT_SID: z.string().startsWith('AC', 'TWILIO_ACCOUNT_SID deve iniziare con AC').optional(),
  TWILIO_AUTH_TOKEN: z.string().min(1, 'TWILIO_AUTH_TOKEN è richiesto').optional(),
  TWILIO_WHATSAPP_FROM: z.string().startsWith('whatsapp:', 'TWILIO_WHATSAPP_FROM deve iniziare con whatsapp:').optional(),
  TWILIO_SMS_FROM: z.string().optional(),
  
  // Stripe (opzionale - necessario solo per pagamenti)
  STRIPE_SECRET_KEY: z.string().startsWith('sk_', 'STRIPE_SECRET_KEY deve iniziare con sk_').optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_', 'STRIPE_PUBLISHABLE_KEY deve iniziare con pk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET deve iniziare con whsec_').optional(),
  STRIPE_PRICE_SOLO: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_STUDIO: z.string().optional(),
  
  // Claude API (opzionale - necessario solo per note vocali)
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-', 'ANTHROPIC_API_KEY deve iniziare con sk-ant-').optional(),
  
  // Cron (opzionale)
  CRON_SECRET: z.string().min(16, 'CRON_SECRET deve essere almeno 16 caratteri').optional(),
  
  // Google Calendar (opzionale - legacy, non usato in Appointly MVP)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALENDAR_ID: z.string().default('primary'),
  
  // Resend (opzionale - per email password reset)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  
  // Vercel KV (opzionale - per rate limiting persistente)
  KV_URL: z.string().url().optional(),
  KV_REST_API_URL: z.string().url().optional(),
  KV_REST_API_TOKEN: z.string().optional(),
  
  // Admin (opzionale - per seed script)
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(6).optional(),
  
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
  if (!env.STRIPE_SECRET_KEY) {
    console.warn('⚠️  STRIPE_SECRET_KEY non configurato - i pagamenti saranno disabilitati')
  }
  if (!env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY non configurato - le note vocali saranno disabilitate')
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
