import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe, PLANS } from '@/lib/stripe'
import { env } from '@/lib/env'

// Commenti in italiano: crea una Checkout Session Stripe per il tenant corrente

const bodySchema = z.object({
  plan: z.enum(['SOLO', 'PRO', 'STUDIO']).default('PRO'),
})

export async function POST(req: Request) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { success: false, error: 'Stripe non configurato' },
        { status: 503 },
      )
    }

    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Non autenticato' },
        { status: 401 },
      )
    }

    const { tenantId, tenantSlug } = session.user
    const body = await req.json().catch(() => ({}))
    const data = bodySchema.parse(body)
    const plan = PLANS[data.plan]

    if (!plan.priceId) {
      return NextResponse.json(
        { success: false, error: 'Piano non configurato' },
        { status: 400 },
      )
    }

    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId },
    })

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant non trovato' },
        { status: 404 },
      )
    }

    // Crea o recupera customer Stripe
    let stripeCustomerId = tenant.stripeCustomerId
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: tenant.email,
        name: tenant.name,
        metadata: { tenantId: tenant.id },
      })
      stripeCustomerId = customer.id
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { stripeCustomerId },
      })
    }

    const sessionCheckout = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: plan.priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 30,
      },
      success_url: `${env.NEXT_PUBLIC_APP_URL}/${tenantSlug}/billing?success=true`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/${tenantSlug}/billing?cancelled=true`,
      metadata: {
        tenantId: tenant.id,
        plan: data.plan,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        url: sessionCheckout.url,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Dati non validi', details: error.errors },
        { status: 400 },
      )
    }
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { success: false, error: 'Errore interno' },
      { status: 500 },
    )
  }
}

