import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenantAccess } from '@/lib/api-auth'
import { createServiceSchema } from '@/lib/validators'

/**
 * GET /api/[tenant]/services
 * Lista servizi del tenant
 */
export async function GET(
  req: Request,
  { params }: { params: { tenant: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'

    if (activeOnly) {
      // Accesso pubblico — solo servizi attivi, verifica solo che il tenant esista
      const tenant = await prisma.tenant.findUnique({ 
        where: { slug: params.tenant } 
      })
      if (!tenant) {
        return NextResponse.json(
          { success: false, error: 'Tenant non trovato' },
          { status: 404 }
        )
      }
      const services = await prisma.service.findMany({
        where: {
          tenantId: tenant.id,
          isActive: true,
        },
        orderBy: [
          { sortOrder: 'asc' },
          { name: 'asc' },
        ],
      })
      return NextResponse.json({ success: true, data: services })
    }

    // Accesso autenticato — tutti i servizi
    const auth = await requireTenantAccess(params.tenant)
    if (auth.error) return auth.error

    const services = await prisma.service.findMany({
      where: {
        tenantId: auth.tenantId!,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json({ success: true, data: services })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Errore interno' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/[tenant]/services
 * Crea nuovo servizio
 */
export async function POST(
  req: Request,
  { params }: { params: { tenant: string } }
) {
  try {
    const auth = await requireTenantAccess(params.tenant)
    if (auth.error) return auth.error

    const body = await req.json()
    const data = createServiceSchema.parse(body)

    const service = await prisma.service.create({
      data: {
        ...data,
        tenantId: auth.tenantId!,
      },
    })

    return NextResponse.json({ success: true, data: service })
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
