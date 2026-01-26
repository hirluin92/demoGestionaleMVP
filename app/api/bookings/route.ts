import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createCalendarEvent } from '@/lib/google-calendar'
import { sendWhatsAppMessage, formatBookingConfirmationMessage } from '@/lib/whatsapp'
import { bookingRateLimiter } from '@/lib/rate-limit'
import { isTwilioError } from '@/lib/errors'
import { handleApiError } from '@/lib/api-response'
import { z } from 'zod'

// Forza rendering dinamico (usa headers per autenticazione)
export const dynamic = 'force-dynamic'

const bookingSchema = z.object({
  date: z.string()
    .refine((dateStr) => {
      const bookingDate = new Date(dateStr)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return bookingDate >= today && !isNaN(bookingDate.getTime())
    }, 'Data non valida o nel passato'),
    
  time: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato orario non valido')
    .refine((time) => {
      const [hours] = time.split(':').map(Number)
      return hours >= 8 && hours < 20
    }, 'Orario non valido (8:00-20:00)'),
    
  packageId: z.string().min(1, 'Package ID richiesto'),
})

// GET - Lista prenotazioni utente
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const bookings = await prisma.booking.findMany({
      where: {
        userId: session.user.id,
        status: { not: 'CANCELLED' },
      },
      include: {
        package: true,
      },
      orderBy: {
        date: 'asc',
      },
    })

    return NextResponse.json(bookings)
  } catch (error) {
    console.error('Errore recupero prenotazioni:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero delle prenotazioni' },
      { status: 500 }
    )
  }
}

// POST - Crea nuova prenotazione
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResult = await bookingRateLimiter.check(session.user.id)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Troppe richieste. Riprova tra qualche minuto.',
          retryAfter: rateLimitResult.reset
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toISOString(),
          }
        }
      )
    }

    // Valida input
    const body = await request.json()
    const validatedData = bookingSchema.parse(body)
    const { date, time, packageId } = validatedData

    // STEP 1: Verifica preliminare pacchetto (fuori transazione) - serve per durata
    const packageData = await prisma.package.findFirst({
      where: {
        id: packageId,
        userId: session.user.id,
        isActive: true,
      },
    })

    if (!packageData) {
      return NextResponse.json(
        { error: 'Pacchetto non trovato o non attivo' },
        { status: 404 }
      )
    }

    // Prepara date usando la durata del package
    const bookingDate = new Date(date)
    const [hours, minutes] = time.split(':').map(Number)
    bookingDate.setHours(hours, minutes, 0, 0)
    const endDate = new Date(bookingDate)
    endDate.setMinutes(endDate.getMinutes() + (packageData.durationMinutes || 60)) // Usa durata del package, default 60 min

    const remainingSessions = packageData.totalSessions - packageData.usedSessions
    if (remainingSessions <= 0) {
      return NextResponse.json(
        { error: 'Nessuna sessione disponibile' },
        { status: 400 }
      )
    }

    // STEP 2: Crea Google Calendar event PRIMA della transazione (opzionale)
    let googleEventId: string | null = null
    try {
      const eventId = await createCalendarEvent(
        `Sessione ${session.user.name}`,
        `Prenotazione Hugemass - Pacchetto: ${packageData.name}`,
        bookingDate,
        endDate
      )
      googleEventId = eventId
      console.log('✅ Evento Google Calendar creato:', googleEventId)
    } catch (error) {
      console.error('⚠️ Errore creazione evento Google Calendar (continua senza):', error)
      // Continua senza Google Calendar - la prenotazione viene comunque creata
      // L'utente può sincronizzare manualmente dopo
    }

    // STEP 3: Transazione atomica per DB (booking + package update)
    const booking = await prisma.$transaction(async (tx) => {
      // Verifica slot non duplicato (dentro transazione per lock)
      const existingBooking = await tx.booking.findFirst({
        where: {
          date: bookingDate,
          time: time,
          status: 'CONFIRMED',
        },
      })

      if (existingBooking) {
        throw new Error('Questo orario è già stato prenotato')
      }

      // Ricontrolla sessioni disponibili (dentro transazione per evitare race)
      const pkg = await tx.package.findUnique({
        where: { id: packageId },
        select: { totalSessions: true, usedSessions: true, isActive: true }
      })

      if (!pkg || !pkg.isActive) {
        throw new Error('Pacchetto non più valido')
      }

      if ((pkg.totalSessions - pkg.usedSessions) <= 0) {
        throw new Error('Sessioni terminate durante l\'elaborazione')
      }

      // Crea booking
      const newBooking = await tx.booking.create({
        data: {
          userId: session.user.id,
          packageId,
          date: bookingDate,
          time,
          googleEventId,
          status: 'CONFIRMED',
        },
      })

      // Scala sessione
      await tx.package.update({
        where: { id: packageId },
        data: {
          usedSessions: {
            increment: 1,
          },
        },
      })

      return newBooking
    })

    // STEP 4: WhatsApp (fuori transazione - non critico)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (user?.phone) {
      try {
        await sendWhatsAppMessage(
          user.phone,
          formatBookingConfirmationMessage(user.name, bookingDate, time)
        )
        console.log(`✅ WhatsApp inviato con successo a ${user.name} (${user.phone})`)
      } catch (error) {
        if (isTwilioError(error)) {
          console.error(`⚠️ Errore Twilio invio WhatsApp a ${user.name} (${user.phone}):`, error.message)
          if (error.code === 21608) {
            console.error(`   🔴 NUMERO NON AUTORIZZATO su Twilio Sandbox!`)
            console.error(`   Soluzione: Aggiungi ${user.phone} alla lista numeri autorizzati su Twilio Console`)
          } else if (error.code === 21211) {
            console.error(`   🔴 NUMERO NON VALIDO per Twilio!`)
          }
        } else if (error instanceof Error) {
          console.error(`⚠️ Errore generico invio WhatsApp a ${user.name} (${user.phone}):`, error.message)
        } else {
          console.error(`⚠️ Errore sconosciuto invio WhatsApp a ${user.name} (${user.phone}):`, String(error))
        }
      }
    } else {
      console.warn(`⚠️ Utente ${user?.name || session.user.id} non ha un numero di telefono configurato`)
    }

    return NextResponse.json(booking, { status: 201 })
    
  } catch (error) {
    return handleApiError(error)
  }
}
