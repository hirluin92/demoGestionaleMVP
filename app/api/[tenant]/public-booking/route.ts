import { NextResponse } from 'next/server'
import { z } from 'zod'
import { addMinutes } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { publicBookingSchema } from '@/lib/validators'
import { sendWhatsApp } from '@/lib/twilio'

// Commenti in italiano: API pubblica per prenotazione step-by-step

const paramsSchema = z.object({
  tenant: z.string().min(1),
})

export async function POST(
  req: Request,
  { params }: { params: { tenant: string } }
) {
  try {
    const { tenant } = paramsSchema.parse(params)
    const body = await req.json()
    const data = publicBookingSchema.parse(body)

    // Verifica tenant esistente
    const tenantRecord = await prisma.tenant.findUnique({
      where: { slug: tenant },
    })

    if (!tenantRecord) {
      return NextResponse.json(
        { success: false, error: 'Tenant non trovato' },
        { status: 404 }
      )
    }

    // Verifica che servizio e staff appartengano al tenant
    const [service, staff] = await Promise.all([
      prisma.service.findFirst({
        where: { id: data.serviceId, tenantId: tenantRecord.id, isActive: true },
      }),
      prisma.staff.findFirst({
        where: { id: data.staffId, tenantId: tenantRecord.id, isActive: true },
      }),
    ])

    if (!service || !staff) {
      return NextResponse.json(
        { success: false, error: 'Servizio o operatore non valido' },
        { status: 400 }
      )
    }

    const startTime = new Date(data.startTime)
    const endTime = addMinutes(startTime, service.duration)

    // Verifica conflitti slot lato server (sicurezza)
    const overlapping = await prisma.appointment.findFirst({
      where: {
        tenantId: tenantRecord.id,
        staffId: data.staffId,
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
        { success: false, error: 'Slot non più disponibile' },
        { status: 409 }
      )
    }

    // Trova o crea cliente per telefono all'interno del tenant
    const existingClient = await prisma.client.findFirst({
      where: {
        tenantId: tenantRecord.id,
        phone: data.clientPhone,
      },
    })

    const client =
      existingClient ??
      (await prisma.client.create({
        data: {
          tenantId: tenantRecord.id,
          name: data.clientName,
          phone: data.clientPhone,
          email: null,
          optInMarketing: data.optInMarketing,
          optInReminders: data.optInReminders,
        },
      }))

    const appointment = await prisma.appointment.create({
      data: {
        tenantId: tenantRecord.id,
        clientId: client.id,
        staffId: data.staffId,
        serviceId: data.serviceId,
        startTime,
        endTime,
        price: service.price,
        notes: null,
        source: 'online',
      },
      include: {
        client: true,
        staff: true,
        service: true,
      },
    })

    // Se il cliente ha acconsentito ai promemoria, invia un messaggio di conferma prenotazione
    if (client.optInReminders) {
      try {
        // Commento in italiano: sostituire TEMPLATE_SID_BOOKING con il SID reale del template approvato su WhatsApp
        await sendWhatsApp(
          tenantRecord.id,
          client.phone,
          'TEMPLATE_SID_BOOKING', // TODO: SID reale del template booking_confirmation
          {
            '1': client.name,
            '2': appointment.service.name,
            '3': formatItalianDateTime(appointment.startTime),
            '4': tenantRecord.name,
          },
          appointment.id,
          'CONFIRMATION',
        )
      } catch (whatsAppError) {
        // Non bloccare la prenotazione se il messaggio fallisce
        console.error('Errore invio WhatsApp di conferma:', whatsAppError)
      }
    }

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

// Commento in italiano: helper per formattare data/ora in modo leggibile per WhatsApp
function formatItalianDateTime(date: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}


