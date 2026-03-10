import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenantAccess } from '@/lib/api-auth'
import { createClientSchema } from '@/lib/validators'

/**
 * GET /api/[tenant]/clients
 * Lista clienti con ricerca e filtri
 */
export async function GET(
  req: Request,
  { params }: { params: { tenant: string } }
) {
  try {
    const auth = await requireTenantAccess(params.tenant)
    if (auth.error) return auth.error

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const filter = searchParams.get('filter') || 'all'

    const where: {
      tenantId: string
      OR?: Array<{ name?: { contains: string; mode: 'insensitive' }; phone?: { contains: string } } | { lastVisitAt?: { lt: Date } | { gte: Date } | null }>
      lastVisitAt?: { gte: Date }
      totalVisits?: number
    } = {
      tenantId: auth.tenantId!,
    }

    // Ricerca per nome o telefono
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ]
    }

    // Filtri
    if (filter === 'active') {
      // Visita negli ultimi 30 giorni
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      where.lastVisitAt = { gte: thirtyDaysAgo }
    } else if (filter === 'dormant') {
      // Nessuna visita da 60+ giorni
      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
      where.OR = [
        { lastVisitAt: { lt: sixtyDaysAgo } },
        { lastVisitAt: null },
      ]
    } else if (filter === 'new') {
      // Solo 1 visita
      where.totalVisits = 1
    }

    const clients = await prisma.client.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 50, // Limite risultati
    })

    return NextResponse.json({ success: true, data: clients })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Errore interno' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/[tenant]/clients
 * Crea nuovo cliente
 */
export async function POST(
  req: Request,
  { params }: { params: { tenant: string } }
) {
  try {
    const auth = await requireTenantAccess(params.tenant)
    if (auth.error) return auth.error

    const body = await req.json()
    const data = createClientSchema.parse(body)

    // Verifica se cliente esiste già (stesso telefono per tenant)
    const existing = await prisma.client.findUnique({
      where: {
        tenantId_phone: {
          tenantId: auth.tenantId!,
          phone: data.phone,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Cliente già esistente con questo telefono' },
        { status: 409 }
      )
    }

    const client = await prisma.client.create({
      data: {
        ...data,
        tenantId: auth.tenantId!,
      },
    })

    return NextResponse.json({ success: true, data: client })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Dati non validi', details: error.errors },
        { status: 400 }
      )
    }
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Errore interno' },
      { status: 500 }
    )
  }
}
