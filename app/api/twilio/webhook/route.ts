import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Commenti in italiano: webhook Twilio per risposte WhatsApp (SI/NO) ai promemoria

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const from = formData.get('From') as string | null
    const bodyRaw = (formData.get('Body') as string | null) ?? ''

    if (!from) {
      return NextResponse.json(
        { success: false, error: 'Payload non valido' },
        { status: 400 },
      )
    }

    const phone = from.replace('whatsapp:', '')
    const body = bodyRaw.toLowerCase().trim()

    // Recupera l'ultimo messaggio log per questo numero per derivare il tenantId
    const lastMessage = await prisma.messageLog.findFirst({
      where: {
      clientPhone: { endsWith: phone.slice(-10) },
        channel: 'WHATSAPP',
      },
      orderBy: { sentAt: 'desc' },
    })

    if (!lastMessage) {
      return NextResponse.json({ success: true, data: { status: 'ignored' } })
    }

    const tenantId = lastMessage.tenantId

    // Trova il client per questo tenant
    const client = await prisma.client.findFirst({
      where: {
        tenantId,
      phone: { endsWith: phone.slice(-10) },
      },
    })

    if (!client) {
      return NextResponse.json({ success: true, data: { status: 'ignored' } })
    }

    const appointment = await prisma.appointment.findFirst({
      where: {
        tenantId,
        clientId: client.id,
        status: 'SCHEDULED',
        startTime: { gte: new Date() },
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    if (!appointment) {
      return NextResponse.json({ success: true, data: { status: 'ignored' } })
    }

    const positiveWords = ['si', 'sì', 'ok', 'confermo', 'va bene', 'certo', 'assolutamente', 'confermato']
    const negativeWords = ['no', 'disdico', 'cancello', 'non posso', 'annulla', 'non vengo']

    const isConfirm = positiveWords.some(w => body.includes(w))
    const isCancel = negativeWords.some(w => body.includes(w))

    if (isConfirm) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        },
      })
      return NextResponse.json({ success: true, data: { status: 'confirmed' } })
    }

    if (isCancel) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      })
      return NextResponse.json({ success: true, data: { status: 'cancelled' } })
    }

    return NextResponse.json({ success: true, data: { status: 'ignored' } })
  } catch (error) {
    console.error('Twilio webhook error:', error)
    return NextResponse.json(
      { success: false, error: 'Errore interno' },
      { status: 500 },
    )
  }
}

