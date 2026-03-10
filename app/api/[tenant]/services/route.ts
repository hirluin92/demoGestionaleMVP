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
    const auth = await requireTenantAccess(params.tenant)
    if (auth.error) return auth.error

    const { searchParams } = new URL(req.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const services = await prisma.service.findMany({
      where: {
        tenantId: auth.tenantId!,
        ...(activeOnly && { isActive: true }),
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
