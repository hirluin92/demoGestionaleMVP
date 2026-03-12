import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'

// Commento in italiano: helper per trovare il tenant da subscription o customer ID
async function findTenantFromStripe(
  subscriptionId?: string | null,
  customerId?: string | null,
  metadataTenantId?: string | null,
): Promise<string | null> {
  // 1. Prova con metadata (funziona solo per checkout.session.completed)
  if (metadataTenantId) return metadataTenantId

  // 2. Prova con subscription ID
  if (subscriptionId) {
    const tenant = await prisma.tenant.findFirst({
      where: { stripeSubId: subscriptionId },
      select: { id: true },
    })
    if (tenant) return tenant.id
  }

  // 3. Prova con customer ID
  if (customerId) {
    const tenant = await prisma.tenant.findFirst({
      where: { stripeCustomerId: customerId as string },
      select: { id: true },
    })
    if (tenant) return tenant.id
  }

  return null
}

// Commenti in italiano: webhook Stripe per aggiornare stato piano Tenant

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { success: false, error: 'Stripe non configurato' },
      { status: 503 },
    )
  }

  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json(
      { success: false, error: 'Firma mancante' },
      { status: 400 },
    )
  }

  if (!env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { success: false, error: 'Stripe webhook secret non configurato' },
      { status: 503 },
    )
  }

  const rawBody = await req.text()

  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      env.STRIPE_WEBHOOK_SECRET,
    )

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as {
          metadata?: { tenantId?: string }
          subscription?: string | null
          customer?: string | null
        }

        const tenantId = await findTenantFromStripe(
          session.subscription ?? undefined,
          session.customer ?? undefined,
          session.metadata?.tenantId ?? null,
        )

        const subscriptionId = session.subscription ?? undefined

        if (tenantId && subscriptionId && session.customer) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              stripeCustomerId: session.customer,
              stripeSubId: subscriptionId,
              status: 'ACTIVE',
            },
          })
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const subscription = event.data.object as {
          id: string
          status: string
          customer?: string | null
          metadata?: { tenantId?: string }
        }

        const tenantId = await findTenantFromStripe(
          subscription.id,
          subscription.customer ?? undefined,
          subscription.metadata?.tenantId ?? null,
        )

        if (tenantId) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              stripeSubId: subscription.id,
              status: subscription.status === 'active' ? 'ACTIVE' : 'SUSPENDED',
            },
          })
        }
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as {
          id: string
          customer?: string | null
          metadata?: { tenantId?: string }
        }

        const tenantId = await findTenantFromStripe(
          subscription.id,
          subscription.customer ?? undefined,
          subscription.metadata?.tenantId ?? null,
        )

        if (tenantId) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              status: 'CANCELLED',
            },
          })
        }
        break
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as {
          customer?: string | null
          metadata?: { tenantId?: string }
        }

        const tenantId = await findTenantFromStripe(
          undefined,
          invoice.customer ?? undefined,
          invoice.metadata?.tenantId ?? null,
        )

        if (tenantId) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              status: 'ACTIVE',
            },
          })
        }
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as {
          customer?: string | null
          metadata?: { tenantId?: string }
        }

        const tenantId = await findTenantFromStripe(
          undefined,
          invoice.customer ?? undefined,
          invoice.metadata?.tenantId ?? null,
        )

        if (tenantId) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              status: 'SUSPENDED',
            },
          })
        }
        break
      }
      default:
        break
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json(
      { success: false, error: 'Errore webhook' },
      { status: 400 },
    )
  }
}

