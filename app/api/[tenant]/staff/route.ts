import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenantAccess } from '@/lib/api-auth'
import { createStaffSchema } from '@/lib/validators'

/**
 * GET /api/[tenant]/staff
 * Lista operatori del tenant
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

    const staff = await prisma.staff.findMany({
      where: {
        tenantId: auth.tenantId!,
        ...(activeOnly && { isActive: true }),
      },
      include: {
        serviceLinks: {
          include: {
            service: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ success: true, data: staff })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Errore interno' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/[tenant]/staff
 * Crea nuovo operatore
 */
export async function POST(
  req: Request,
  { params }: { params: { tenant: string } }
) {
  try {
    const auth = await requireTenantAccess(params.tenant)
    if (auth.error) return auth.error

    const body = await req.json()
    const data = createStaffSchema.parse(body)

    const { serviceIds, ...staffData } = data

    // Crea staff e servizi associati in transazione
    const staff = await prisma.staff.create({
      data: {
        ...staffData,
        tenantId: auth.tenantId!,
        serviceLinks: {
          create: serviceIds.map((serviceId: string) => ({
            serviceId,
          })),
        },
      },
      include: {
        serviceLinks: {
          include: {
            service: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: staff })
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
