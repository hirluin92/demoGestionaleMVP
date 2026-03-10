import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsApp } from '@/lib/twilio'
import { env } from '@/lib/env'

// Commenti in italiano: cron job per inviare promemoria WhatsApp 24h prima degli appuntamenti

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const isVercelCron = req.headers.get('x-vercel-cron') === '1'

    if (!isVercelCron) {
      if (!env.CRON_SECRET || !authHeader || authHeader !== `Bearer ${env.CRON_SECRET}`) {
        return NextResponse.json(
          { success: false, error: 'Non autorizzato' },
          { status: 401 },
        )
      }
    }

    const now = new Date()
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const appointments = await prisma.appointment.findMany({
      where: {
        status: 'SCHEDULED',
        startTime: {
          gte: now,
          lte: in24h,
        },
        reminderSentAt: null,
        tenant: {
          status: {
            in: ['TRIAL', 'ACTIVE'],
          },
        },
        client: {
          optInReminders: true,
        },
      },
      include: {
        client: true,
        staff: true,
        service: true,
        tenant: true,
      },
    })

    let sent = 0
    const errors: string[] = []

    for (const apt of appointments) {
      const result = await sendWhatsApp(
        apt.tenantId,
        apt.client.phone,
        'TEMPLATE_SID_REMINDER',
        {
          '1': apt.client.name,
          '2': apt.startTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
          '3': apt.tenant.name,
          '4': apt.staff.name,
        },
        apt.id,
        'REMINDER',
      )

      if (result.success) {
        await prisma.appointment.update({
          where: { id: apt.id },
          data: { reminderSentAt: now },
        })
        sent += 1
      } else {
        errors.push(`Errore invio a ${apt.client.phone}`)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        sent,
        errors,
        total: appointments.length,
      },
    })
  } catch (error) {
    console.error('Cron reminders error:', error)
    return NextResponse.json(
      { success: false, error: 'Errore interno' },
      { status: 500 },
    )
  }
}

