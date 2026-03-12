import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenantAccess } from '@/lib/api-auth'
import { createAppointmentSchema } from '@/lib/validators'
import { addMinutes, format } from 'date-fns'
import { checkSlotAvailability } from '@/lib/appointment-utils'

/**
 * GET /api/[tenant]/appointments
 * Lista appuntamenti per un periodo (settimana o giorno)
 */
export async function GET(
  req: Request,
  { params }: { params: { tenant: string } }
) {
  try {
    const auth = await requireTenantAccess(params.tenant)
    if (auth.error) return auth.error

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const view = searchParams.get('view') || 'week'

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Parametro date richiesto' },
        { status: 400 }
      )
    }

    const startDate = new Date(date)
    const endDate = new Date(startDate)

    if (view === 'week') {
      // Primo giorno della settimana (lunedì)
      const day = startDate.getDay()
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1)
      startDate.setDate(diff)
      startDate.setHours(0, 0, 0, 0)

      // Ultimo giorno della settimana (domenica)
      endDate.setDate(startDate.getDate() + 6)
      endDate.setHours(23, 59, 59, 999)
    } else if (view === 'month') {
      // Intero mese del giorno passato
      const month = startDate.getMonth()
      const year = startDate.getFullYear()
      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 0)
      startDate.setTime(monthStart.getTime())
      endDate.setTime(monthEnd.getTime())
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
    } else {
      // Giorno singolo
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId: auth.tenantId!,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        client: true,
        staff: true,
        service: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    return NextResponse.json({ success: true, data: appointments })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Errore interno' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/[tenant]/appointments
 * Crea nuovo appuntamento
 */
export async function POST(
  req: Request,
  { params }: { params: { tenant: string } }
) {
  try {
    const auth = await requireTenantAccess(params.tenant)
    if (auth.error) return auth.error

    const body = await req.json()
    const data = createAppointmentSchema.parse(body)

    // Verifica che servizio, staff e client esistano e appartengano al tenant
    const [service, staff, client] = await Promise.all([
      prisma.service.findFirst({
        where: { id: data.serviceId, tenantId: auth.tenantId! },
      }),
      prisma.staff.findFirst({
        where: { id: data.staffId, tenantId: auth.tenantId! },
      }),
      prisma.client.findFirst({
        where: { id: data.clientId, tenantId: auth.tenantId! },
      }),
    ])

    if (!service || !staff || !client) {
      return NextResponse.json(
        { success: false, error: 'Servizio, operatore o cliente non trovato' },
        { status: 404 }
      )
    }

    // Verifica che lo staff offra questo servizio
    const staffService = await prisma.staffService.findUnique({
      where: {
        staffId_serviceId: {
          staffId: data.staffId,
          serviceId: data.serviceId,
        },
      },
    })

    if (!staffService) {
      return NextResponse.json(
        { success: false, error: 'Operatore non offre questo servizio' },
        { status: 400 }
      )
    }

    const startTime = new Date(data.startTime)
    const endTime = addMinutes(startTime, service.duration)

    // Commento in italiano: verifica che l'appuntamento cada negli orari di lavoro dell'operatore
    const dayOfWeek = format(startTime, 'EEE').toLowerCase().slice(0, 3) // mon, tue, ...

    // Leggi orari staff con fallback a orari tenant
    const staffWorkingHours = staff.workingHours as Record<
      string,
      { start: string; end: string; break?: { start: string; end: string } } | null
    > | null

    const tenantRecord = await prisma.tenant.findUnique({
      where: { id: auth.tenantId! },
      select: { settings: true },
    })

    const tenantSettings = tenantRecord?.settings as Record<string, unknown> | null
    const tenantBusinessHours = (tenantSettings?.businessHours ?? {}) as Record<
      string,
      { start: string; end: string; break?: { start: string; end: string } } | null
    >

    const workingHoursForDay = staffWorkingHours?.[dayOfWeek] ?? tenantBusinessHours[dayOfWeek]

    if (!workingHoursForDay) {
      return NextResponse.json(
        { success: false, error: "L'operatore non lavora in questo giorno" },
        { status: 400 },
      )
    }

    // Verifica che l'appuntamento sia dentro gli orari
    const [wStartH, wStartM] = workingHoursForDay.start.split(':').map(Number)
    const [wEndH, wEndM] = workingHoursForDay.end.split(':').map(Number)
    const workStart = (wStartH ?? 0) * 60 + (wStartM ?? 0)
    const workEnd = (wEndH ?? 0) * 60 + (wEndM ?? 0)
    const aptStart = startTime.getHours() * 60 + startTime.getMinutes()
    const aptEnd = endTime.getHours() * 60 + endTime.getMinutes()

    if (aptStart < workStart || aptEnd > workEnd) {
      return NextResponse.json(
        { success: false, error: 'Appuntamento fuori dagli orari di lavoro' },
        { status: 400 },
      )
    }

    // Verifica conflitti usando la funzione dedicata
    const availability = await checkSlotAvailability(
      auth.tenantId!,
      data.staffId,
      startTime,
      endTime
    )

    if (!availability.available) {
      return NextResponse.json(
        { success: false, error: availability.conflict ?? 'Slot già occupato' },
        { status: 409 }
      )
    }

    const appointment = await prisma.appointment.create({
      data: {
        tenantId: auth.tenantId!,
        clientId: data.clientId,
        staffId: data.staffId,
        serviceId: data.serviceId,
        startTime,
        endTime,
        price: service.price,
        notes: data.notes,
        source: 'manual',
      },
      include: {
        client: true,
        staff: true,
        service: true,
      },
    })

    return NextResponse.json({ success: true, data: appointment })
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
