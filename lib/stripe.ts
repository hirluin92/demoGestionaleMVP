import Stripe from 'stripe'
import { env } from './env'

if (!env.STRIPE_SECRET_KEY) {
  console.warn('⚠️ Stripe non configurato')
}

export const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    })
  : null

export const PLANS = {
  SOLO: { 
    priceId: env.STRIPE_PRICE_SOLO || '', 
    name: 'Solo', 
    price: 2900 
  },
  PRO: { 
    priceId: env.STRIPE_PRICE_PRO || '', 
    name: 'Pro', 
    price: 6900 
  },
  STUDIO: { 
    priceId: env.STRIPE_PRICE_STUDIO || '', 
    name: 'Studio', 
    price: 12900 
  },
} as const

// Helper per verificare se Stripe è configurato
export function isStripeConfigured(): boolean {
  return stripe !== null && env.STRIPE_SECRET_KEY !== undefined
}
