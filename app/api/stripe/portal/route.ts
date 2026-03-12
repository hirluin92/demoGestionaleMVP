import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { env } from '@/lib/env'

// Commento in italiano: crea sessione Stripe Billing Portal per gestione abbonamento

export async function POST() {
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

    const tenant = await prisma.tenant.findFirst({
      where: { id: session.user.tenantId },
    })

    if (!tenant?.stripeCustomerId) {
      return NextResponse.json(
        { success: false, error: 'Nessun abbonamento attivo' },
        { status: 400 },
      )
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${env.NEXT_PUBLIC_APP_URL}/${session.user.tenantSlug}/billing`,
    })

    return NextResponse.json({
      success: true,
      data: { url: portalSession.url },
    })
  } catch (error) {
    console.error('Stripe portal error:', error)
    return NextResponse.json(
      { success: false, error: 'Errore interno' },
      { status: 500 },
    )
  }
}

