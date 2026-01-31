import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage, formatBookingReminderMessage } from '@/lib/whatsapp'
import { logger } from '@/lib/logger'
import { env } from '@/lib/env'

// Forza rendering dinamico (usa headers per autenticazione)
export const dynamic = 'force-dynamic'

// API route per inviare promemoria (da chiamare con cron job)
export async function GET(request: NextRequest) {
  try {
    // Verifica autorizzazione
    // Per Vercel: il cron job è automaticamente autorizzato
    // Per servizi esterni: usa CRON_SECRET nell'header Authorization
    const authHeader = request.headers.get('authorization')
    const isVercelCron = request.headers.get('x-vercel-cron') === '1'
    
    // Se non è Vercel Cron, verifica CRON_SECRET
    if (!isVercelCron) {
      if (!env.CRON_SECRET || !authHeader || authHeader !== `Bearer ${env.CRON_SECRET}`) {
        logger.warn('Tentativo accesso non autorizzato a /api/reminders')
        return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
      }
    }

    logger.info('🔔 Inizio processo invio promemoria')

    // Trova prenotazioni tra 50 minuti e 70 minuti da ora
    // (finestra più ampia per tollerare ritardi del cron)
    const now = new Date()
    const minTime = new Date(now.getTime() + 50 * 60 * 1000)
    const maxTime = new Date(now.getTime() + 70 * 60 * 1000)

    const bookings = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        reminderSent: false,
        date: {
          gte: minTime,
          lte: maxTime,
        },
      },
      include: {
        user: true,
      },
    })

    logger.info(`Trovate ${bookings.length} prenotazioni per promemoria`)

    let successCount = 0
    let errorCount = 0
    const results = []

    for (const booking of bookings) {
      if (!booking.user.phone) {
        logger.warn('Booking senza telefono', { 
          bookingId: booking.id,
          userId: booking.user.id 
        })
        continue
      }

      // Controlla se l'utente ha abilitato i promemoria
      if (!booking.user.bookingReminders) {
        logger.info('Promemoria disabilitato per utente', { 
          bookingId: booking.id,
          userId: booking.user.id 
        })
        continue
      }

      try {
        await sendWhatsAppMessage(
          booking.user.phone,
          formatBookingReminderMessage(
            booking.user.name,
            booking.date,
            booking.time
          )
        )

        // Marca come inviato
        await prisma.booking.update({
          where: { id: booking.id },
          data: { reminderSent: true },
        })

        successCount++
        results.push({ bookingId: booking.id, status: 'sent' })
        
        logger.info('Promemoria inviato', { 
          bookingId: booking.id,
          phone: booking.user.phone 
        })

      } catch (error) {
        errorCount++
        const errorMsg = error instanceof Error ? error.message : String(error)
        
        logger.error('Errore invio promemoria', {
          bookingId: booking.id,
          error: errorMsg
        })
        
        results.push({ 
          bookingId: booking.id, 
          status: 'error',
          error: errorMsg
        })
      }
    }

    logger.info('✅ Processo promemoria completato', {
      total: bookings.length,
      success: successCount,
      errors: errorCount
    })

    return NextResponse.json({
      processed: bookings.length,
      success: successCount,
      errors: errorCount,
      results,
      timestamp: new Date()
    })
    
  } catch (error) {
    logger.error('Errore critico nel processo promemoria', {
      error: error instanceof Error ? error.message : String(error)
    })
    
    return NextResponse.json(
      { error: 'Errore nel processo promemoria' },
      { status: 500 }
    )
  }
}
