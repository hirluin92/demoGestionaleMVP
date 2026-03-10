import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenantAccess } from '@/lib/api-auth'
import { createServiceSchema } from '@/lib/validators'

/**
 * GET /api/[tenant]/services/[id]
 * Dettaglio servizio
 */
export async function GET(
  req: Request,
  { params }: { params: { tenant: string; id: string } }
) {
  try {
    const auth = await requireTenantAccess(params.tenant)
    if (auth.error) return auth.error

    const service = await prisma.service.findFirst({
      where: {
        id: params.id,
        tenantId: auth.tenantId!,
      },
    })

    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Servizio non trovato' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: service })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Errore interno' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/[tenant]/services/[id]
 * Aggiorna servizio
 */
export async function PUT(
  req: Request,
  { params }: { params: { tenant: string; id: string } }
) {
  try {
    const auth = await requireTenantAccess(params.tenant)
    if (auth.error) return auth.error

    const body = await req.json()
    const data = createServiceSchema.partial().parse(body)

    // Verifica che il servizio esista e appartenga al tenant
    const existing = await prisma.service.findFirst({
      where: {
        id: params.id,
        tenantId: auth.tenantId!,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Servizio non trovato' },
        { status: 404 }
      )
    }

    const updated = await prisma.service.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json({ success: true, data: updated })
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

/**
 * DELETE /api/[tenant]/services/[id]
 * Elimina servizio (soft delete: imposta isActive = false)
 */
export async function DELETE(
  req: Request,
  { params }: { params: { tenant: string; id: string } }
) {
  try {
    const auth = await requireTenantAccess(params.tenant)
    if (auth.error) return auth.error

    // Verifica che il servizio esista e appartenga al tenant
    const existing = await prisma.service.findFirst({
      where: {
        id: params.id,
        tenantId: auth.tenantId!,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Servizio non trovato' },
        { status: 404 }
      )
    }

    // Soft delete: imposta isActive = false invece di eliminare
    const updated = await prisma.service.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Errore interno' },
      { status: 500 }
    )
  }
}
