import { NextResponse } from 'next/server'
import { z } from 'zod'
import { addMinutes } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { requireTenantAccess } from '@/lib/api-auth'
import { updateAppointmentSchema } from '@/lib/validators'

// Commenti in italiano: API update appuntamento (spostamento / cambio stato / note)

const paramsSchema = z.object({
  tenant: z.string().min(1),
  id: z.string().cuid(),
})

export async function PUT(
  req: Request,
  { params }: { params: { tenant: string; id: string } }
) {
  try {
    const parsedParams = paramsSchema.parse(params)
    const auth = await requireTenantAccess(parsedParams.tenant)
    if (auth.error) return auth.error

    const body = await req.json()
    const data = updateAppointmentSchema.parse(body)

    // Recupera appuntamento esistente con servizio per ricalcolare endTime
    const existing = await prisma.appointment.findFirst({
      where: {
        id: parsedParams.id,
        tenantId: auth.tenantId!,
      },
      include: {
        service: true,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Appuntamento non trovato' },
        { status: 404 }
      )
    }

    let nextStartTime: Date | undefined
    let nextEndTime: Date | undefined

    if (data.startTime) {
      nextStartTime = new Date(data.startTime)
      nextEndTime = addMinutes(nextStartTime, existing.service.duration)
    }

    // Se viene cambiato lo staff, verifica che appartenga al tenant
    if (data.staffId) {
      const staff = await prisma.staff.findFirst({
        where: {
          id: data.staffId,
          tenantId: auth.tenantId!,
        },
      })

      if (!staff) {
        return NextResponse.json(
          { success: false, error: 'Operatore non valido' },
          { status: 400 }
        )
      }
    }

    // Controllo conflitti solo se cambiamo orario o staff
    if (nextStartTime || data.staffId) {
      const startTime = nextStartTime ?? existing.startTime
      const endTime =
        nextEndTime ??
        addMinutes(startTime, existing.service.duration)
      const staffId = data.staffId ?? existing.staffId

      const overlapping = await prisma.appointment.findFirst({
        where: {
          tenantId: auth.tenantId!,
          staffId,
          id: { not: existing.id },
          status: { notIn: ['CANCELLED'] },
          OR: [
            { startTime: { lte: startTime }, endTime: { gt: startTime } },
            { startTime: { lt: endTime }, endTime: { gte: endTime } },
            { startTime: { gte: startTime }, endTime: { lte: endTime } },
          ],
        },
      })

      if (overlapping) {
        return NextResponse.json(
          { success: false, error: 'Slot già occupato' },
          { status: 409 }
        )
      }
    }

    const updated = await prisma.appointment.update({
      where: { id: existing.id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(nextStartTime && { startTime: nextStartTime }),
        ...(nextEndTime && { endTime: nextEndTime }),
        ...(data.staffId && { staffId: data.staffId }),
      },
      include: {
        client: true,
        staff: true,
        service: true,
      },
    })

    // Commento in italiano: aggiorna statistiche cliente se l'appuntamento è stato completato
    if (data.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      await prisma.client.update({
        where: { id: existing.clientId },
        data: {
          totalVisits: { increment: 1 },
          totalSpent: { increment: existing.price },
          lastVisitAt: new Date(),
        },
      })
    }

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

// Commenti in italiano: cancellazione soft dell'appuntamento (status = CANCELLED)

export async function DELETE(
  _req: Request,
  { params }: { params: { tenant: string; id: string } }
) {
  try {
    const parsedParams = paramsSchema.parse(params)
    const auth = await requireTenantAccess(parsedParams.tenant)
    if (auth.error) return auth.error

    const existing = await prisma.appointment.findFirst({
      where: {
        id: parsedParams.id,
        tenantId: auth.tenantId!,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Appuntamento non trovato' },
        { status: 404 }
      )
    }

    const updated = await prisma.appointment.update({
      where: { id: existing.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Parametri non validi', details: error.errors },
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

