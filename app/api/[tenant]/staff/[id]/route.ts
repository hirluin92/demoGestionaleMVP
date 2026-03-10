import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenantAccess } from '@/lib/api-auth'
import { createStaffSchema } from '@/lib/validators'

/**
 * GET /api/[tenant]/staff/[id]
 * Dettaglio operatore
 */
export async function GET(
  req: Request,
  { params }: { params: { tenant: string; id: string } }
) {
  try {
    const auth = await requireTenantAccess(params.tenant)
    if (auth.error) return auth.error

    const staff = await prisma.staff.findFirst({
      where: {
        id: params.id,
        tenantId: auth.tenantId!,
      },
      include: {
        serviceLinks: {
          include: {
            service: true,
          },
        },
      },
    })

    if (!staff) {
      return NextResponse.json(
        { success: false, error: 'Operatore non trovato' },
        { status: 404 }
      )
    }

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
 * PUT /api/[tenant]/staff/[id]
 * Aggiorna operatore
 */
export async function PUT(
  req: Request,
  { params }: { params: { tenant: string; id: string } }
) {
  try {
    const auth = await requireTenantAccess(params.tenant)
    if (auth.error) return auth.error

    const body = await req.json()
    const data = createStaffSchema.partial().parse(body)

    // Verifica che lo staff esista e appartenga al tenant
    const existing = await prisma.staff.findFirst({
      where: {
        id: params.id,
        tenantId: auth.tenantId!,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Operatore non trovato' },
        { status: 404 }
      )
    }

    const { serviceIds, ...staffData } = data

    // Aggiorna staff e servizi associati in transazione
    const updated = await prisma.$transaction(async (tx) => {
      // Aggiorna dati base staff
      await tx.staff.update({
        where: { id: params.id },
        data: staffData,
      })

      // Aggiorna servizi associati se forniti
      if (serviceIds !== undefined) {
        // Elimina vecchie associazioni
        await tx.staffService.deleteMany({
          where: { staffId: params.id },
        })

        // Crea nuove associazioni
        if (serviceIds.length > 0) {
          await tx.staffService.createMany({
            data: serviceIds.map((serviceId: string) => ({
              staffId: params.id,
              serviceId,
            })),
          })
        }
      }

      // Ritorna staff con servizi aggiornati
      return await tx.staff.findUnique({
        where: { id: params.id },
        include: {
          serviceLinks: {
            include: {
              service: true,
            },
          },
        },
      })
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
 * DELETE /api/[tenant]/staff/[id]
 * Elimina operatore (soft delete: imposta isActive = false)
 */
export async function DELETE(
  req: Request,
  { params }: { params: { tenant: string; id: string } }
) {
  try {
    const auth = await requireTenantAccess(params.tenant)
    if (auth.error) return auth.error

    // Verifica che lo staff esista e appartenga al tenant
    const existing = await prisma.staff.findFirst({
      where: {
        id: params.id,
        tenantId: auth.tenantId!,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Operatore non trovato' },
        { status: 404 }
      )
    }

    // Soft delete: imposta isActive = false invece di eliminare
    const updated = await prisma.staff.update({
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
