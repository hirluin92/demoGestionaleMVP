import Stripe from 'stripe'
import { env } from './env'

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-02-25.clover',
})

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
