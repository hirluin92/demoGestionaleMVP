import { NextRequest, NextResponse } from 'next/server'
import { getAvailableSlots } from '@/lib/google-calendar'
import { logger } from '@/lib/logger'

// Forza rendering dinamico (usa request.url per query params)
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json(
        { error: 'Data richiesta' },
        { status: 400 }
      )
    }

    const selectedDate = new Date(date)
    logger.debug('Recupero slot disponibili', { date: selectedDate.toISOString() })
    
    const slots = await getAvailableSlots(selectedDate)
    
    logger.debug('Slot disponibili trovati', { 
      date: selectedDate.toISOString(), 
      count: slots.length,
      slots: slots.slice(0, 5) // Log primi 5 per debug
    })

    return NextResponse.json({ slots })
  } catch (error) {
    logger.error('Errore recupero slot disponibili', {
      error: error instanceof Error ? error.message : String(error)
    })
    
    // Anche se c'è un errore, prova a restituire slot di base (solo database)
    // per non bloccare completamente l'utente
    try {
      const { prisma } = await import('@/lib/prisma')
      const { searchParams } = new URL(request.url)
      const date = searchParams.get('date')
      
      if (date) {
        const selectedDate = new Date(date)
        const startOfDay = new Date(selectedDate)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(selectedDate)
        endOfDay.setHours(23, 59, 59, 999)
        
        const dbBookings = await prisma.booking.findMany({
          where: {
            status: 'CONFIRMED',
            date: { gte: startOfDay, lte: endOfDay },
          },
          select: { time: true },
        })
        
        const allSlots: string[] = []
        for (let hour = 8; hour < 20; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            allSlots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`)
          }
        }
        
        const occupied = dbBookings.map(b => b.time)
        let available = allSlots.filter(slot => !occupied.includes(slot))
        
        // Se la data è oggi, filtra anche gli orari passati
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
        
        if (selectedDateOnly.getTime() === today.getTime()) {
          const currentHour = now.getHours()
          const currentMinute = now.getMinutes()
          
          available = available.filter(slot => {
            const [slotHour, slotMinute] = slot.split(':').map(Number)
            
            if (slotHour < currentHour) {
              return false
            }
            
            if (slotHour === currentHour && slotMinute <= currentMinute) {
              return false
            }
            
            return true
          })
        }
        
        logger.warn('Restituiti slot solo da database (Google Calendar fallito)', {
          count: available.length
        })
        
        return NextResponse.json({ slots: available })
      }
    } catch (fallbackError) {
      logger.error('Errore anche nel fallback', {
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
      })
    }
    
    return NextResponse.json(
      { error: 'Errore nel recupero degli slot disponibili' },
      { status: 500 }
    )
  }
}
